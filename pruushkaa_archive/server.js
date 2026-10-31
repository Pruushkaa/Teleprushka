const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'database.json');
const PUBLIC_DB = path.join(__dirname, 'public', 'database.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

function readDB() {
    let parsed = {};
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            parsed = JSON.parse(data);
        } else if (fs.existsSync(PUBLIC_DB)) {
            const data = fs.readFileSync(PUBLIC_DB, 'utf8');
            parsed = JSON.parse(data);
        }
    } catch (e) {
        console.error('Ошибка чтения database.json:', e);
    }
    return {
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
        wiki: Array.isArray(parsed.wiki) ? parsed.wiki : (Array.isArray(parsed.articles) ? parsed.articles : []),
        discord: {
            status: parsed.discord?.status || 'online',
            text: parsed.discord?.text || 'В сети',
            discordId: parsed.discord?.discordId !== undefined ? String(parsed.discord.discordId) : (parsed.discord?.id ? String(parsed.discord.id) : ''),
            id: parsed.discord?.id !== undefined ? String(parsed.discord.id) : (parsed.discord?.discordId ? String(parsed.discord.discordId) : '')
        },
        adminPass: parsed.adminPass !== undefined && parsed.adminPass !== null ? String(parsed.adminPass).trim() : 'admin',
        lastFmApiKey: parsed.lastFmApiKey !== undefined && parsed.lastFmApiKey !== null ? String(parsed.lastFmApiKey).trim() : '',
        lastFmUser: parsed.lastFmUser !== undefined && parsed.lastFmUser !== null ? String(parsed.lastFmUser).trim() : 'Pruushkaa'
    };
}

function writeDB(data) {
    try {
        const fullDB = {
            photos: Array.isArray(data.photos) ? data.photos : [],
            wiki: Array.isArray(data.wiki) ? data.wiki : (Array.isArray(data.articles) ? data.articles : []),
            discord: {
                status: data.discord?.status || 'online',
                text: data.discord?.text || 'В сети',
                discordId: data.discord?.discordId !== undefined ? String(data.discord.discordId) : (data.discord?.id ? String(data.discord.id) : ''),
                id: data.discord?.id !== undefined ? String(data.discord.id) : (data.discord?.discordId ? String(data.discord.discordId) : '')
            },
            adminPass: data.adminPass !== undefined && data.adminPass !== null ? String(data.adminPass).trim() : 'admin',
            lastFmApiKey: data.lastFmApiKey !== undefined && data.lastFmApiKey !== null ? String(data.lastFmApiKey).trim() : '',
            lastFmUser: data.lastFmUser !== undefined && data.lastFmUser !== null ? String(data.lastFmUser).trim() : 'Pruushkaa'
        };
        const jsonStr = JSON.stringify(fullDB, null, 2);
        fs.writeFileSync(DB_FILE, jsonStr, 'utf8');
        try {
            const publicDir = path.join(__dirname, 'public');
            if (!fs.existsSync(publicDir)) {
                fs.mkdirSync(publicDir, { recursive: true });
            }
            fs.writeFileSync(PUBLIC_DB, jsonStr, 'utf8');
        } catch (err) {
            console.error('Не удалось записать публичную копию DB:', err);
        }
        return true;
    } catch (e) {
        console.error('Ошибка записи database.json:', e);
        return false;
    }
}

// Убеждаемся, что база содержит все поля
try {
    const initData = readDB();
    writeDB(initData);
} catch (e) {
    console.error('Ошибка начальной инициализации БД:', e);
}

app.get(['/api/data', '/database.json'], (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    const db = readDB();
    res.json(db);
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

    const newDiscord = newData.discord || {};
    const dId = newDiscord.discordId !== undefined ? newDiscord.discordId : (newDiscord.id !== undefined ? newDiscord.id : currentDB.discord.discordId);

    const merged = {
        photos: Array.isArray(newData.photos) ? newData.photos : currentDB.photos,
        wiki: Array.isArray(newData.wiki) ? newData.wiki : (Array.isArray(newData.articles) ? newData.articles : currentDB.wiki),
        discord: {
            status: newDiscord.status || currentDB.discord.status || 'online',
            text: newDiscord.text !== undefined ? newDiscord.text : (newData.discordStatus || currentDB.discord.text || 'В сети'),
            discordId: String(dId || '').trim(),
            id: String(dId || '').trim()
        },
        adminPass: newData.adminPass && String(newData.adminPass).trim() ? String(newData.adminPass).trim() : currentPass,
        lastFmApiKey: newData.lastFmApiKey !== undefined ? String(newData.lastFmApiKey).trim() : currentDB.lastFmApiKey,
        lastFmUser: newData.lastFmUser !== undefined && String(newData.lastFmUser).trim() ? String(newData.lastFmUser).trim() : currentDB.lastFmUser
    };

    const success = writeDB(merged);
    if (success) {
        console.log('[DB SAVED] База данных успешно обновлена на сервере');
        res.json({ success: true, message: 'Сохранено на сервере', data: merged });
    } else {
        res.status(500).json({ error: 'Ошибка записи на диск сервера' });
    }
});

app.use((req, res) => {
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).send('index.html не найден в папке public');
    }
});

app.listen(PORT, () => {
    console.log('PRUUSHKAA_ARCHIVE Server v3.1 running on port ' + PORT);
});
