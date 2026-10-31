import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('--- PRUUSHKAA ARCHIVE BUILD & VALIDATION ---');

// 1. Verify tracks and manifest
const tracksFile = path.join(rootDir, 'tracks.json');
if (!fs.existsSync(tracksFile)) {
    console.error('FAIL: tracks.json does not exist!');
    process.exit(1);
}
const tracks = JSON.parse(fs.readFileSync(tracksFile, 'utf8'));
console.log(`[VALIDATION] tracks.json OK (${tracks.length} tracks registered)`);

for (const t of tracks) {
    if (t.file) {
        const fullPath = path.join(rootDir, t.file);
        if (!fs.existsSync(fullPath)) {
            console.warn(`[WARN] Track file not found at ${t.file}`);
        } else {
            console.log(`  ✔ Validated route: ${t.title} (${t.file})`);
        }
    } else {
        console.log(`  ✔ Validated inline/custom route: ${t.title}`);
    }
}

// 2. Validate index.html
const indexHtml = path.join(rootDir, 'index.html');
if (!fs.existsSync(indexHtml)) {
    console.error('FAIL: index.html does not exist!');
    process.exit(1);
}
const indexContent = fs.readFileSync(indexHtml, 'utf8');

if (!indexContent.includes('leaflet') || !indexContent.includes('leaflet-gpx')) {
    console.warn('[WARN] Leaflet or leaflet-gpx may not be linked in index.html');
} else {
    console.log('[VALIDATION] Leaflet and leaflet-gpx references found in index.html.');
}

// 3. Validate music.html
const musicHtml = path.join(rootDir, 'music.html');
if (!fs.existsSync(musicHtml)) {
    console.error('FAIL: music.html does not exist!');
    process.exit(1);
}
const musicContent = fs.readFileSync(musicHtml, 'utf8');
console.log('[VALIDATION] music.html exists.');

// 4. Validate data files
const lastFmStatsFile = path.join(rootDir, 'public', 'data', 'lastfmstats-Pruushkaa.json');
if (!fs.existsSync(lastFmStatsFile)) {
    console.error('FAIL: lastfmstats-Pruushkaa.json does not exist in public/data!');
    process.exit(1);
}
const statsSizeMb = (fs.statSync(lastFmStatsFile).size / (1024 * 1024)).toFixed(2);
console.log(`[VALIDATION] public/data/lastfmstats-Pruushkaa.json OK (${statsSizeMb} MB).`);

const musicSummaryFile = path.join(rootDir, 'public', 'data', 'music-summary.json');
if (fs.existsSync(musicSummaryFile)) {
    console.log('[VALIDATION] public/data/music-summary.json OK.');
}

// 5. Validate JSX syntax with @babel/parser
try {
    const { parse } = await import('@babel/parser');
    
    // Index JSX check
    const indexScriptMatch = indexContent.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
    if (indexScriptMatch) {
        parse(indexScriptMatch[1], { sourceType: 'module', plugins: ['jsx'] });
        console.log('[VALIDATION] index.html JSX & Babel AST syntax verified 100% OK.');
    }

    // Music JSX check
    const musicScriptMatch = musicContent.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
    if (musicScriptMatch) {
        parse(musicScriptMatch[1], { sourceType: 'module', plugins: ['jsx'] });
        console.log('[VALIDATION] music.html JSX & Babel AST syntax verified 100% OK.');
    }
} catch (e) {
    if (e.loc) {
        console.error(`[ERROR] JSX Syntax error at line ${e.loc.line}, col ${e.loc.column}: ${e.message}`);
        process.exit(1);
    } else {
        console.error(`[ERROR] JSX Parse error: ${e.message}`);
        process.exit(1);
    }
}

// 6. Validate OpenGraph image
const ogImagePath = path.join(rootDir, 'public', 'og-image.png');
if (fs.existsSync(ogImagePath)) {
    const ogSizeKb = (fs.statSync(ogImagePath).size / 1024).toFixed(1);
    console.log(`[VALIDATION] public/og-image.png OK (${ogSizeKb} KB).`);
} else {
    console.warn('[WARN] public/og-image.png does not exist! Running build:og is recommended.');
}

// 7. Mirror index.html to 404.html for GitHub Pages routing if needed
const fourOhFour = path.join(rootDir, '404.html');
fs.writeFileSync(fourOhFour, indexContent, 'utf8');
console.log('[BUILD] Synchronized 404.html with index.html for GitHub Pages SPA fallback.');

// 8. Mirror files to pruushkaa_archive/public
const publicDir = path.join(rootDir, 'pruushkaa_archive', 'public');
if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'index.html'), indexContent, 'utf8');
    fs.writeFileSync(path.join(publicDir, '404.html'), indexContent, 'utf8');
    fs.writeFileSync(path.join(publicDir, 'music.html'), musicContent, 'utf8');
    if (fs.existsSync(tracksFile)) {
        fs.writeFileSync(path.join(publicDir, 'tracks.json'), fs.readFileSync(tracksFile, 'utf8'), 'utf8');
    }
    if (fs.existsSync(ogImagePath)) {
        fs.copyFileSync(ogImagePath, path.join(publicDir, 'og-image.png'));
        const ogSvg = path.join(rootDir, 'public', 'og-image.svg');
        if (fs.existsSync(ogSvg)) {
            fs.copyFileSync(ogSvg, path.join(publicDir, 'og-image.svg'));
        }
    }
    
    // Mirror data folder
    const targetDataDir = path.join(publicDir, 'data');
    if (!fs.existsSync(targetDataDir)) {
        fs.mkdirSync(targetDataDir, { recursive: true });
    }
    const sourceDataDir = path.join(rootDir, 'public', 'data');
    if (fs.existsSync(sourceDataDir)) {
        const files = fs.readdirSync(sourceDataDir);
        for (const f of files) {
            fs.copyFileSync(path.join(sourceDataDir, f), path.join(targetDataDir, f));
        }
    }
    console.log('[BUILD] Synchronized public/ distribution folder with music.html, og-image.png and data/.');
}

console.log('--- BUILD COMPLETE (STATUS: OK) ---');
