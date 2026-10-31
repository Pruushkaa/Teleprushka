/**
 * PRUUSHKAA // GPX UTILS
 * Расчёт телеметрии GPX-трека. Один код для браузера (window.GpxUtils)
 * и для Node-скриптов сборки (scripts/sync-tracks.mjs загружает этот файл).
 */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.GpxUtils = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    const EARTH_RADIUS_M = 6371000;
    const toRad = (x) => (x * Math.PI) / 180;

    function haversineMeters(lat1, lon1, lat2, lon2) {
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // 3725 → "1ч 2м"; с withSeconds: 125 → "2м 5с", 40 → "40с"
    function formatDuration(totalSec, withSeconds) {
        const h = Math.floor(totalSec / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        if (h > 0) return `${h}ч ${m}м`;
        if (!withSeconds) return `${m}м`;
        return m > 0 ? `${m}м ${s}с` : `${s}с`;
    }

    function parseTrackPoints(xml) {
        const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
        const points = [];
        let match;
        while ((match = trkptRegex.exec(xml || '')) !== null) {
            const lat = parseFloat(match[1]);
            const lon = parseFloat(match[2]);
            const eleMatch = match[3].match(/<ele>([^<]+)<\/ele>/i);
            const timeMatch = match[3].match(/<time>([^<]+)<\/time>/i);
            if (!isNaN(lat) && !isNaN(lon)) {
                points.push({
                    lat,
                    lon,
                    ele: eleMatch ? parseFloat(eleMatch[1]) : null,
                    time: timeMatch ? new Date(timeMatch[1]).getTime() : null
                });
            }
        }
        return points;
    }

    // { distanceKm, elevationGainM, movingTime } или null, если точек меньше двух
    function calculateTelemetry(xml) {
        const points = parseTrackPoints(xml);
        if (points.length < 2) return null;

        let totalDist = 0;
        let elevationGain = 0;
        for (let i = 1; i < points.length; i++) {
            const p1 = points[i - 1];
            const p2 = points[i];
            totalDist += haversineMeters(p1.lat, p1.lon, p2.lat, p2.lon);
            if (p1.ele !== null && p2.ele !== null && p2.ele > p1.ele) {
                elevationGain += p2.ele - p1.ele;
            }
        }

        const firstTime = points[0].time;
        const lastTime = points[points.length - 1].time;
        const movingTime = firstTime && lastTime && lastTime > firstTime
            ? formatDuration(Math.round((lastTime - firstTime) / 1000), false)
            : '--';

        return {
            distanceKm: parseFloat((totalDist / 1000).toFixed(1)),
            elevationGainM: Math.round(elevationGain),
            movingTime
        };
    }

    return { haversineMeters, formatDuration, parseTrackPoints, calculateTelemetry };
}));
