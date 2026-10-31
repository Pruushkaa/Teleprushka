/**
 * =========================================================================
 * STATIC CONFIGURATION FOR TELEPRUSHKA / ARCHIVE_OS
 * =========================================================================
 * Этот файл содержит статические константы владельца профиля.
 * Значения доступны для всех посетителей сайта без использования localStorage/sessionStorage.
 */
window.APP_CONFIG = {
    // 1. Last.fm Live Scrobbler
    // Получить бесплатный API-ключ: https://www.last.fm/api/account/create
    LASTFM_USER: 'Pruushkaa',
    LASTFM_API_KEY: '684b6a85757601272919018585e32a99',
    LASTFM_POLL_INTERVAL_MS: 15000,

    // 2. Discord Lanyard Live Status
    // Discord Snowflake ID: 655742532772429834
    // Мониторинг активен через: https://api.lanyard.rest/v1/users/655742532772429834
    DISCORD_USER_ID: '655742532772429834',
    DISCORD_TAG: 'pruushkaa',
    DISCORD_POLL_INTERVAL_MS: 15000,
    DEFAULT_DISCORD_STATUS: 'offline',
    DEFAULT_DISCORD_TEXT: 'Автономный режим',

    // 3. Административный пароль по умолчанию
    DEFAULT_ADMIN_PASSWORD: 'admin',

    // 4. Социальные ссылки
    SOCIAL_LINKS: {
        TELEGRAM_PERSONAL: 'https://t.me/pruushkaa',
        TELEGRAM_CHANNEL: 'https://t.me/pruuushkaa',
        STEAM: 'https://steamcommunity.com/profiles/76561198905010186/',
        TWITTER: 'https://x.com/LeraSemen0va',
        LASTFM: 'https://www.last.fm/user/pruushkaa'
    }
};

// Защита от случайных мутаций
if (typeof Object.freeze === 'function') {
    Object.freeze(window.APP_CONFIG);
    if (window.APP_CONFIG.SOCIAL_LINKS) {
        Object.freeze(window.APP_CONFIG.SOCIAL_LINKS);
    }
}
