#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Possible tracks folders to scan
const candidateDirs = [
    path.join(rootDir, 'public', 'tracks'),
    path.join(rootDir, 'tracks'),
    path.join(rootDir, 'pruushkaa_archive', 'public', 'tracks')
];

// Target manifest paths (includes public/tracks/manifest.json as primary static index)
const manifestPaths = [
    path.join(rootDir, 'public', 'tracks', 'manifest.json'),
    path.join(rootDir, 'tracks', 'manifest.json'),
    path.join(rootDir, 'public', 'manifest.json'),
    path.join(rootDir, 'public', 'tracks.json'),
    path.join(rootDir, 'tracks.json'),
    path.join(rootDir, 'pruushkaa_archive', 'public', 'tracks', 'manifest.json'),
    path.join(rootDir, 'pruushkaa_archive', 'public', 'tracks.json')
];

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Helper to extract simple XML tags
function extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : null;
}

function humanizeName(rawName) {
    if (!rawName) return 'Маршрут';
    let clean = rawName.replace(/\.gpx$/i, '').trim();

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
    if (date) {
        const shortDate = date.slice(0, 7);
        return `ride-${shortDate}-${base}`;
    }
    return `ride-${base}`;
}

function deriveTags(title, desc, gpxType, telemetry) {
    const combined = `${title || ''} ${desc || ''} ${gpxType || ''}`.toLowerCase();
    const tags = new Set();

    if (/зелен|кольц/i.test(combined)) {
        tags.add('кольцо');
        tags.add('scenic');
    }
    if (/forest|лес|бор|древес/i.test(combined)) tags.add('forest');
    if (/gravel|гревел|грунт|гравий/i.test(combined)) tags.add('gravel');
    if (/off-?road|бездорож/i.test(combined)) tags.add('off-road');
    if (/river|река|дамба|набереж/i.test(combined)) tags.add('scenic');
    if (/urban|город|улиц|проспект/i.test(combined)) tags.add('urban');
    if (/night|ноч/i.test(combined)) tags.add('night');
    if (/speed|скорост/i.test(combined)) tags.add('speed');
    if (/asphalt|асфальт|road/i.test(combined)) tags.add('asphalt');

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

function haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateTelemetry(xml) {
    const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
    let match;
    const points = [];

    while ((match = trkptRegex.exec(xml)) !== null) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const inner = match[3];
        const eleMatch = inner.match(/<ele>([^<]+)<\/ele>/i);
        const timeMatch = inner.match(/<time>([^<]+)<\/time>/i);

        const ele = eleMatch ? parseFloat(eleMatch[1]) : null;
        const time = timeMatch ? new Date(timeMatch[1]).getTime() : null;

        if (!isNaN(lat) && !isNaN(lon)) {
            points.push({ lat, lon, ele, time });
        }
    }

    if (points.length < 2) {
        return null;
    }

    let totalDist = 0;
    let elevationGain = 0;
    let elevationLoss = 0;

    for (let i = 1; i < points.length; i++) {
        const p1 = points[i - 1];
        const p2 = points[i];
        totalDist += haversineMeters(p1.lat, p1.lon, p2.lat, p2.lon);

        if (p1.ele !== null && p2.ele !== null && !isNaN(p1.ele) && !isNaN(p2.ele)) {
            const diff = p2.ele - p1.ele;
            if (diff > 0) {
                elevationGain += diff;
            } else {
                elevationLoss += Math.abs(diff);
            }
        }
    }

    const firstTime = points[0].time;
    const lastTime = points[points.length - 1].time;
    let movingTimeStr = '--';

    if (firstTime && lastTime && lastTime > firstTime) {
        const totalSec = Math.round((lastTime - firstTime) / 1000);
        const hours = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        movingTimeStr = hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
    }

    const distanceKm = parseFloat((totalDist / 1000).toFixed(1));
    const elevationGainM = Math.round(elevationGain);

    return {
        distanceKm,
        elevationGainM,
        movingTime: movingTimeStr
    };
}

function syncTracks() {
    console.log('\n========================================');
    console.log('  PRUUSHKAA // GPX TRACKS SYNC ENGINE  ');
    console.log('========================================\n');

    const primaryTracksDir = path.join(rootDir, 'tracks');
    ensureDir(primaryTracksDir);

    const gpxFilesMap = new Map();

    for (const dir of candidateDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.toLowerCase().endsWith('.gpx') && !file.startsWith('.')) {
                if (!gpxFilesMap.has(file)) {
                    gpxFilesMap.set(file, path.join(dir, file));
                }
            }
        }
    }

    // Mirror GPX files to primary tracks/ directory
    for (const [fileName, filePath] of gpxFilesMap.entries()) {
        const primaryDest = path.join(primaryTracksDir, fileName);
        if (filePath !== primaryDest && !fs.existsSync(primaryDest)) {
            fs.copyFileSync(filePath, primaryDest);
        }
    }

    let existingTracks = [];
    const checkManifests = [
        path.join(rootDir, 'public', 'tracks', 'manifest.json'),
        path.join(rootDir, 'tracks.json')
    ];
    for (const cm of checkManifests) {
        if (fs.existsSync(cm)) {
            try {
                const raw = fs.readFileSync(cm, 'utf8');
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    existingTracks = parsed;
                    break;
                }
            } catch (e) {}
        }
    }

    console.log(`Found ${existingTracks.length} existing track entries in manifest.`);
    console.log(`Found ${gpxFilesMap.size} .gpx files in storage.`);

    const trackByFile = new Map();
    for (const t of existingTracks) {
        const norm = path.basename(t.file || '');
        if (norm) {
            trackByFile.set(norm, t);
        }
    }

    let addedCount = 0;
    let preservedCount = 0;
    const finalTracks = [];

    for (const [fileName, filePath] of gpxFilesMap.entries()) {
        const existing = trackByFile.get(fileName);

        let gpxXml = '';
        try {
            gpxXml = fs.readFileSync(filePath, 'utf8');
        } catch (e) {
            console.error(`[ERROR] Failed to read ${filePath}: ${e.message}`);
        }

        const telemetry = calculateTelemetry(gpxXml);

        if (existing) {
            // Preserve existing custom fields, update/attach telemetry if missing
            let updatedTitle = existing.title || humanizeName(fileName);
            if (updatedTitle.toLowerCase().endsWith('.gpx') || /^\d{8}_\d{6}/.test(updatedTitle) || /zelenoe/i.test(updatedTitle)) {
                updatedTitle = humanizeName(updatedTitle);
            }
            finalTracks.push({
                ...existing,
                title: updatedTitle,
                file: `public/tracks/${fileName}`,
                telemetry: existing.telemetry || telemetry
            });
            preservedCount++;
            continue;
        }

        const stats = fs.statSync(filePath);
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
            dateStr = stats.mtime.toISOString().slice(0, 10);
        }

        let rawTitle = nameInXml || fileName;
        if (rawTitle.toLowerCase().endsWith('.gpx')) {
            rawTitle = rawTitle.replace(/\.gpx$/i, '');
        }
        const title = humanizeName(rawTitle);
        const description = descInXml || (
            telemetry
                ? `Веломаршрут [${title}]. Дистанция: ${telemetry.distanceKm} км, набор высоты: +${telemetry.elevationGainM} м.`
                : `GPX трек: ${title}`
        );
        const tags = deriveTags(title, description, typeInXml, telemetry);
        const id = generateId(fileName, dateStr);

        const newTrack = {
            id,
            title,
            date: dateStr,
            file: `public/tracks/${fileName}`,
            description,
            tags,
            telemetry
        };

        finalTracks.push(newTrack);
        addedCount++;
        console.log(`  + ADDED NEW TRACK: [${id}] "${title}" (${dateStr}) | ${telemetry ? `${telemetry.distanceKm}km, +${telemetry.elevationGainM}m` : 'no telemetry'}`);
    }

    finalTracks.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const manifestJson = JSON.stringify(finalTracks, null, 2);

    for (const mPath of manifestPaths) {
        const dir = path.dirname(mPath);
        ensureDir(dir);
        fs.writeFileSync(mPath, manifestJson, 'utf8');
        console.log(`  ✔ Manifest saved: ${path.relative(rootDir, mPath)}`);
    }

    for (const dir of candidateDirs) {
        if (fs.existsSync(path.dirname(dir))) {
            ensureDir(dir);
            for (const [fileName, filePath] of gpxFilesMap.entries()) {
                const target = path.join(dir, fileName);
                if (!fs.existsSync(target)) {
                    fs.copyFileSync(filePath, target);
                }
            }
        }
    }

    console.log(`\nSync completed: ${addedCount} added, ${preservedCount} preserved. Total: ${finalTracks.length} tracks.\n`);
}

syncTracks();
