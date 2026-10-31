/**
 * PRUUSHKAA // MUSIC ANALYTICS ENGINE
 * High-performance client-side computation for Last.fm scrobble datasets.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MusicAnalytics = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    function calculateStats(items) {
        const count = items ? items.length : 0;
        if (!count) {
            return {
                count: 0,
                uniqueTracks: 0,
                uniqueArtists: 0,
                uniqueAlbums: 0,
                totalHours: 0,
                topArtists: [],
                topAlbums: [],
                topTracks: [],
                topStreaks: [],
                maxStreakTrack: null,
                hourly: new Array(24).fill(0),
                daily: {}
            };
        }

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
            const artist = (s.artist || 'Неизвестный артист').trim();
            const track = (s.track || 'Неизвестный трек').trim();
            const album = (s.album || 'Без альбома').trim();

            // Artist
            artistsMap.set(artist, (artistsMap.get(artist) || 0) + 1);

            // Album
            const albKey = artist + ' — ' + album;
            if (!albumsMap.has(albKey)) {
                albumsMap.set(albKey, { artist, album, count: 0, albumId: s.albumId || '' });
            }
            albumsMap.get(albKey).count++;

            // Track
            const trkKey = artist + ' — ' + track;
            if (!tracksMap.has(trkKey)) {
                tracksMap.set(trkKey, { artist, track, album, count: 0 });
            }
            tracksMap.get(trkKey).count++;

            // Date & Hour
            const d = new Date(s.date);
            const hour = d.getHours();
            if (hour >= 0 && hour < 24) {
                hourly[hour]++;
            }

            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            const dayKey = yyyy + '-' + mm + '-' + dd;
            dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + 1);

            // Streaks (consecutive plays)
            if (i > 0) {
                const prev = items[i - 1];
                if (prev.artist === s.artist && prev.track === s.track) {
                    streakCurrent++;
                    if (streakCurrent > maxStreak) {
                        maxStreak = streakCurrent;
                        streakTrack = { artist, track, album, streak: streakCurrent, date: s.date };
                    }
                    const prevMax = streakTopMap.get(trkKey) || 0;
                    if (streakCurrent > prevMax) {
                        streakTopMap.set(trkKey, streakCurrent);
                    }
                } else {
                    streakCurrent = 1;
                }
            }
        }

        const topArtists = Array.from(artistsMap.entries())
            .map(function (entry) {
                const name = entry[0];
                const plays = entry[1];
                return {
                    name: name,
                    count: plays,
                    pct: Number(((plays / count) * 100).toFixed(1))
                };
            })
            .sort(function (a, b) { return b.count - a.count; });

        const topAlbums = Array.from(albumsMap.values())
            .sort(function (a, b) { return b.count - a.count; });

        const topTracks = Array.from(tracksMap.values())
            .map(function (t) {
                return {
                    artist: t.artist,
                    track: t.track,
                    album: t.album,
                    count: t.count,
                    streak: streakTopMap.get(t.artist + ' — ' + t.track) || 1
                };
            })
            .sort(function (a, b) { return b.count - a.count; });

        const topStreaks = Array.from(streakTopMap.entries())
            .map(function (entry) {
                const key = entry[0];
                const streak = entry[1];
                const trk = tracksMap.get(key) || {};
                return {
                    artist: trk.artist || 'Unknown',
                    track: trk.track || key,
                    album: trk.album || '',
                    streak: streak,
                    totalPlays: trk.count || streak
                };
            })
            .sort(function (a, b) { return b.streak - a.streak; });

        const totalHours = Math.round((count * 3.4) / 60);

        return {
            count: count,
            uniqueTracks: tracksMap.size,
            uniqueArtists: artistsMap.size,
            uniqueAlbums: albumsMap.size,
            totalHours: totalHours,
            topArtists: topArtists.slice(0, 50),
            topAlbums: topAlbums.slice(0, 50),
            topTracks: topTracks.slice(0, 50),
            topStreaks: topStreaks.slice(0, 20),
            maxStreakTrack: streakTrack,
            hourly: hourly,
            daily: Object.fromEntries(dailyMap)
        };
    }

    function filterByPeriod(scrobbles, periodKey, latestDate) {
        if (!scrobbles || !scrobbles.length) return [];
        if (periodKey === 'ALL') return scrobbles;

        const maxTs = latestDate || (scrobbles[scrobbles.length - 1] ? scrobbles[scrobbles.length - 1].date : Date.now());

        if (periodKey === '30D') {
            const cutoff = maxTs - 30 * 24 * 60 * 60 * 1000;
            return scrobbles.filter(function (s) { return s.date >= cutoff; });
        }
        if (periodKey === '7D') {
            const cutoff = maxTs - 7 * 24 * 60 * 60 * 1000;
            return scrobbles.filter(function (s) { return s.date >= cutoff; });
        }
        if (periodKey === '2026') {
            const start = new Date('2026-01-01T00:00:00Z').getTime();
            const end = new Date('2026-12-31T23:59:59Z').getTime();
            return scrobbles.filter(function (s) { return s.date >= start && s.date <= end; });
        }
        if (periodKey === '2025') {
            const start = new Date('2025-01-01T00:00:00Z').getTime();
            const end = new Date('2025-12-31T23:59:59Z').getTime();
            return scrobbles.filter(function (s) { return s.date >= start && s.date <= end; });
        }

        return scrobbles;
    }

    function formatScrobbleDate(ts) {
        if (!ts) return '—';
        const d = new Date(ts);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return day + '.' + month + '.' + year + ' ' + hours + ':' + minutes;
    }

    function formatRelativeDate(ts) {
        if (!ts) return 'недавно';
        const diffMs = Date.now() - ts;
        const diffMin = Math.round(diffMs / 60000);
        if (diffMin < 1) return 'только что';
        if (diffMin < 60) return diffMin + ' мин. назад';
        const diffHours = Math.round(diffMin / 60);
        if (diffHours < 24) return diffHours + ' ч. назад';
        const diffDays = Math.round(diffHours / 24);
        if (diffDays === 1) return 'вчера';
        if (diffDays < 7) return diffDays + ' дн. назад';
        return formatScrobbleDate(ts).split(' ')[0];
    }

    return {
        calculateStats: calculateStats,
        filterByPeriod: filterByPeriod,
        formatScrobbleDate: formatScrobbleDate,
        formatRelativeDate: formatRelativeDate
    };
}));
