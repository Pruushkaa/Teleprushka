/**
 * PRUUSHKAA_ARCHIVE — локальный бэкенд.
 * Раздаёт сайт прямо из корня репозитория (без копии в pruushkaa_archive/public)
 * и хранит данные в корневом database.json — том же файле, что публикуется на GitHub Pages.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const SITE_DIR = path.join(__dirname, '..');
const DB_FILE = path.join(SITE_DIR, 'database.json');
const INDEX_FILE = path.join(SITE_DIR, 'index.html');

// Служебные файлы репозитория, которые не должны раздаваться как статика
const PRIVATE_PATHS = /^\/(pruushkaa_archive|scripts|node_modules|package(-lock)?\.json)(\/|$)/i;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => (PRIVATE_PATHS.test(req.path) ? res.status(404).end() : next()));
app.use(express.static(SITE_DIR, { dotfiles: 'ignore' }));

app.get(['/music', '/music.html'], (req, res) => {
    res.sendFile(path.join(SITE_DIR, 'music.html'));
});

const str = (value, fallback) => (value !== undefined && value !== null ? String(value).trim() : fallback);

// Приводит любые данные к полной схеме БД (используется и при чтении, и при записи)
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

// Убеждаемся, что база содержит все поля
try {
    writeDB(readDB());
} catch (e) {
    console.error('Ошибка начальной инициализации БД:', e);
}

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

// SPA fallback для всех остальных страниц
app.use((req, res) => {
    if (fs.existsSync(INDEX_FILE)) {
        res.sendFile(INDEX_FILE);
    } else {
        res.status(404).send('Not Found');
    }
});

app.listen(PORT, () => {
    console.log(`[PRUUSHKAA // ARCHIVE_OS] Сервер запущен на http://localhost:${PORT}`);
    console.log(`  Раздача сайта из корня: ${SITE_DIR}`);
    console.log(`  База данных: ${DB_FILE}`);
});
