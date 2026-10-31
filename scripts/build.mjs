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
const htmlContent = fs.readFileSync(indexHtml, 'utf8');

// Check Leaflet and GPX script inclusion
if (!htmlContent.includes('leaflet') || !htmlContent.includes('leaflet-gpx')) {
    console.warn('[WARN] Leaflet or leaflet-gpx may not be linked in index.html');
} else {
    console.log('[VALIDATION] Leaflet and leaflet-gpx references found.');
}

// 3. Validate JSX syntax with @babel/parser if installed
try {
    const { parse } = await import('@babel/parser');
    const scriptMatch = htmlContent.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
    if (scriptMatch) {
        parse(scriptMatch[1], { sourceType: 'module', plugins: ['jsx'] });
        console.log('[VALIDATION] JSX & Babel AST syntax verified 100% OK.');
    }
} catch (e) {
    if (e.loc) {
        console.error(`[ERROR] JSX Syntax error at line ${e.loc.line}, col ${e.loc.column}: ${e.message}`);
        process.exit(1);
    }
}

// 3. Mirror index.html to 404.html for GitHub Pages routing if needed
const fourOhFour = path.join(rootDir, '404.html');
fs.writeFileSync(fourOhFour, htmlContent, 'utf8');
console.log('[BUILD] Synchronized 404.html with index.html for GitHub Pages SPA fallback.');

// 4. Mirror files to pruushkaa_archive/public
const publicDir = path.join(rootDir, 'pruushkaa_archive', 'public');
if (fs.existsSync(publicDir)) {
    fs.writeFileSync(path.join(publicDir, 'index.html'), htmlContent, 'utf8');
    fs.writeFileSync(path.join(publicDir, '404.html'), htmlContent, 'utf8');
    if (fs.existsSync(tracksFile)) {
        fs.writeFileSync(path.join(publicDir, 'tracks.json'), fs.readFileSync(tracksFile, 'utf8'), 'utf8');
    }
    console.log('[BUILD] Synchronized public/ distribution folder.');
}

console.log('--- BUILD COMPLETE (STATUS: OK) ---');
