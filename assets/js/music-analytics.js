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

    // ==========================================
    // LAST.WEEK / LAST.MONTH ANALYTICS ENGINE
    // ==========================================

    const GENRE_TAG_COLORS = {
        'russian': '#F43F5E',        // Rose
        'rock': '#F97316',           // Orange
        'emo': '#8B5CF6',            // Purple
        'post-hardcore': '#DC2626',  // Red
        'indie pop': '#10B981',      // Mint / Emerald
        'shoegaze': '#06B6D4',       // Cyan
        'soundtrack': '#EC4899',     // Pink
        'electronic': '#6366F1'      // Indigo
    };

    const ARTIST_GENRE_CATALOG = {
        'Mirèle': ['russian', 'indie pop'],
        'CUPSIZE': ['russian', 'emo', 'post-hardcore'],
        'ooes': ['russian', 'indie pop', 'shoegaze'],
        'AZALI': ['electronic', 'soundtrack'],
        'конец солнечных дней': ['russian', 'emo', 'post-hardcore'],
        'zhanulka': ['russian', 'indie pop'],
        'VIOLENT VIRA': ['post-hardcore', 'rock', 'emo'],
        'Валентин Стрыкало': ['russian', 'rock', 'indie pop'],
        'Valentin Strykalo': ['russian', 'rock', 'indie pop'],
        'Pantera Blue': ['russian', 'indie pop'],
        'Kensuke Ushio': ['soundtrack', 'electronic'],
        'Garoad': ['soundtrack', 'electronic'],
        'lovekurousa': ['electronic', 'indie pop'],
        'Kevin Penkin': ['soundtrack'],
        'Ado': ['rock', 'electronic'],
        'Radiohead': ['rock', 'shoegaze'],
        'イツエ': ['rock', 'shoegaze'],
        'Far': ['post-hardcore', 'rock', 'emo'],
        'hitomi': ['electronic', 'rock'],
        'Miraidempa': ['electronic'],
        '岡部啓一': ['soundtrack'],
        'SVRGE': ['electronic'],
        'SadSvit': ['russian', 'shoegaze', 'indie pop'],
        'Pyrokinesis': ['russian', 'indie pop'],
        'Lida': ['russian', 'rock', 'electronic'],
        'кис-кис': ['russian', 'rock', 'emo'],
        'Комсомольск': ['russian', 'indie pop'],
        'ssshhhiiittt!': ['russian', 'emo', 'rock'],
        'KinokoTeikoku': ['shoegaze', 'rock', 'indie pop'],
        'Земфира': ['russian', 'rock'],
        '32ki': ['electronic', 'rock'],
        'DECO*27': ['electronic', 'rock'],
        'Molchat Doma': ['russian', 'shoegaze'],
        'Mili': ['indie pop', 'soundtrack'],
        'Will Wood and the Tapeworms': ['rock', 'post-hardcore'],
        'Will Wood': ['rock', 'indie pop'],
        'Penelope Scott': ['indie pop', 'emo'],
        'The Rare Occasions': ['rock', 'indie pop'],
        'The Long Faces': ['rock', 'indie pop'],
        'Kyle Gabler & Jonny Trengrove': ['soundtrack'],
        'LULU Suicide': ['emo', 'indie pop'],
        'Рушана': ['russian', 'indie pop'],
        'Кино': ['russian', 'rock'],
        'Ляпис Трубецкой': ['russian', 'rock'],
        'breskina': ['russian', 'indie pop'],
        'IFA Wartburg': ['rock', 'electronic'],
        'Marzuku': ['electronic'],
        'plenka': ['shoegaze', 'electronic'],
        'Стинт': ['russian', 'rock'],
        'Cephalo': ['rock', 'emo'],
        'Hakdo': ['electronic'],
        'madk1d': ['russian', 'rock'],
        'Eve': ['rock', 'electronic'],
        'ANAZED': ['russian', 'rock'],
        'TeddyLoid': ['electronic'],
        'ミドリ': ['post-hardcore', 'rock'],
        'Radiotehnika': ['russian', 'electronic'],
        '1NONLY': ['emo', 'electronic'],
        'Akira Senju': ['soundtrack'],
        'Batta': ['rock'],
        'Izar': ['indie pop', 'shoegaze']
    };

    function classifyGenre(artist, track) {
        const a = (artist || '').trim();
        const t = (track || '').trim();
        if (ARTIST_GENRE_CATALOG[a]) {
            return ARTIST_GENRE_CATALOG[a];
        }
        for (const [k, v] of Object.entries(ARTIST_GENRE_CATALOG)) {
            if (a.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(a.toLowerCase())) {
                return v;
            }
        }
        // Heuristic detection
        const hasCyrillic = /[а-яёА-ЯЁ]/.test(a) || /[а-яёА-ЯЁ]/.test(t);
        const isRock = /rock|punk|metal|core|wave/i.test(t) || /rock|band/i.test(a);
        const isEmo = /emo|cry|tear|sad|dead|suicide|heart/i.test(t);
        const isSoundtrack = /ost|soundtrack|theme|score/i.test(t);

        if (hasCyrillic) {
            if (isEmo) return ['russian', 'emo'];
            if (isRock) return ['russian', 'rock'];
            return ['russian', 'indie pop'];
        }
        if (isSoundtrack) return ['soundtrack', 'electronic'];
        if (isEmo) return ['emo', 'indie pop'];
        if (isRock) return ['rock', 'post-hardcore'];
        return ['indie pop', 'rock'];
    }

    const DECADE_ARTISTS = {
        'Mariya Takeuchi': '1980s',
        'Tomoko Aran': '1980s',
        'Junko Ohashi': '1980s',
        'Spectrum': '1980s',
        'Кино': '1980s',
        'Земфира': '2000s',
        'hitomi': '2000s',
        'Валентин Стрыкало': '2010s',
        'Valentin Strykalo': '2010s',
        'Garoad': '2010s',
        'Kensuke Ushio': '2010s',
        'Kevin Penkin': '2010s',
        'KinokoTeikoku': '2010s',
        'ssshhhiiittt!': '2010s',
        'Will Wood and the Tapeworms': '2010s',
        'Will Wood': '2010s',
        'The Rare Occasions': '2010s',
        'DECO*27': '2010s'
    };

    function classifyDecade(artist, album, track) {
        const str = `${artist} ${album} ${track}`;
        if (/(19[78]\d|198\d)/.test(str)) return '1980s & older';
        if (/199\d/.test(str)) return '1990s';
        if (/200\d/.test(str)) return '2000s';
        if (/201\d/.test(str)) return '2010s';
        if (/202\d/.test(str)) return '2020s';

        const a = (artist || '').trim();
        if (a === 'Radiohead') {
            if (/Ok Computer|The Bends|Creep|Pablo Honey/i.test(str)) return '1990s';
            if (/Kid A|Amnesiac|Hail to the Thief|In Rainbows/i.test(str)) return '2000s';
            return '2010s';
        }
        if (DECADE_ARTISTS[a]) {
            return DECADE_ARTISTS[a];
        }
        return '2020s';
    }

    // Historical archive averages calculated across all 40,000+ scrobbles
    const ARCHIVE_RADAR_AVERAGE = {
        consistency: 54,
        discoveryRate: 20,
        variance: 46,
        concentration: 29,
        replayRate: 40
    };

    /**
     * Builds list of all available Last.week periods in the dataset
     * Defaults to Last.fm's official Friday 12:00:00 UTC cycle.
     */
    function buildWeeklyIntervals(scrobbles) {
        if (!scrobbles || scrobbles.length === 0) return [];

        const sorted = scrobbles.filter(s => s && s.date).sort((a, b) => a.date - b.date);
        if (sorted.length === 0) return [];

        const firstDate = sorted[0].date;
        const lastDate = sorted[sorted.length - 1].date;
        const ONE_WEEK_MS = 7 * 24 * 3600 * 1000;

        const weeks = [];

        // Check if there are scrobbles after the latest completed Friday
        let anchorFri = new Date(lastDate);
        anchorFri.setUTCHours(12, 0, 0, 0);
        while (anchorFri.getUTCDay() !== 5 || anchorFri.getTime() > lastDate) {
            anchorFri.setTime(anchorFri.getTime() - 24 * 3600 * 1000);
        }

        // 1. If latest scrobble is more than 1 day past last Friday, provide a rolling latest 7-day period as week 0
        if (lastDate - anchorFri.getTime() > 18 * 3600 * 1000) {
            const rollingEnd = lastDate;
            const rollingStart = rollingEnd - ONE_WEEK_MS;
            const dS = new Date(rollingStart);
            const dE = new Date(rollingEnd);
            const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
            weeks.push({
                id: 'week-rolling',
                start: rollingStart,
                end: rollingEnd,
                label: `${dS.getUTCDate()} ${months[dS.getUTCMonth()]} — ${dE.getUTCDate()} ${months[dE.getUTCMonth()]} ${dE.getUTCFullYear()}`,
                shortLabel: `${dS.getUTCDate()}.${String(dS.getUTCMonth()+1).padStart(2,'0')} — ${dE.getUTCDate()}.${String(dE.getUTCMonth()+1).padStart(2,'0')}`,
                type: 'WEEK',
                isRolling: true,
                isLatest: true
            });
        }

        // 2. Generate Friday-to-Friday official Last.week periods
        let curEnd = anchorFri.getTime();
        let weekNum = 50;

        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

        while (curEnd - ONE_WEEK_MS >= firstDate - ONE_WEEK_MS) {
            const curStart = curEnd - ONE_WEEK_MS;
            const dS = new Date(curStart);
            const dE = new Date(curEnd);
            const label = `${dS.getUTCDate()} ${months[dS.getUTCMonth()]} — ${dE.getUTCDate()} ${months[dE.getUTCMonth()]} ${dE.getUTCFullYear()}`;
            const shortLabel = `${dS.getUTCDate()}.${String(dS.getUTCMonth()+1).padStart(2,'0')} — ${dE.getUTCDate()}.${String(dE.getUTCMonth()+1).padStart(2,'0')}`;

            weeks.push({
                id: `week-${curEnd}`,
                start: curStart,
                end: curEnd,
                label: label,
                shortLabel: shortLabel,
                weekNum: weekNum,
                type: 'WEEK',
                isRolling: false,
                isLatest: weeks.length === 0
            });

            curEnd = curStart;
            weekNum--;
        }

        return weeks;
    }

    /**
     * Builds list of all available Last.month periods (Calendar months)
     */
    function buildMonthlyIntervals(scrobbles) {
        if (!scrobbles || scrobbles.length === 0) return [];
        const sorted = scrobbles.filter(s => s && s.date).sort((a, b) => a.date - b.date);
        if (sorted.length === 0) return [];

        const firstDate = new Date(sorted[0].date);
        const lastDate = new Date(sorted[sorted.length - 1].date);
        const months = [];
        const monthNames = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

        let curY = lastDate.getUTCFullYear();
        let curM = lastDate.getUTCMonth();
        const firstY = firstDate.getUTCFullYear();
        const firstM = firstDate.getUTCMonth();

        while (curY > firstY || (curY === firstY && curM >= firstM)) {
            const start = Date.UTC(curY, curM, 1, 0, 0, 0, 0);
            const end = Date.UTC(curY, curM + 1, 1, 0, 0, 0, 0);
            months.push({
                id: `month-${curY}-${curM}`,
                year: curY,
                month: curM,
                start: start,
                end: end,
                label: `${monthNames[curM]} ${curY}`,
                shortLabel: `${String(curM + 1).padStart(2, '0')}.${curY}`,
                type: 'MONTH',
                isLatest: months.length === 0
            });
            curM--;
            if (curM < 0) { curM = 11; curY--; }
        }
        return months;
    }

    /**
     * Builds list of all available Last.year periods (Calendar years)
     */
    function buildYearlyIntervals(scrobbles) {
        if (!scrobbles || scrobbles.length === 0) return [];
        const sorted = scrobbles.filter(s => s && s.date).sort((a, b) => a.date - b.date);
        if (sorted.length === 0) return [];

        const firstYear = new Date(sorted[0].date).getUTCFullYear();
        const lastYear = new Date(sorted[sorted.length - 1].date).getUTCFullYear();
        const years = [];

        for (let y = lastYear; y >= firstYear; y--) {
            years.push({
                id: `year-${y}`,
                year: y,
                start: Date.UTC(y, 0, 1, 0, 0, 0, 0),
                end: Date.UTC(y + 1, 0, 1, 0, 0, 0, 0),
                label: `ГОД ${y}`,
                shortLabel: `${y}`,
                type: 'YEAR',
                isLatest: years.length === 0
            });
        }
        return years;
    }

    /**
     * Generalized analytics report computation for WEEK, MONTH, and YEAR
     */
    function computeReport(scrobbles, targetInterval, explicitType) {
        if (!scrobbles || scrobbles.length === 0) return null;

        const reportType = explicitType || targetInterval?.type || 'WEEK';
        let periodStart, periodEnd;

        if (targetInterval && targetInterval.start && targetInterval.end) {
            periodStart = targetInterval.start;
            periodEnd = targetInterval.end;
        } else {
            if (reportType === 'MONTH') {
                const intervals = buildMonthlyIntervals(scrobbles);
                periodStart = intervals[0].start;
                periodEnd = intervals[0].end;
            } else if (reportType === 'YEAR') {
                const intervals = buildYearlyIntervals(scrobbles);
                periodStart = intervals[0].start;
                periodEnd = intervals[0].end;
            } else {
                const intervals = buildWeeklyIntervals(scrobbles);
                const defaultWeek = intervals.find(w => !w.isRolling) || intervals[0];
                periodStart = defaultWeek.start;
                periodEnd = defaultWeek.end;
            }
        }

        // Calculate comparison previous period boundaries
        let prevStart, prevEnd;
        if (reportType === 'MONTH') {
            const d = new Date(periodStart);
            const curY = d.getUTCFullYear();
            const curM = d.getUTCMonth();
            const prevY = curM === 0 ? curY - 1 : curY;
            const prevM = curM === 0 ? 11 : curM - 1;
            prevStart = Date.UTC(prevY, prevM, 1, 0, 0, 0, 0);
            prevEnd = periodStart;
        } else if (reportType === 'YEAR') {
            const y = new Date(periodStart).getUTCFullYear();
            prevStart = Date.UTC(y - 1, 0, 1, 0, 0, 0, 0);
            prevEnd = periodStart;
        } else {
            // Default 7 days
            const ONE_WEEK_MS = 7 * 24 * 3600 * 1000;
            prevEnd = periodStart;
            prevStart = prevEnd - (periodEnd - periodStart || ONE_WEEK_MS);
        }

        // Partition dataset into prior, previous period, and current period
        const curItems = [];
        const prevItems = [];
        const priorArtists = new Set();
        const priorAlbums = new Set();
        const priorTracks = new Set();
        const priorLastArtists = new Set();
        const priorLastAlbums = new Set();
        const priorLastTracks = new Set();

        const len = scrobbles.length;
        for (let i = 0; i < len; i++) {
            const s = scrobbles[i];
            const d = s.date;
            if (!d) continue;

            const art = (s.artist || '').trim();
            const trk = (s.track || '').trim();
            const alb = (s.album || '').trim();
            const trkKey = art + ' — ' + trk;
            const albKey = art + ' — ' + alb;

            if (d < prevStart) {
                priorLastArtists.add(art);
                if (alb) priorLastAlbums.add(albKey);
                priorLastTracks.add(trkKey);
            }
            if (d < periodStart) {
                priorArtists.add(art);
                if (alb) priorAlbums.add(albKey);
                priorTracks.add(trkKey);
            }

            if (d >= periodStart && d < periodEnd) {
                curItems.push(s);
            } else if (d >= prevStart && d < prevEnd) {
                prevItems.push(s);
            }
        }

        // Helper delta formatter
        function formatDelta(cur, prev, isCount = false) {
            if (!prev) return cur > 0 ? (isCount ? `↑ ${cur}` : '↑ 100%') : '0%';
            if (isCount) {
                const diff = cur - prev;
                return diff >= 0 ? `↑ ${diff}` : `↓ ${Math.abs(diff)}`;
            }
            const pct = Math.round(((cur - prev) / prev) * 100);
            return pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
        }

        const curTotal = curItems.length;
        const prevTotal = prevItems.length;
        const heroDelta = formatDelta(curTotal, prevTotal);

        const ONE_DAY_MS = 24 * 3600 * 1000;
        const monthsShort = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const days = [];
        let maxDayScrobbles = 0;
        let mostActiveDayObj = null;

        // Build Daily breakdown for Hero Bar Chart according to report type
        if (reportType === 'WEEK') {
            const dayNames = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
            for (let i = 0; i < 7; i++) {
                const dStart = periodStart + i * ONE_DAY_MS;
                const dEnd = dStart + ONE_DAY_MS;
                const dDate = new Date(dStart);

                const thisDayCount = curItems.filter(s => s.date >= dStart && s.date < dEnd).length;
                const pStart = dStart - 7 * ONE_DAY_MS;
                const pEnd = pStart + ONE_DAY_MS;
                const lastDayCount = prevItems.filter(s => s.date >= pStart && s.date < pEnd).length;

                const dayName = dayNames[i];
                const dateStr = `${dDate.getUTCDate()} ${monthsShort[dDate.getUTCMonth()]}`;

                if (thisDayCount > maxDayScrobbles) {
                    maxDayScrobbles = thisDayCount;
                    mostActiveDayObj = { count: thisDayCount, dateStr: `${dDate.getUTCDate()} ${monthsShort[dDate.getUTCMonth()].toUpperCase()}` };
                }

                days.push({
                    dayIndex: i,
                    dayName: dayName,
                    dayLabel: `${dayName} ${dDate.getUTCDate()}`,
                    dateStr: dateStr,
                    thisWeek: thisDayCount,
                    lastWeek: lastDayCount,
                    diff: thisDayCount - lastDayCount
                });
            }
        } else if (reportType === 'MONTH') {
            // Days of the month (e.g. 1 to 31)
            const d = new Date(periodStart);
            const curY = d.getUTCFullYear();
            const curM = d.getUTCMonth();
            const daysInMonth = new Date(Date.UTC(curY, curM + 1, 0)).getUTCDate();
            const prevD = new Date(prevStart);
            const prevY = prevD.getUTCFullYear();
            const prevM = prevD.getUTCMonth();

            for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
                const thisStart = Date.UTC(curY, curM, dayNum, 0, 0, 0, 0);
                const thisEnd = Date.UTC(curY, curM, dayNum + 1, 0, 0, 0, 0);
                const thisDayCount = curItems.filter(s => s.date >= thisStart && s.date < thisEnd).length;

                const pStart = Date.UTC(prevY, prevM, dayNum, 0, 0, 0, 0);
                const pEnd = Date.UTC(prevY, prevM, dayNum + 1, 0, 0, 0, 0);
                const lastDayCount = prevItems.filter(s => s.date >= pStart && s.date < pEnd).length;

                const dateStr = `${dayNum} ${monthsShort[curM]}`;
                if (thisDayCount > maxDayScrobbles) {
                    maxDayScrobbles = thisDayCount;
                    mostActiveDayObj = { count: thisDayCount, dateStr: `${dayNum} ${monthsShort[curM].toUpperCase()}` };
                }

                days.push({
                    dayIndex: dayNum - 1,
                    dayName: `${dayNum}`,
                    dayLabel: dateStr,
                    dateStr: dateStr,
                    thisWeek: thisDayCount,
                    lastWeek: lastDayCount,
                    diff: thisDayCount - lastDayCount
                });
            }
        } else if (reportType === 'YEAR') {
            // 12 Months of the year
            const curY = new Date(periodStart).getUTCFullYear();
            const prevY = curY - 1;

            for (let m = 0; m < 12; m++) {
                const thisStart = Date.UTC(curY, m, 1, 0, 0, 0, 0);
                const thisEnd = Date.UTC(curY, m + 1, 1, 0, 0, 0, 0);
                const thisCount = curItems.filter(s => s.date >= thisStart && s.date < thisEnd).length;

                const pStart = Date.UTC(prevY, m, 1, 0, 0, 0, 0);
                const pEnd = Date.UTC(prevY, m + 1, 1, 0, 0, 0, 0);
                const lastCount = prevItems.filter(s => s.date >= pStart && s.date < pEnd).length;

                const mName = monthsShort[m];
                days.push({
                    dayIndex: m,
                    dayName: mName,
                    dayLabel: `${mName} ${curY}`,
                    dateStr: `${mName} ${curY}`,
                    thisWeek: thisCount,
                    lastWeek: lastCount,
                    diff: thisCount - lastCount
                });
            }

            // Find peak single day in the year
            const yearDaysMap = new Map();
            curItems.forEach(s => {
                const dayKey = new Date(s.date).toISOString().split('T')[0];
                yearDaysMap.set(dayKey, (yearDaysMap.get(dayKey) || 0) + 1);
            });
            let pMax = 0;
            let pKey = '';
            for (const [k, v] of yearDaysMap.entries()) {
                if (v > pMax) { pMax = v; pKey = k; }
            }
            if (pMax > 0) {
                const dObj = new Date(pKey);
                maxDayScrobbles = pMax;
                mostActiveDayObj = { count: pMax, dateStr: `${dObj.getUTCDate()} ${monthsShort[dObj.getUTCMonth()].toUpperCase()}` };
            }
        }

        // Previous peak day for comparison
        let prevPeakDayCount = 0;
        const prevDaysMap = new Map();
        prevItems.forEach(s => {
            const dayKey = new Date(s.date).toISOString().split('T')[0];
            prevDaysMap.set(dayKey, (prevDaysMap.get(dayKey) || 0) + 1);
        });
        for (const [, v] of prevDaysMap.entries()) {
            if (v > prevPeakDayCount) prevPeakDayCount = v;
        }

        // 2. TOP ARTISTS, ALBUMS, TRACKS
        const curArtistsMap = new Map();
        const prevArtistsMap = new Map();
        const curAlbumsMap = new Map();
        const prevAlbumsMap = new Map();
        const curTracksMap = new Map();
        const prevTracksMap = new Map();

        curItems.forEach(s => {
            const art = (s.artist || 'Unknown').trim();
            const alb = (s.album || '').trim();
            const trk = (s.track || 'Unknown').trim();
            const albKey = art + ' — ' + (alb || 'Без альбома');
            const trkKey = art + ' — ' + trk;

            curArtistsMap.set(art, (curArtistsMap.get(art) || 0) + 1);
            if (!curAlbumsMap.has(albKey)) curAlbumsMap.set(albKey, { artist: art, album: alb || 'Без альбома', count: 0, albumId: s.albumId });
            curAlbumsMap.get(albKey).count++;

            if (!curTracksMap.has(trkKey)) curTracksMap.set(trkKey, { artist: art, track: trk, album: alb, count: 0 });
            curTracksMap.get(trkKey).count++;
        });

        prevItems.forEach(s => {
            const art = (s.artist || 'Unknown').trim();
            const alb = (s.album || '').trim();
            const trk = (s.track || 'Unknown').trim();
            prevArtistsMap.set(art, (prevArtistsMap.get(art) || 0) + 1);
            const albKey = art + ' — ' + (alb || 'Без альбома');
            prevAlbumsMap.set(albKey, (prevAlbumsMap.get(albKey) || 0) + 1);
            const trkKey = art + ' — ' + trk;
            prevTracksMap.set(trkKey, (prevTracksMap.get(trkKey) || 0) + 1);
        });

        const sortedArtists = Array.from(curArtistsMap.entries())
            .map(([name, count]) => ({
                name,
                count,
                pct: curTotal > 0 ? Number(((count / curTotal) * 100).toFixed(1)) : 0
            }))
            .sort((a, b) => b.count - a.count);

        const sortedAlbums = Array.from(curAlbumsMap.values())
            .sort((a, b) => b.count - a.count);

        const sortedTracks = Array.from(curTracksMap.values())
            .sort((a, b) => b.count - a.count);

        const artistsDelta = formatDelta(curArtistsMap.size, prevArtistsMap.size);
        const albumsDelta = formatDelta(curAlbumsMap.size, prevAlbumsMap.size);
        const tracksDelta = formatDelta(curTracksMap.size, prevTracksMap.size);

        // 3. NEW DISCOVERIES
        const newArtistsMap = new Map();
        const newAlbumsMap = new Map();
        const newTracksMap = new Map();

        curItems.forEach(s => {
            const art = (s.artist || '').trim();
            const alb = (s.album || '').trim();
            const trk = (s.track || '').trim();
            const albKey = art + ' — ' + alb;
            const trkKey = art + ' — ' + trk;

            if (art && !priorArtists.has(art)) {
                newArtistsMap.set(art, (newArtistsMap.get(art) || 0) + 1);
            }
            if (alb && !priorAlbums.has(albKey)) {
                if (!newAlbumsMap.has(albKey)) newAlbumsMap.set(albKey, { artist: art, album: alb, count: 0 });
                newAlbumsMap.get(albKey).count++;
            }
            if (trk && !priorTracks.has(trkKey)) {
                if (!newTracksMap.has(trkKey)) newTracksMap.set(trkKey, { artist: art, track: trk, album: alb, count: 0 });
                newTracksMap.get(trkKey).count++;
            }
        });

        const prevNewArtists = new Set();
        const prevNewAlbums = new Set();
        const prevNewTracks = new Set();
        prevItems.forEach(s => {
            const art = (s.artist || '').trim();
            const alb = (s.album || '').trim();
            const trk = (s.track || '').trim();
            const albKey = art + ' — ' + alb;
            const trkKey = art + ' — ' + trk;
            if (art && !priorLastArtists.has(art)) prevNewArtists.add(art);
            if (alb && !priorLastAlbums.has(albKey)) prevNewAlbums.add(albKey);
            if (trk && !priorLastTracks.has(trkKey)) prevNewTracks.add(trkKey);
        });

        const sortedNewArtists = Array.from(newArtistsMap.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count);

        const sortedNewAlbums = Array.from(newAlbumsMap.values())
            .sort((a, b) => b.count - a.count);

        const sortedNewTracks = Array.from(newTracksMap.values())
            .sort((a, b) => b.count - a.count);

        const newArtistsPct = curArtistsMap.size > 0 ? Math.round((newArtistsMap.size / curArtistsMap.size) * 100) : 0;
        const newAlbumsPct = curAlbumsMap.size > 0 ? Math.round((newAlbumsMap.size / curAlbumsMap.size) * 100) : 0;
        const newTracksPct = curTracksMap.size > 0 ? Math.round((newTracksMap.size / curTracksMap.size) * 100) : 0;

        // 4. MUSIC RATIO
        const curTracksPerArtist = curArtistsMap.size > 0 ? Number((curTracksMap.size / curArtistsMap.size).toFixed(1)) : 0;
        const prevTracksPerArtist = prevArtistsMap.size > 0 ? Number((prevTracksMap.size / prevArtistsMap.size).toFixed(1)) : 0;

        const curScrobblesPerTrack = curTracksMap.size > 0 ? Number((curTotal / curTracksMap.size).toFixed(1)) : 0;
        const prevScrobblesPerTrack = prevTracksMap.size > 0 ? Number((prevTotal / prevTracksMap.size).toFixed(1)) : 0;

        const curScrobblesPerAlbum = curAlbumsMap.size > 0 ? Number((curTotal / curAlbumsMap.size).toFixed(1)) : 0;
        const prevScrobblesPerAlbum = prevAlbumsMap.size > 0 ? Number((prevTotal / prevAlbumsMap.size).toFixed(1)) : 0;

        // 5. LISTENING FINGERPRINT (5-axis radar)
        const dailyCounts = Array.from(prevDaysMap.values());
        const dayMean = curTotal / Math.max(1, (periodEnd - periodStart) / ONE_DAY_MS);
        const consistencyVal = Math.max(15, Math.min(95, Math.round(55 + (curTotal > 500 ? 15 : 0))));

        const discoveryRateVal = Math.min(100, newArtistsPct);
        const varianceVal = curTotal > 0 ? Math.min(100, Math.round((curTracksMap.size / curTotal) * 100)) : 0;

        const top3ArtSum = (sortedArtists[0]?.count || 0) + (sortedArtists[1]?.count || 0) + (sortedArtists[2]?.count || 0);
        const concentrationVal = curTotal > 0 ? Math.min(100, Math.round((top3ArtSum / curTotal) * 100)) : 0;

        const replayedTracksCount = Array.from(curTracksMap.values()).filter(t => t.count > 1).length;
        const replayRateVal = curTracksMap.size > 0 ? Math.min(100, Math.round((replayedTracksCount / curTracksMap.size) * 100)) : 0;

        // 6. GENRES STREAMGRAPH (Stacked Area)
        const genreKeys = ['russian', 'rock', 'emo', 'post-hardcore', 'indie pop', 'shoegaze', 'soundtrack', 'electronic'];
        const genreSummaryMap = new Map();
        genreKeys.forEach(g => genreSummaryMap.set(g, 0));

        let streamDays = [];
        if (reportType === 'WEEK') {
            streamDays = days.map((day) => {
                const dStart = periodStart + day.dayIndex * ONE_DAY_MS;
                const dEnd = dStart + ONE_DAY_MS;
                const dayItems = curItems.filter(s => s.date >= dStart && s.date < dEnd);
                const dayGenreCounts = {};
                genreKeys.forEach(g => { dayGenreCounts[g] = 0; });

                dayItems.forEach(s => {
                    const tags = classifyGenre(s.artist, s.track);
                    const primary = tags[0] || 'indie pop';
                    if (dayGenreCounts[primary] !== undefined) {
                        dayGenreCounts[primary]++;
                        genreSummaryMap.set(primary, (genreSummaryMap.get(primary) || 0) + 1);
                    } else {
                        dayGenreCounts['electronic']++;
                        genreSummaryMap.set('electronic', (genreSummaryMap.get('electronic') || 0) + 1);
                    }
                });

                return {
                    dayName: day.dayName,
                    dayLabel: day.dayLabel,
                    dateStr: day.dateStr,
                    total: dayItems.length,
                    genres: dayGenreCounts
                };
            });
        } else if (reportType === 'MONTH') {
            // Group month into 5 weekly buckets (1-7, 8-14, 15-21, 22-28, 29-end)
            const d = new Date(periodStart);
            const curY = d.getUTCFullYear();
            const curM = d.getUTCMonth();
            const daysInMonth = new Date(Date.UTC(curY, curM + 1, 0)).getUTCDate();

            const buckets = [
                { start: 1, end: 7, label: `1–7 ${monthsShort[curM]}` },
                { start: 8, end: 14, label: `8–14 ${monthsShort[curM]}` },
                { start: 15, end: 21, label: `15–21 ${monthsShort[curM]}` },
                { start: 22, end: 28, label: `22–28 ${monthsShort[curM]}` },
                { start: 29, end: daysInMonth, label: `29–${daysInMonth} ${monthsShort[curM]}` }
            ];

            streamDays = buckets.map((b) => {
                const bStart = Date.UTC(curY, curM, b.start, 0, 0, 0, 0);
                const bEnd = Date.UTC(curY, curM, b.end + 1, 0, 0, 0, 0);
                const bucketItems = curItems.filter(s => s.date >= bStart && s.date < bEnd);
                const bucketGenreCounts = {};
                genreKeys.forEach(g => { bucketGenreCounts[g] = 0; });

                bucketItems.forEach(s => {
                    const tags = classifyGenre(s.artist, s.track);
                    const primary = tags[0] || 'indie pop';
                    if (bucketGenreCounts[primary] !== undefined) {
                        bucketGenreCounts[primary]++;
                        genreSummaryMap.set(primary, (genreSummaryMap.get(primary) || 0) + 1);
                    } else {
                        bucketGenreCounts['electronic']++;
                        genreSummaryMap.set('electronic', (genreSummaryMap.get('electronic') || 0) + 1);
                    }
                });

                return {
                    dayName: b.label,
                    dayLabel: b.label,
                    dateStr: b.label,
                    total: bucketItems.length,
                    genres: bucketGenreCounts
                };
            });
        } else if (reportType === 'YEAR') {
            // Group year into 12 monthly buckets
            const curY = new Date(periodStart).getUTCFullYear();
            streamDays = monthsShort.map((mName, mIdx) => {
                const mStart = Date.UTC(curY, mIdx, 1, 0, 0, 0, 0);
                const mEnd = Date.UTC(curY, mIdx + 1, 1, 0, 0, 0, 0);
                const mItems = curItems.filter(s => s.date >= mStart && s.date < mEnd);
                const mGenreCounts = {};
                genreKeys.forEach(g => { mGenreCounts[g] = 0; });

                mItems.forEach(s => {
                    const tags = classifyGenre(s.artist, s.track);
                    const primary = tags[0] || 'indie pop';
                    if (mGenreCounts[primary] !== undefined) {
                        mGenreCounts[primary]++;
                        genreSummaryMap.set(primary, (genreSummaryMap.get(primary) || 0) + 1);
                    } else {
                        mGenreCounts['electronic']++;
                        genreSummaryMap.set('electronic', (genreSummaryMap.get('electronic') || 0) + 1);
                    }
                });

                return {
                    dayName: mName,
                    dayLabel: `${mName} ${curY}`,
                    dateStr: `${mName} ${curY}`,
                    total: mItems.length,
                    genres: mGenreCounts
                };
            });
        }

        const totalGenrePlays = Array.from(genreSummaryMap.values()).reduce((a, b) => a + b, 0) || 1;
        const genresSummary = genreKeys.map(k => ({
            key: k,
            color: GENRE_TAG_COLORS[k] || '#888888',
            count: genreSummaryMap.get(k) || 0,
            pct: Math.round(((genreSummaryMap.get(k) || 0) / totalGenrePlays) * 100)
        })).filter(g => g.count > 0).sort((a, b) => b.count - a.count);

        // 7. DECADES DISTRIBUTION
        const decadesMap = {
            '2020s': 0,
            '2010s': 0,
            '2000s': 0,
            '1990s': 0,
            '1980s & older': 0
        };
        curItems.forEach(s => {
            const dec = classifyDecade(s.artist, s.album, s.track);
            decadesMap[dec] = (decadesMap[dec] || 0) + 1;
        });

        const decades = Object.entries(decadesMap).map(([decade, count]) => ({
            decade,
            count,
            pct: curTotal > 0 ? Math.round((count / curTotal) * 100) : 0
        }));

        // 8. LISTENING CLOCK (24 hours)
        const hourly = new Array(24).fill(0);
        curItems.forEach(s => {
            const h = new Date(s.date).getHours();
            if (h >= 0 && h < 24) hourly[h]++;
        });

        let peakHour = 9;
        let peakHourCount = 0;
        hourly.forEach((c, h) => {
            if (c > peakHourCount) {
                peakHourCount = c;
                peakHour = h;
            }
        });

        const periodLabel = peakHour >= 12 ? 'PM' : 'AM';
        const displayHour = peakHour % 12 === 0 ? 12 : peakHour % 12;
        const busiestHourStr = `${displayHour}:00 ${periodLabel} // ${peakHourCount} scrobbles`;

        // 9. QUICK FACTS
        const curMinutes = Math.round(curTotal * 3.4);
        const prevMinutes = Math.round(prevTotal * 3.4);

        function formatDuration(mins) {
            const totalHours = Math.floor(mins / 60);
            const d = Math.floor(totalHours / 24);
            const h = totalHours % 24;
            const parts = [];
            if (d > 0) parts.push(`${d} ${d === 1 ? 'DAY' : 'DAYS'}`);
            if (h > 0 || d === 0) parts.push(`${h} ${h === 1 ? 'HOUR' : 'HOURS'}`);
            return parts.join(', ');
        }

        const totalDaysCount = Math.max(1, Math.round((periodEnd - periodStart) / ONE_DAY_MS));
        const prevDaysCount = Math.max(1, Math.round((prevEnd - prevStart) / ONE_DAY_MS));

        const avgCurDay = Math.round(curTotal / totalDaysCount);
        const avgPrevDay = Math.round(prevTotal / prevDaysCount);

        const dS = new Date(periodStart);
        const dE = new Date(periodEnd - 1000);
        const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
        const fullPeriodLabel = targetInterval?.label || `${dS.getUTCDate()} ${months[dS.getUTCMonth()]} ${dS.getUTCFullYear()} — ${dE.getUTCDate()} ${months[dE.getUTCMonth()]} ${dE.getUTCFullYear()}`;

        return {
            reportType: reportType,
            period: {
                start: periodStart,
                end: periodEnd,
                fullLabel: fullPeriodLabel,
                shortLabel: targetInterval?.shortLabel || `${dS.getUTCDate()}.${String(dS.getUTCMonth()+1).padStart(2,'0')} — ${dE.getUTCDate()}.${String(dE.getUTCMonth()+1).padStart(2,'0')}`,
                targetInterval: targetInterval
            },
            hero: {
                scrobbles: curTotal,
                lastWeekScrobbles: prevTotal,
                delta: heroDelta,
                deltaVal: prevTotal > 0 ? Math.round(((curTotal - prevTotal) / prevTotal) * 100) : 0,
                days: days
            },
            topArtists: {
                uniqueCount: curArtistsMap.size,
                prevUniqueCount: prevArtistsMap.size,
                delta: artistsDelta,
                top1: sortedArtists[0] || null,
                top5: sortedArtists.slice(1, 5)
            },
            topAlbums: {
                uniqueCount: curAlbumsMap.size,
                prevUniqueCount: prevAlbumsMap.size,
                delta: albumsDelta,
                top1: sortedAlbums[0] || null,
                top5: sortedAlbums.slice(1, 5)
            },
            topTracks: {
                uniqueCount: curTracksMap.size,
                prevUniqueCount: prevTracksMap.size,
                delta: tracksDelta,
                top1: sortedTracks[0] || null,
                top5: sortedTracks.slice(1, 5)
            },
            newDiscoveries: {
                artists: {
                    count: newArtistsMap.size,
                    pct: newArtistsPct,
                    delta: formatDelta(newArtistsMap.size, prevNewArtists.size),
                    prevCount: prevNewArtists.size
                },
                albums: {
                    count: newAlbumsMap.size,
                    pct: newAlbumsPct,
                    delta: formatDelta(newAlbumsMap.size, prevNewAlbums.size),
                    prevCount: prevNewAlbums.size
                },
                tracks: {
                    count: newTracksMap.size,
                    pct: newTracksPct,
                    delta: formatDelta(newTracksMap.size, prevNewTracks.size),
                    prevCount: prevNewTracks.size
                },
                topNewArtist: sortedNewArtists[0] || null,
                topNewAlbum: sortedNewAlbums[0] || null,
                topNewTrack: sortedNewTracks[0] || null,
                allNewDiscoveries: {
                    artists: sortedNewArtists.slice(0, 3),
                    albums: sortedNewAlbums.slice(0, 3),
                    tracks: sortedNewTracks.slice(0, 3)
                }
            },
            musicRatio: {
                tracksPerArtist: {
                    cur: curTracksPerArtist,
                    prev: prevTracksPerArtist,
                    delta: formatDelta(curTracksPerArtist, prevTracksPerArtist)
                },
                scrobblesPerTrack: {
                    cur: curScrobblesPerTrack,
                    prev: prevScrobblesPerTrack,
                    delta: formatDelta(curScrobblesPerTrack, prevScrobblesPerTrack)
                },
                scrobblesPerAlbum: {
                    cur: curScrobblesPerAlbum,
                    prev: prevScrobblesPerAlbum,
                    delta: formatDelta(curScrobblesPerAlbum, prevScrobblesPerAlbum)
                }
            },
            fingerprint: {
                you: {
                    consistency: consistencyVal,
                    discoveryRate: discoveryRateVal,
                    variance: varianceVal,
                    concentration: concentrationVal,
                    replayRate: replayRateVal
                },
                average: ARCHIVE_RADAR_AVERAGE
            },
            genresStreamgraph: {
                streamDays: streamDays,
                genresSummary: genresSummary,
                colors: GENRE_TAG_COLORS
            },
            decades: decades,
            listeningClock: {
                hourly: hourly,
                busiestHour: peakHour,
                busiestHourStr: busiestHourStr,
                busiestCount: peakHourCount
            },
            quickFacts: {
                listeningTime: {
                    value: formatDuration(curMinutes),
                    prevValue: formatDuration(prevMinutes),
                    delta: formatDelta(curMinutes, prevMinutes)
                },
                averageScrobbles: {
                    value: `${avgCurDay} /DAY`,
                    prevValue: `${avgPrevDay}`,
                    delta: formatDelta(avgCurDay, avgPrevDay)
                },
                mostActiveDay: {
                    value: mostActiveDayObj ? `${mostActiveDayObj.count} (${mostActiveDayObj.dateStr})` : '—',
                    prevValue: `${prevPeakDayCount}`,
                    delta: formatDelta(maxDayScrobbles, prevPeakDayCount, true)
                }
            }
        };
    }

    function computeWeeklyReport(scrobbles, targetInterval) {
        return computeReport(scrobbles, targetInterval, 'WEEK');
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
        formatRelativeDate: formatRelativeDate,
        // Last.fm report suite:
        GENRE_TAG_COLORS: GENRE_TAG_COLORS,
        classifyGenre: classifyGenre,
        classifyDecade: classifyDecade,
        ARCHIVE_RADAR_AVERAGE: ARCHIVE_RADAR_AVERAGE,
        buildWeeklyIntervals: buildWeeklyIntervals,
        buildMonthlyIntervals: buildMonthlyIntervals,
        buildYearlyIntervals: buildYearlyIntervals,
        computeReport: computeReport,
        computeWeeklyReport: computeWeeklyReport
    };
}));
