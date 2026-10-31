/**
 * =========================================================================
 * STATIC CONFIGURATION FOR PRUUSHKAA // ARCHIVE_OS
 * =========================================================================
 * Unified static configuration shared across index.html, music.html and background scripts.
 */

// 1. Static Configuration Object
window.APP_CONFIG = {
    // Last.fm Scrobbler API (Public Hybrid Sync & Live Polling)
    LASTFM_USER: 'Pruushkaa',
    // Публичный API-ключ Last.fm для живого обновления статистики и опроса текущего трека
    // Бесплатная регистрация: https://www.last.fm/api/account/create
    LASTFM_API_KEY: '684b6a85757601272919018585e32a99',
    LASTFM_POLL_INTERVAL_MS: 30000, // Интервал опроса Now Playing: 30 секунд
    LASTFM_API_BASE: 'https://ws.audioscrobbler.com/2.0/',

    // iTunes Preview API
    ITUNES_SEARCH_BASE: 'https://itunes.apple.com/search',

    // Discord Lanyard Gateway
    DISCORD_USER_ID: '655742532772429834',
    DISCORD_TAG: 'pruushkaa',
    DISCORD_POLL_INTERVAL_MS: 15000,
    DISCORD_LANYARD_BASE: 'https://api.lanyard.rest/v1/users/',
    DEFAULT_DISCORD_STATUS: 'offline',
    DEFAULT_DISCORD_TEXT: 'Автономный режим',

    // Administrative access
    DEFAULT_ADMIN_PASSWORD: 'admin',

    // Relative data endpoints (GitHub Pages compatible)
    API_BASE: '',
    DATA_PATHS: {
        TRACKS_MANIFEST: './public/tracks/manifest.json',
        TRACKS_FALLBACK: './tracks.json',
        DATABASE_JSON: './database.json',
        MUSIC_SUMMARY: './public/data/music-summary.json',
        MUSIC_SUMMARY_FALLBACK: './data/music-summary.json',
        LASTFM_STATS: './public/data/lastfmstats-Pruushkaa.json',
        LASTFM_STATS_FALLBACK: './data/lastfmstats-Pruushkaa.json'
    },

    // Design System Tokens
    THEME: {
        BG_MAIN_LIGHT: '#F4F0EA',
        BG_MAIN_DARK: '#0D0E12',
        ACCENT_ORANGE: '#FF5722',
        ACCENT_LIME: '#CCFF00',
        ACCENT_CYAN: '#00E5FF',
        ACCENT_VIOLET: '#B388FF',
        DARK: '#121212'
    },

    // Social Links
    SOCIAL_LINKS: {
        TELEGRAM_PERSONAL: 'https://t.me/pruushkaa',
        TELEGRAM_CHANNEL: 'https://t.me/pruuushkaa',
        STEAM: 'https://steamcommunity.com/profiles/76561198905010186/',
        TWITTER: 'https://x.com/LeraSemen0va',
        LASTFM: 'https://www.last.fm/user/pruushkaa'
    }
};

// Protect configuration from accidental mutations
if (typeof Object.freeze === 'function') {
    Object.freeze(window.APP_CONFIG);
    if (window.APP_CONFIG.SOCIAL_LINKS) Object.freeze(window.APP_CONFIG.SOCIAL_LINKS);
    if (window.APP_CONFIG.DATA_PATHS) Object.freeze(window.APP_CONFIG.DATA_PATHS);
    if (window.APP_CONFIG.THEME) Object.freeze(window.APP_CONFIG.THEME);
}
