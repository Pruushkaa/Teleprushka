/**
 * PRUUSHKAA // ARCHIVE BUILD & VALIDATION ENGINE
 * Проверка перед деплоем: манифест и GPX, страницы, общие ассеты, данные, OpenGraph и синтаксис JSX.
 */
import fs from 'fs';
import path from 'path';
import { rootDir, TRACKS_MANIFEST, DATA_DIR, PAGES, rel, validatePageJsx } from './lib/common.mjs';

const fail = (msg) => {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
};
const requireFile = (file) => {
    if (!fs.existsSync(file)) fail(`${rel(file)} does not exist!`);
    return file;
};

console.log('--- PRUUSHKAA ARCHIVE BUILD & VALIDATION ---');

// 1. Манифест маршрутов и GPX-файлы
const tracks = JSON.parse(fs.readFileSync(requireFile(TRACKS_MANIFEST), 'utf8'));
console.log(`[VALIDATION] ${rel(TRACKS_MANIFEST)} OK (${tracks.length} tracks registered)`);
for (const t of tracks) {
    if (!t.file) {
        console.log(`  ✔ Validated inline/custom route: ${t.title}`);
    } else if (!fs.existsSync(path.join(rootDir, t.file))) {
        console.warn(`[WARN] Track file not found at ${t.file}`);
    } else {
        console.log(`  ✔ Validated route: ${t.title} (${t.file})`);
    }
}

// 2. Страницы и общие ассеты
const pageContent = {};
for (const page of PAGES) {
    pageContent[page] = fs.readFileSync(requireFile(path.join(rootDir, page)), 'utf8');
    console.log(`[VALIDATION] ${page} exists.`);
}
for (const asset of [
    'assets/css/base.css',
    'assets/js/tailwind-config.js',
    'assets/js/archive-core.js',
    'assets/js/gpx-utils.js',
    'assets/js/music-analytics.js',
    'config.js',
    '404.html'
]) {
    requireFile(path.join(rootDir, asset));
}
console.log('[VALIDATION] Shared assets (assets/, config.js, 404.html) OK.');

if (!pageContent['index.html'].includes('leaflet') || !pageContent['index.html'].includes('leaflet-gpx')) {
    console.warn('[WARN] Leaflet or leaflet-gpx may not be linked in index.html');
} else {
    console.log('[VALIDATION] Leaflet and leaflet-gpx references found in index.html.');
}

// 3. Данные музыкальной аналитики
const statsFile = requireFile(path.join(DATA_DIR, 'lastfmstats-Pruushkaa.json'));
console.log(`[VALIDATION] ${rel(statsFile)} OK (${(fs.statSync(statsFile).size / (1024 * 1024)).toFixed(2)} MB).`);
for (const f of ['music-summary.json', 'music-summary.js']) {
    if (fs.existsSync(path.join(DATA_DIR, f))) console.log(`[VALIDATION] public/data/${f} OK.`);
}

// 4. Синтаксис JSX (@babel/parser)
for (const page of PAGES) {
    const result = await validatePageJsx(page);
    if (!result.ok) {
        console.error(`[ERROR] JSX Syntax error — ${result.message}`);
        if (result.context) console.error(result.context);
        process.exit(1);
    }
    console.log(`[VALIDATION] ${page} JSX & Babel AST syntax verified 100% OK.`);
}

// 5. OpenGraph ассеты
const ogImagePath = path.join(rootDir, 'public', 'og-image.png');
if (fs.existsSync(ogImagePath)) {
    const ogSizeKb = (fs.statSync(ogImagePath).size / 1024).toFixed(1);
    console.log(`[VALIDATION] public/og-image.png OK (${ogSizeKb} KB).`);
} else {
    console.warn('[WARN] public/og-image.png does not exist! Running build:og is recommended.');
}

console.log('--- BUILD COMPLETE (STATUS: OK) ---');
