/**
 * PRUUSHKAA // MUSIC ANALYTICS ENGINE
 * High-performance client-side computation & Hybrid Store for Last.fm scrobble datasets.
 */

(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.MusicAnalytics = factory();
    }
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this)), function () {
    'use strict';

    /**
     * Compute full analytical statistics from a scrobbles array
     */
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

    /**
     * Filter scrobbles by specified time window
     */
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

    /**
     * Normalize a raw track object from Last.fm API to standard schema
     */
    function normalizeApiTrack(item) {
        if (!item) return null;
        const isNow = Boolean(item['@attr']?.nowplaying === 'true');
        const trackName = String(item.name || 'Unknown Track').trim();
        const artistName = String(item.artist?.['#text'] || item.artist?.name || item.artist || 'Unknown Artist').trim();
        const albumName = String(item.album?.['#text'] || item.album?.name || '').trim();
        const albumId = String(item.album?.mbid || '').trim();

        // Cover artwork
        const images = Array.isArray(item.image) ? item.image : [];
        const extraLarge = images.find(img => img.size === 'extralarge')?.['#text'];
        const large = images.find(img => img.size === 'large')?.['#text'];
        const medium = images.find(img => img.size === 'medium')?.['#text'];
        const imgUrl = extraLarge || large || medium || (images[images.length - 1]?.['#text']) || '';

        const dateTs = item.date?.uts ? parseInt(item.date.uts, 10) * 1000 : (isNow ? Date.now() : 0);

        return {
            track: trackName,
            artist: artistName,
            album: albumName,
            albumId: albumId,
            date: dateTs,
            image: imgUrl,
            nowPlaying: isNow,
            isLiveSynced: true
        };
    }

    /**
     * Merge static archive scrobbles with new dynamic tracks from Last.fm API
     * Deduplicates strictly by date and returns a sorted array.
     */
    function mergeScrobbles(archiveList, newApiTracks) {
        const base = Array.isArray(archiveList) ? archiveList : [];
        const additional = Array.isArray(newApiTracks) ? newApiTracks : [];

        if (additional.length === 0) {
            return {
                merged: base,
                addedCount: 0,
                maxTimestamp: base.length > 0 ? base[base.length - 1].date : 0
            };
        }

        // Deduplication set by timestamp and track signature
        const existingKeys = new Set();
        for (let i = 0; i < base.length; i++) {
            const s = base[i];
            existingKeys.add(s.date);
            existingKeys.add(`${s.date}_${s.artist}_${s.track}`);
        }

        const validNew = [];
        for (let i = 0; i < additional.length; i++) {
            const t = additional[i];
            if (!t || !t.date || t.nowPlaying) continue;
            const sig = `${t.date}_${t.artist}_${t.track}`;
            if (!existingKeys.has(t.date) && !existingKeys.has(sig)) {
                existingKeys.add(t.date);
                existingKeys.add(sig);
                validNew.push(t);
            }
        }

        // Sort new tracks chronologically ascending
        validNew.sort((a, b) => a.date - b.date);

        const merged = base.concat(validNew);
        const maxTimestamp = merged.length > 0 ? merged[merged.length - 1].date : 0;

        return {
            merged: merged,
            addedCount: validNew.length,
            maxTimestamp: maxTimestamp
        };
    }

    /**
     * Fetch newly listened tracks from Last.fm API since a specific timestamp
     */
    async function fetchNewScrobblesFromApi(user, apiKey, maxTimestampMs, limit = 50) {
        if (!user || !apiKey || apiKey.length < 16) {
            return [];
        }

        const fromSec = Math.floor(maxTimestampMs / 1000) + 1;
        const cleanUser = encodeURIComponent(String(user).trim());
        const cleanKey = encodeURIComponent(String(apiKey).trim());

        const allNewTracks = [];
        let page = 1;
        let totalPages = 1;
        const maxPages = 5; // Safety cap (up to 1,000 tracks)

        while (page <= totalPages && page <= maxPages) {
            const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${cleanUser}&api_key=${cleanKey}&format=json&limit=${limit}&from=${fromSec}&page=${page}`;
            const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
            if (!res.ok) {
                throw new Error(`Last.fm API HTTP ${res.status}`);
            }
            const data = await res.json();
            if (data?.error) {
                throw new Error(data.message || 'Ошибка Last.fm API');
            }

            const attr = data?.recenttracks?.['@attr'] || {};
            totalPages = parseInt(attr.totalPages, 10) || 1;

            const rawTracks = data?.recenttracks?.track || [];
            const trackList = Array.isArray(rawTracks) ? rawTracks : [rawTracks];

            for (let i = 0; i < trackList.length; i++) {
                const norm = normalizeApiTrack(trackList[i]);
                if (norm && !norm.nowPlaying && norm.date) {
                    allNewTracks.push(norm);
                }
            }

            page++;
        }

        return allNewTracks;
    }

    /**
     * Poll Last.fm API for current track and latest completed track
     */
    async function pollLiveTrack(user, apiKey) {
        if (!user || !apiKey || apiKey.length < 16) return null;
        const cleanUser = encodeURIComponent(String(user).trim());
        const cleanKey = encodeURIComponent(String(apiKey).trim());
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${cleanUser}&api_key=${cleanKey}&format=json&limit=2`;

        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(`Last.fm API HTTP ${res.status}`);
        const data = await res.json();
        if (data?.error) throw new Error(data.message || 'Ошибка Last.fm');

        const rawTracks = data?.recenttracks?.track || [];
        const trackList = Array.isArray(rawTracks) ? rawTracks : (rawTracks ? [rawTracks] : []);

        const first = trackList[0] ? normalizeApiTrack(trackList[0]) : null;
        const second = trackList[1] ? normalizeApiTrack(trackList[1]) : null;

        const isNowPlaying = Boolean(first && first.nowPlaying);
        const nowPlayingTrack = isNowPlaying ? first : null;
        const lastCompletedTrack = isNowPlaying ? second : first;

        return {
            isNowPlaying: isNowPlaying,
            nowPlayingTrack: nowPlayingTrack,
            lastCompletedTrack: lastCompletedTrack
        };
    }

    /**
     * Fetch user profile summary statistics from Last.fm API (artist_count, playcount, track_count, album_count)
     */
    async function fetchUserInfo(user, apiKey) {
        if (!user || !apiKey || apiKey.length < 16) return null;
        const cleanUser = encodeURIComponent(String(user).trim());
        const cleanKey = encodeURIComponent(String(apiKey).trim());
        const url = `https://ws.audioscrobbler.com/2.0/?method=user.getinfo&user=${cleanUser}&api_key=${cleanKey}&format=json`;

        const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) throw new Error(`Last.fm API HTTP ${res.status}`);
        const data = await res.json();
        if (data?.error) throw new Error(data.message || 'Ошибка Last.fm');

        const u = data?.user;
        if (!u) return null;

        return {
            name: u.name,
            playcount: parseInt(u.playcount, 10) || 0,
            artistCount: parseInt(u.artist_count, 10) || 0,
            trackCount: parseInt(u.track_count, 10) || 0,
            albumCount: parseInt(u.album_count, 10) || 0
        };
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
        normalizeApiTrack: normalizeApiTrack,
        mergeScrobbles: mergeScrobbles,
        fetchNewScrobblesFromApi: fetchNewScrobblesFromApi,
        pollLiveTrack: pollLiveTrack,
        fetchUserInfo: fetchUserInfo,
        formatScrobbleDate: formatScrobbleDate,
        formatRelativeDate: formatRelativeDate
    };
}));
