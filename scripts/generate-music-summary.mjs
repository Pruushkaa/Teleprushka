/**
 * Строит предрасчитанную сводку Last.fm для music.html:
 *   public/data/lastfmstats-Pruushkaa.json → public/data/music-summary.json
 *                                          → public/data/music-summary.js (window.MUSIC_SUMMARY_DATA)
 * Статистику считает тот же движок, что и страница (assets/js/music-analytics.js).
 */
import fs from 'fs';
import path from 'path';
import { DATA_DIR, writeJson, loadBrowserLib, rel } from './lib/common.mjs';

const { calculateStats, filterByPeriod } = loadBrowserLib('assets/js/music-analytics.js', 'MusicAnalytics');

const inputPath = path.join(DATA_DIR, 'lastfmstats-Pruushkaa.json');
if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath);
    process.exit(1);
}

console.log('Generating music summary from', rel(inputPath));
const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const scrobbles = rawData.scrobbles || [];
const latestDate = scrobbles[scrobbles.length - 1]?.date || Date.now();

// Пустой период → null (страница тогда показывает данные «за всё время»)
const statsFor = (items) => (items.length ? calculateStats(items) : null);

const summary = {
    username: rawData.username || 'Pruushkaa',
    generatedAt: new Date().toISOString(),
    totalScrobbles: scrobbles.length,
    earliestDate: scrobbles[0]?.date,
    latestDate,
    allTime: statsFor(scrobbles),
    last30Days: statsFor(filterByPeriod(scrobbles, '30D', latestDate)),
    last7Days: statsFor(filterByPeriod(scrobbles, '7D', latestDate))
};

const jsonFile = path.join(DATA_DIR, 'music-summary.json');
const jsFile = path.join(DATA_DIR, 'music-summary.js');
writeJson(jsonFile, summary);
fs.writeFileSync(jsFile, `window.MUSIC_SUMMARY_DATA = ${JSON.stringify(summary, null, 2)};\n`, 'utf8');

for (const file of [jsonFile, jsFile]) {
    console.log(`Saved summary to ${rel(file)} (${(fs.statSync(file).size / 1024).toFixed(1)} KB)`);
}
