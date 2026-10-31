#!/usr/bin/env node
/**
 * PRUUSHKAA // GPX TRACKS SYNC ENGINE
 * Сканирует public/tracks/*.gpx и пересобирает public/tracks/manifest.json:
 * существующие записи сохраняются, новые файлы получают название, дату, теги и телеметрию.
 */
import fs from 'fs';
import path from 'path';
import { rootDir, TRACKS_DIR, TRACKS_MANIFEST, ensureDir, writeJson, loadBrowserLib, rel } from './lib/common.mjs';

const { calculateTelemetry } = loadBrowserLib('assets/js/gpx-utils.js', 'GpxUtils');

// Старые места, откуда GPX ещё подхватываются (копируются в public/tracks/)
const LEGACY_TRACK_DIRS = [
    path.join(rootDir, 'tracks'),
    path.join(rootDir, 'pruushkaa_archive', 'public', 'tracks')
];
// Старые манифесты — читаются, только если основного ещё нет
const LEGACY_MANIFESTS = [path.join(rootDir, 'tracks.json')];

function extractTag(xml, tag) {
    const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return match ? match[1].trim() : null;
}

function humanizeName(rawName) {
    if (!rawName) return 'Маршрут';
    const clean = rawName.replace(/\.gpx$/i, '').trim();

    if (/zelenoe[_-]?kolco/i.test(clean)) {
        return 'Зеленое кольцо Москвы';
    }

    const tsMatch = clean.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})?(.*)$/);
    if (tsMatch) {
        const [, y, m, d, hh, mm, , suffix] = tsMatch;
        return `Заезд ${d}.${m}.${y} (${hh}:${mm})${suffix ? ` #${suffix}` : ''}`;
    }

    return clean
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

function generateId(fileName, date) {
    const base = fileName.replace(/\.gpx$/i, '').toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    return date ? `ride-${date.slice(0, 7)}-${base}` : `ride-${base}`;
}

// [регулярка по названию/описанию/типу, теги]
const TAG_RULES = [
    [/зелен|кольц/i, ['кольцо', 'scenic']],
    [/forest|лес|бор|древес/i, ['forest']],
    [/gravel|гревел|грунт|гравий/i, ['gravel']],
    [/off-?road|бездорож/i, ['off-road']],
    [/river|река|дамба|набереж/i, ['scenic']],
    [/urban|город|улиц|проспект/i, ['urban']],
    [/night|ноч/i, ['night']],
    [/speed|скорост/i, ['speed']],
    [/asphalt|асфальт|road/i, ['asphalt']]
];

function deriveTags(title, desc, gpxType, telemetry) {
    const combined = `${title || ''} ${desc || ''} ${gpxType || ''}`.toLowerCase();
    const tags = new Set();

    for (const [regex, ruleTags] of TAG_RULES) {
        if (regex.test(combined)) ruleTags.forEach((t) => tags.add(t));
    }

    if (telemetry && telemetry.distanceKm >= 100) {
        tags.add('endurance');
        tags.add('epic');
    } else if (telemetry && telemetry.distanceKm >= 50) {
        tags.add('long-ride');
    }

    if (tags.size === 0) {
        tags.add('route');
        tags.add('cycling');
    }

    return Array.from(tags);
}

function collectGpxFiles() {
    const files = new Map();
    for (const dir of [TRACKS_DIR, ...LEGACY_TRACK_DIRS]) {
        if (!fs.existsSync(dir)) continue;
        for (const file of fs.readdirSync(dir)) {
            if (file.toLowerCase().endsWith('.gpx') && !file.startsWith('.') && !files.has(file)) {
                files.set(file, path.join(dir, file));
            }
        }
    }
    return files;
}

function readExistingTracks() {
    for (const file of [TRACKS_MANIFEST, ...LEGACY_MANIFESTS]) {
        if (!fs.existsSync(file)) continue;
        try {
            const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
    }
    return [];
}

function buildNewTrack(fileName, filePath, gpxXml, telemetry) {
    const nameInXml = extractTag(gpxXml, 'name');
    const descInXml = extractTag(gpxXml, 'desc');
    const timeInXml = extractTag(gpxXml, 'time');
    const typeInXml = extractTag(gpxXml, 'type');

    let dateStr = '';
    if (timeInXml) {
        try {
            dateStr = new Date(timeInXml).toISOString().slice(0, 10);
        } catch (_) {}
    }
    if (!dateStr) {
        dateStr = fs.statSync(filePath).mtime.toISOString().slice(0, 10);
    }

    const title = humanizeName((nameInXml || fileName).replace(/\.gpx$/i, ''));
    const description = descInXml || (
        telemetry
            ? `Веломаршрут [${title}]. Дистанция: ${telemetry.distanceKm} км, набор высоты: +${telemetry.elevationGainM} м.`
            : `GPX трек: ${title}`
    );

    return {
        id: generateId(fileName, dateStr),
        title,
        date: dateStr,
        file: `public/tracks/${fileName}`,
        description,
        tags: deriveTags(title, description, typeInXml, telemetry),
        telemetry
    };
}

function syncTracks() {
    console.log('\n========================================');
    console.log('  PRUUSHKAA // GPX TRACKS SYNC ENGINE  ');
    console.log('========================================\n');

    ensureDir(TRACKS_DIR);
    const gpxFiles = collectGpxFiles();

    // Файлы из старых папок переносим в единственное хранилище public/tracks/
    for (const [fileName, filePath] of gpxFiles) {
        const target = path.join(TRACKS_DIR, fileName);
        if (filePath !== target) {
            fs.copyFileSync(filePath, target);
            gpxFiles.set(fileName, target);
            console.log(`  → Перенесён в public/tracks: ${rel(filePath)}`);
        }
    }

    const existingTracks = readExistingTracks();
    console.log(`Found ${existingTracks.length} existing track entries in manifest.`);
    console.log(`Found ${gpxFiles.size} .gpx files in storage.`);

    const trackByFile = new Map();
    for (const t of existingTracks) {
        const name = path.basename(t.file || '');
        if (name) trackByFile.set(name, t);
    }

    let addedCount = 0;
    let preservedCount = 0;
    const finalTracks = [];

    for (const [fileName, filePath] of gpxFiles) {
        let gpxXml = '';
        try {
            gpxXml = fs.readFileSync(filePath, 'utf8');
        } catch (e) {
            console.error(`[ERROR] Failed to read ${filePath}: ${e.message}`);
        }
        const telemetry = calculateTelemetry(gpxXml);
        const existing = trackByFile.get(fileName);

        if (existing) {
            let title = existing.title || humanizeName(fileName);
            if (title.toLowerCase().endsWith('.gpx') || /^\d{8}_\d{6}/.test(title) || /zelenoe/i.test(title)) {
                title = humanizeName(title);
            }
            finalTracks.push({
                ...existing,
                title,
                file: `public/tracks/${fileName}`,
                telemetry: existing.telemetry || telemetry
            });
            preservedCount++;
            continue;
        }

        const track = buildNewTrack(fileName, filePath, gpxXml, telemetry);
        finalTracks.push(track);
        addedCount++;
        console.log(`  + ADDED NEW TRACK: [${track.id}] "${track.title}" (${track.date}) | ${telemetry ? `${telemetry.distanceKm}km, +${telemetry.elevationGainM}m` : 'no telemetry'}`);
    }

    finalTracks.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    writeJson(TRACKS_MANIFEST, finalTracks);
    writeJson(path.join(rootDir, 'tracks.json'), finalTracks);
    console.log(`  ✔ Manifest saved: ${rel(TRACKS_MANIFEST)}`);
    console.log(`  ✔ Manifest mirrored: tracks.json`);
    console.log(`\nSync completed: ${addedCount} added, ${preservedCount} preserved. Total: ${finalTracks.length} tracks.\n`);
}

syncTracks();
