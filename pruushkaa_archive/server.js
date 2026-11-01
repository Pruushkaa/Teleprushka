/**
 * PRUUSHKAA_ARCHIVE — локальный бэкенд и терминал управления контентом.
 * Раздаёт сайт прямо из корня репозитория и предоставляет панель /admin
 * с автоматическим коммитом и публикацией в GitHub Pages.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const child_process = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;
const SITE_DIR = path.join(__dirname, '..');
const DB_FILE = path.join(SITE_DIR, 'database.json');
const INDEX_FILE = path.join(SITE_DIR, 'index.html');
const ADMIN_DIR = path.join(SITE_DIR, 'local_admin');
const PHOTOS_DIR = path.join(SITE_DIR, 'public', 'photos');
const TRACKS_DIR = path.join(SITE_DIR, 'public', 'tracks');

// Служебные файлы репозитория, которые не должны раздаваться как публичная статика основного сайта
const PRIVATE_PATHS = /^\/(pruushkaa_archive|local_admin|scripts|node_modules|package(-lock)?\.json)(\/|$)/i;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// --- GIT & SYSTEM HELPERS ---
function getGitPath() {
    const minGit = path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WinGet', 'Packages', 'Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe', 'cmd', 'git.exe');
    if (fs.existsSync(minGit)) return minGit;
    return 'git';
}

function runGit(args) {
    const git = getGitPath();
    return child_process.execFileSync(git, args, { cwd: SITE_DIR, encoding: 'utf8', stdio: 'pipe' });
}

function runSyncTracks() {
    try {
        const out = child_process.execFileSync(process.execPath, [path.join(SITE_DIR, 'scripts', 'sync-tracks.mjs')], { cwd: SITE_DIR, encoding: 'utf8', stdio: 'pipe' });
        return { success: true, log: out };
    } catch (e) {
        return { success: false, error: e.message, stderr: e.stderr?.toString() };
    }
}

const str = (value, fallback) => (value !== undefined && value !== null ? String(value).trim() : fallback);

// Приводит любые данные к полной схеме БД
function normalizeDB(data = {}) {
    const discord = data.discord || {};
    const discordId = discord.discordId !== undefined ? String(discord.discordId) : (discord.id ? String(discord.id) : '');
    const id = discord.id !== undefined ? String(discord.id) : (discord.discordId ? String(discord.discordId) : '');
    return {
        photos: Array.isArray(data.photos) ? data.photos : [],
        wiki: Array.isArray(data.wiki) ? data.wiki : (Array.isArray(data.articles) ? data.articles : []),
        tracks: Array.isArray(data.tracks) ? data.tracks : [],
        discord: {
            status: discord.status || 'online',
            text: discord.text || 'В сети',
            discordId,
            id
        },
        adminPass: str(data.adminPass, 'admin'),
        lastFmApiKey: str(data.lastFmApiKey, ''),
        lastFmUser: str(data.lastFmUser, 'Pruushkaa')
    };
}

function readDB() {
    let parsed = {};
    try {
        if (fs.existsSync(DB_FILE)) {
            parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Ошибка чтения database.json:', e);
    }
    return normalizeDB(parsed);
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(normalizeDB(data), null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Ошибка записи database.json:', e);
        return false;
    }
}

// Инициализация базы данных
try {
    writeDB(readDB());
} catch (e) {
    console.error('Ошибка начальной инициализации БД:', e);
}

// --- LOCAL ADMIN DASHBOARD ROUTES ---
app.use('/admin', express.static(ADMIN_DIR));
app.get(/^\/admin(\/.*)?$/, (req, res) => {
    const adminIndex = path.join(ADMIN_DIR, 'index.html');
    if (fs.existsSync(adminIndex)) {
        res.sendFile(adminIndex);
    } else {
        res.status(404).send('Local Admin Panel not found at ' + adminIndex);
    }
});

// --- ADMIN API ENDPOINTS ---
app.get('/api/admin/info', (req, res) => {
    let gitInfo = { clean: true, statusText: '', branch: 'main', lastCommit: '' };
    try {
        const statusOut = runGit(['status', '--porcelain']);
        let branchOut = 'main';
        try { branchOut = runGit(['branch', '--show-current']).trim(); } catch (e) {}
        let logOut = '';
        try { logOut = runGit(['log', '-1', '--oneline']).trim(); } catch (e) {}
        gitInfo = {
            clean: !statusOut.trim(),
            statusText: statusOut,
            branch: branchOut || 'main',
            lastCommit: logOut
        };
    } catch (err) {
        gitInfo = { clean: true, statusText: '', branch: 'main', lastCommit: '', error: err.message };
    }

    const manifestPath = path.join(TRACKS_DIR, 'manifest.json');
    const tracksList = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];

    res.json({
        db: readDB(),
        tracks: tracksList,
        git: gitInfo
    });
});

// Добавление / обновление фото
app.post('/api/admin/photos/save', (req, res) => {
    try {
        const { id, title, category, date, desc, fileBase64, filename, fileUrl, saveAsFile } = req.body;
        const currentDB = readDB();
        let finalSrc = fileUrl || '';

        if (fileBase64) {
            if (saveAsFile !== false) {
                if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
                const extMatch = fileBase64.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
                const ext = extMatch ? (extMatch[1] === 'jpeg' ? 'jpg' : extMatch[1]) : 'jpg';
                const cleanBase = (filename || 'photo').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\u0400-\u04FF-]/g, '_');
                const safeName = `${cleanBase}_${Date.now()}.${ext}`;
                const filePath = path.join(PHOTOS_DIR, safeName);
                const base64Data = fileBase64.replace(/^data:image\/\w+;base64,/, '');
                fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                finalSrc = `public/photos/${safeName}`;
            } else {
                finalSrc = fileBase64;
            }
        }

        const photoId = id || `IMG-${Date.now()}`;
        const newPhoto = {
            id: photoId,
            title: (title || 'БЕЗ НАЗВАНИЯ').trim(),
            category: (category || 'ИРЛ / АРХИВ').trim(),
            date: (date || new Date().toISOString().slice(0, 7).replace('-', '.')).trim(),
            src: finalSrc,
            url: finalSrc,
            fallback: 'https://placehold.co/600x600/FF5722/000000?text=PHOTO+ARCHIVE',
            desc: (desc || 'Добавлено через панель управления.').trim()
        };

        const existingIdx = currentDB.photos.findIndex(p => p.id === photoId);
        if (existingIdx >= 0) {
            currentDB.photos[existingIdx] = { ...currentDB.photos[existingIdx], ...newPhoto };
        } else {
            currentDB.photos.unshift(newPhoto);
        }

        writeDB(currentDB);
        res.json({ success: true, photo: newPhoto, photos: currentDB.photos });
    } catch (err) {
        console.error('Error saving photo:', err);
        res.status(500).json({ error: err.message });
    }
});

// Удаление фото
app.post('/api/admin/photos/delete', (req, res) => {
    try {
        const { id } = req.body;
        const currentDB = readDB();
        const target = currentDB.photos.find(p => p.id === id);
        if (target && target.src && target.src.startsWith('public/photos/')) {
            const filePath = path.join(SITE_DIR, target.src);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) {}
            }
        }
        currentDB.photos = currentDB.photos.filter(p => p.id !== id);
        writeDB(currentDB);
        res.json({ success: true, photos: currentDB.photos });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Добавление / обновление статьи Вики
app.post('/api/admin/wiki/save', (req, res) => {
    try {
        const { id, title, category, author, updated, tags, content } = req.body;
        const currentDB = readDB();
        const articleId = id || `SRP-${Date.now()}`;
        const safeTags = Array.isArray(tags)
            ? tags
            : (typeof tags === 'string' ? tags.split(',').map(s => s.trim()).filter(Boolean) : ['СРП', 'архив']);
        const article = {
            id: articleId,
            title: (title || 'НОВАЯ СТАТЬЯ').trim(),
            category: (category || 'ОСНОВНОЕ').trim(),
            author: (author || 'pruushkaa').trim(),
            updated: (updated || new Date().toISOString().slice(0, 7).replace('-', '.')).trim(),
            tags: safeTags,
            content: content || ''
        };

        const existingIdx = currentDB.wiki.findIndex(w => w.id === articleId);
        if (existingIdx >= 0) {
            currentDB.wiki[existingIdx] = article;
        } else {
            currentDB.wiki.unshift(article);
        }

        writeDB(currentDB);
        res.json({ success: true, article, wiki: currentDB.wiki });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление статьи Вики
app.post('/api/admin/wiki/delete', (req, res) => {
    try {
        const { id } = req.body;
        const currentDB = readDB();
        currentDB.wiki = currentDB.wiki.filter(w => w.id !== id);
        writeDB(currentDB);
        res.json({ success: true, wiki: currentDB.wiki });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Загрузка GPX-трека
app.post('/api/admin/tracks/upload', (req, res) => {
    try {
        const { filename, gpxContent } = req.body;
        if (!filename || !gpxContent) return res.status(400).json({ error: 'Имя файла или GPX пустые' });
        if (!fs.existsSync(TRACKS_DIR)) fs.mkdirSync(TRACKS_DIR, { recursive: true });
        const safeName = filename.endsWith('.gpx') ? filename : `${filename}.gpx`;
        const filePath = path.join(TRACKS_DIR, safeName);
        fs.writeFileSync(filePath, gpxContent, 'utf8');

        // Авто-пересчет манифеста и телеметрии
        const syncRes = runSyncTracks();
        const manifestPath = path.join(TRACKS_DIR, 'manifest.json');
        const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
        res.json({ success: true, tracks: manifest, syncLog: syncRes.log, error: syncRes.error });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Удаление трека
app.post('/api/admin/tracks/delete', (req, res) => {
    try {
        const { filename } = req.body;
        const clean = path.basename(filename);
        const filePath = path.join(TRACKS_DIR, clean);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        runSyncTracks();
        const manifestPath = path.join(TRACKS_DIR, 'manifest.json');
        const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
        res.json({ success: true, tracks: manifest });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Пересинхронизация манифеста треков
app.post('/api/admin/tracks/resync', (req, res) => {
    const syncRes = runSyncTracks();
    const manifestPath = path.join(TRACKS_DIR, 'manifest.json');
    const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
    res.json({ success: syncRes.success, tracks: manifest, log: syncRes.log, error: syncRes.error });
});

// Сохранение общих настроек
app.post('/api/admin/settings/save', (req, res) => {
    try {
        const { adminPass, lastFmUser, lastFmApiKey, discordStatus, discordText, discordId } = req.body;
        const currentDB = readDB();
        if (adminPass) currentDB.adminPass = adminPass.trim();
        if (lastFmUser !== undefined) currentDB.lastFmUser = lastFmUser.trim();
        if (lastFmApiKey !== undefined) currentDB.lastFmApiKey = lastFmApiKey.trim();
        if (discordStatus !== undefined) currentDB.discord.status = discordStatus;
        if (discordText !== undefined) currentDB.discord.text = discordText;
        if (discordId !== undefined) {
            currentDB.discord.discordId = String(discordId).trim();
            currentDB.discord.id = String(discordId).trim();
        }
        writeDB(currentDB);
        res.json({ success: true, data: currentDB });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Git: статус репозитория
app.get('/api/admin/git/status', (req, res) => {
    try {
        const statusOut = runGit(['status', '--porcelain']);
        let branchOut = 'main';
        try { branchOut = runGit(['branch', '--show-current']).trim(); } catch (e) {}
        let logOut = '';
        try { logOut = runGit(['log', '-1', '--oneline']).trim(); } catch (e) {}
        res.json({
            success: true,
            clean: !statusOut.trim(),
            statusText: statusOut,
            branch: branchOut || 'main',
            lastCommit: logOut
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Git: Публикация в один клик (add + commit + push)
app.post('/api/admin/git/publish', (req, res) => {
    try {
        const statusOut = runGit(['status', '--porcelain']);
        if (!statusOut.trim()) {
            return res.json({ success: true, clean: true, log: 'Рабочая копия чистая. Нет новых изменений для отправки.' });
        }

        const addOut = runGit(['add', '-A']);
        const customMsg = (req.body.message || '').trim();
        const nowStr = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const commitMsg = customMsg || `ARCHIVE_OS auto-publish: ${nowStr}`;

        const commitOut = runGit(['commit', '-m', commitMsg]);
        const pushOut = runGit(['push', 'origin', 'main']);

        res.json({
            success: true,
            log: [commitOut, pushOut].filter(Boolean).join('\n')
        });
    } catch (e) {
        console.error('Git publish error:', e);
        res.status(500).json({
            success: false,
            error: e.message,
            stderr: e.stderr?.toString()
        });
    }
});

// --- СТАНДАРТНЫЕ МАРШРУТЫ КЛИЕНТСКОГО САЙТА ---
app.get(['/api/data', '/database.json'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(readDB());
});

app.post('/api/data', (req, res) => {
    const authHeader = req.headers['x-admin-password'] || req.body?.authPass || req.body?.password;
    const currentDB = readDB();
    const currentPass = currentDB.adminPass || 'admin';

    if (!authHeader || String(authHeader).trim() !== String(currentPass).trim()) {
        console.warn(`[AUTH REJECTED] Передан: "${authHeader}", текущий: "${currentPass}"`);
        return res.status(403).json({ error: 'Неверный пароль администратора' });
    }

    const newData = req.body;
    if (!newData) {
        return res.status(400).json({ error: 'Пустые данные' });
    }

    const updatedDB = {
        photos: Array.isArray(newData.photos) ? newData.photos : currentDB.photos,
        wiki: Array.isArray(newData.wiki) ? newData.wiki : (Array.isArray(newData.articles) ? newData.articles : currentDB.wiki),
        tracks: Array.isArray(newData.tracks) ? newData.tracks : currentDB.tracks,
        discord: {
            status: newData.discord?.status || currentDB.discord.status,
            text: newData.discord?.text || currentDB.discord.text,
            discordId: newData.discord?.discordId !== undefined ? String(newData.discord.discordId) : (newData.discord?.id ? String(newData.discord.id) : currentDB.discord.discordId),
            id: newData.discord?.id !== undefined ? String(newData.discord.id) : (newData.discord?.discordId ? String(newData.discord.discordId) : currentDB.discord.id)
        },
        adminPass: newData.adminPass && String(newData.adminPass).trim() ? String(newData.adminPass).trim() : currentPass,
        lastFmApiKey: newData.lastFmApiKey !== undefined ? String(newData.lastFmApiKey).trim() : currentDB.lastFmApiKey,
        lastFmUser: newData.lastFmUser !== undefined ? String(newData.lastFmUser).trim() : currentDB.lastFmUser
    };

    if (writeDB(updatedDB)) {
        console.log(`[DB SYNC SUCCESS] База обновлена. Фото: ${updatedDB.photos.length}, Статей: ${updatedDB.wiki.length}, Треков: ${updatedDB.tracks.length}`);
        return res.json({ success: true, message: 'Данные успешно сохранены в database.json', data: updatedDB });
    } else {
        return res.status(500).json({ error: 'Не удалось записать database.json' });
    }
});

app.get(['/music', '/music.html'], (req, res) => {
    res.sendFile(path.join(SITE_DIR, 'music.html'));
});

// Защита служебных директорий
app.use((req, res, next) => (PRIVATE_PATHS.test(req.path) ? res.status(404).end() : next()));

// Статические файлы из корня сайта (с отдачей public/photos и прочих ассетов)
app.use(express.static(SITE_DIR, { dotfiles: 'ignore' }));

// SPA fallback для всех остальных страниц
app.use((req, res) => {
    if (fs.existsSync(INDEX_FILE)) {
        res.sendFile(INDEX_FILE);
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(PORT, () => {
    console.log(`[PRUUSHKAA // ARCHIVE_OS] Сервер запущен:`);
    console.log(`  Сайт портфолио: http://localhost:${PORT}`);
    console.log(`  Панель управления: http://localhost:${PORT}/admin`);
    console.log(`  База данных: ${DB_FILE}`);

    if (process.argv.includes('--open-admin')) {
        try {
            child_process.exec(`start http://localhost:${PORT}/admin`);
        } catch (e) {}
    }
});
