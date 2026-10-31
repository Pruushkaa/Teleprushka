import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const inputPath = path.join(rootDir, 'public', 'data', 'lastfmstats-Pruushkaa.json');
if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath);
    process.exit(1);
}

console.log('Generating music summary from', inputPath);
const rawData = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const scrobbles = rawData.scrobbles || [];
const total = scrobbles.length;

function computeStats(items) {
    const count = items.length;
    if (!count) return null;

    const artistsMap = new Map();
    const albumsMap = new Map();
    const tracksMap = new Map();
    const hourly = new Array(24).fill(0);
    const dailyMap = new Map();

    let streakCurrent = 1;
    let maxStreak = 0;
    let streakTrack = null;
    const streakTopMap = new Map();

    for (let i = 0; i < count; i++) {
        const s = items[i];
        const artist = (s.artist || 'Unknown Artist').trim();
        const track = (s.track || 'Unknown Track').trim();
        const album = (s.album || 'Unknown Album').trim();

        // Artist
        artistsMap.set(artist, (artistsMap.get(artist) || 0) + 1);

        // Album
        const albKey = `${artist} — ${album}`;
        if (!albumsMap.has(albKey)) {
            albumsMap.set(albKey, { artist, album, count: 0, albumId: s.albumId || '' });
        }
        albumsMap.get(albKey).count++;

        // Track
        const trkKey = `${artist} — ${track}`;
        if (!tracksMap.has(trkKey)) {
            tracksMap.set(trkKey, { artist, track, album, count: 0 });
        }
        tracksMap.get(trkKey).count++;

        // Date
        const d = new Date(s.date);
        hourly[d.getHours()]++;

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dayKey = `${yyyy}-${mm}-${dd}`;
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);

        // Consecutive repeats
        if (i > 0) {
            const prev = items[i - 1];
            if (prev.artist === s.artist && prev.track === s.track) {
                streakCurrent++;
                if (streakCurrent > maxStreak) {
                    maxStreak = streakCurrent;
                    streakTrack = { artist, track, album, streak: streakCurrent, date: s.date };
                }
                const prevTop = streakTopMap.get(trkKey) || 0;
                if (streakCurrent > prevTop) {
                    streakTopMap.set(trkKey, streakCurrent);
                }
            } else {
                streakCurrent = 1;
            }
        }
    }

    const topArtists = Array.from(artistsMap.entries())
        .map(([name, plays]) => ({
            name,
            count: plays,
            pct: Number(((plays / count) * 100).toFixed(1))
        }))
        .sort((a, b) => b.count - a.count);

    const topAlbums = Array.from(albumsMap.values())
        .sort((a, b) => b.count - a.count);

    const topTracks = Array.from(tracksMap.values())
        .map(t => ({
            ...t,
            streak: streakTopMap.get(`${t.artist} — ${t.track}`) || 1
        }))
        .sort((a, b) => b.count - a.count);

    const topStreaks = Array.from(streakTopMap.entries())
        .map(([key, streak]) => {
            const trk = tracksMap.get(key) || {};
            return {
                artist: trk.artist,
                track: trk.track,
                album: trk.album,
                streak,
                totalPlays: trk.count
            };
        })
        .sort((a, b) => b.streak - a.streak);

    const totalHours = Math.round((count * 3.4) / 60);

    return {
        count,
        uniqueTracks: tracksMap.size,
        uniqueArtists: artistsMap.size,
        uniqueAlbums: albumsMap.size,
        totalHours,
        topArtists: topArtists.slice(0, 50),
        topAlbums: topAlbums.slice(0, 50),
        topTracks: topTracks.slice(0, 50),
        topStreaks: topStreaks.slice(0, 20),
        maxStreakTrack: streakTrack,
        hourly,
        daily: Object.fromEntries(dailyMap)
    };
}

const allStats = computeStats(scrobbles);

// 30 days slice
const latestDate = scrobbles[scrobbles.length - 1]?.date || Date.now();
const thirtyDaysAgo = latestDate - 30 * 24 * 60 * 60 * 1000;
const scrobbles30d = scrobbles.filter(s => s.date >= thirtyDaysAgo);
const stats30d = computeStats(scrobbles30d);

// 7 days slice
const sevenDaysAgo = latestDate - 7 * 24 * 60 * 60 * 1000;
const scrobbles7d = scrobbles.filter(s => s.date >= sevenDaysAgo);
const stats7d = computeStats(scrobbles7d);

const summary = {
    username: rawData.username || 'Pruushkaa',
    generatedAt: new Date().toISOString(),
    totalScrobbles: total,
    earliestDate: scrobbles[0]?.date,
    latestDate,
    allTime: allStats,
    last30Days: stats30d,
    last7Days: stats7d
};

const outTargets = [
    path.join(rootDir, 'public', 'data', 'music-summary.json'),
    path.join(rootDir, 'data', 'music-summary.json'),
    path.join(rootDir, 'pruushkaa_archive', 'public', 'data', 'music-summary.json')
];

for (const target of outTargets) {
    const parent = path.dirname(target);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.writeFileSync(target, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`Saved summary to ${target} (${(fs.statSync(target).size / 1024).toFixed(1)} KB)`);
}
