/**
 * =========================================================================
 * STATIC CONFIGURATION & CORE UTILITIES FOR PRUUSHKAA // ARCHIVE_OS
 * =========================================================================
 * Unified static configuration and utility functions shared across
 * index.html, music.html and background scripts.
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

// 2. Shared Web Audio Sound Engine
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx && typeof window !== 'undefined') {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playHover() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(140, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(45, this.ctx.currentTime + 0.025);
            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.025);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.025);
        } catch (_) {}
    }

    playClick() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(280, this.ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.045);
            gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.045);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.045);
        } catch (_) {}
    }

    playSuccess() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            [523.25, 659.25, 783.99].forEach((freq, idx) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now + idx * 0.055);
                gain.gain.setValueAtTime(0.07, now + idx * 0.055);
                gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.055 + 0.12);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start(now + idx * 0.055);
                osc.stop(now + idx * 0.055 + 0.12);
            });
        } catch (_) {}
    }

    playWarning() {
        if (!this.enabled) return;
        try {
            this.init();
            if (!this.ctx) return;
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.setValueAtTime(160, now + 0.08);
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(now);
            osc.stop(now + 0.2);
        } catch (_) {}
    }
}

// 3. Shared Utilities Export
const sfxInstance = new SoundEngine();

window.APP_UTILS = {
    SoundEngine,
    sfx: sfxInstance,

    // Glitch event dispatcher
    triggerGlitchSpike(intensity = 1) {
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('glitch-spike', { detail: { intensity } }));
        }
    },

    // Format duration in seconds to M:SS
    formatTime(seconds) {
        if (isNaN(seconds) || seconds === null || seconds === undefined) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    },

    // Safe clipboard copy
    copyTextToClipboard(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
            }
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(textArea);
            return Promise.resolve(ok);
        } catch (_) {
            return Promise.resolve(false);
        }
    },

    // Unified iTunes sample search
    async fetchTrackPreview(artist, title) {
        if (!artist && !title) return null;
        try {
            const q = encodeURIComponent(`${artist || ''} ${title || ''}`.trim());
            const base = (window.APP_CONFIG && window.APP_CONFIG.ITUNES_SEARCH_BASE) || 'https://itunes.apple.com/search';
            const res = await fetch(`${base}?term=${q}&entity=song&limit=1`);
            if (!res.ok) return null;
            const data = await res.json();
            return data?.results?.[0]?.previewUrl || null;
        } catch (_) {
            return null;
        }
    }
};

// Global backward-compatible aliases
if (typeof window !== 'undefined') {
    window.sfx = sfxInstance;
    window.triggerGlitchSpike = window.APP_UTILS.triggerGlitchSpike;
    window.copyTextToClipboard = window.APP_UTILS.copyTextToClipboard;
}

// Protect configuration from accidental mutations
if (typeof Object.freeze === 'function') {
    Object.freeze(window.APP_CONFIG);
    if (window.APP_CONFIG.SOCIAL_LINKS) Object.freeze(window.APP_CONFIG.SOCIAL_LINKS);
    if (window.APP_CONFIG.DATA_PATHS) Object.freeze(window.APP_CONFIG.DATA_PATHS);
    if (window.APP_CONFIG.THEME) Object.freeze(window.APP_CONFIG.THEME);
}
