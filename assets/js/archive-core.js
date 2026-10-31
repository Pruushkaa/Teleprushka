/**
 * =========================================================================
 * PRUUSHKAA // ARCHIVE_OS — ОБЩЕЕ ЯДРО ДЛЯ ВСЕХ СТРАНИЦ
 * =========================================================================
 * Код, который раньше был скопирован в index.html и music.html:
 * конфиг, звуковой движок, глитч-фон, буфер обмена, скачивание файлов,
 * загрузка JSON с запасными адресами, поиск 30-секундных сэмплов iTunes.
 *
 * Обычный JS без JSX — подключается тегом <script> после React,
 * поэтому работает и при открытии страницы через file://.
 * Всё доступно как window.ArchiveCore.
 */
(function (global) {
    'use strict';

    /* ---------------------------------------------------------------------
       1. КОНФИГ (config.js → window.APP_CONFIG, иначе — встроенные значения)
       --------------------------------------------------------------------- */
    const DEFAULT_CONFIG = {
        LASTFM_USER: 'Pruushkaa',
        LASTFM_API_KEY: '684b6a85757601272919018585e32a99',
        LASTFM_POLL_INTERVAL_MS: 15000,
        DISCORD_USER_ID: '655742532772429834',
        DISCORD_TAG: 'pruushkaa',
        DISCORD_POLL_INTERVAL_MS: 15000,
        DEFAULT_DISCORD_STATUS: 'offline',
        DEFAULT_DISCORD_TEXT: 'Автономный режим',
        DEFAULT_ADMIN_PASSWORD: 'admin',
        SOCIAL_LINKS: {
            TELEGRAM_PERSONAL: 'https://t.me/pruushkaa',
            TELEGRAM_CHANNEL: 'https://t.me/pruuushkaa',
            STEAM: 'https://steamcommunity.com/profiles/76561198905010186/',
            TWITTER: 'https://x.com/LeraSemen0va',
            LASTFM: 'https://www.last.fm/user/pruushkaa'
        }
    };
    const CONFIG = global.APP_CONFIG || DEFAULT_CONFIG;

    /* ---------------------------------------------------------------------
       2. ПРОЦЕДУРНЫЙ ЗВУК (Web Audio API)
       У страниц немного разные «тембры» — они заданы профилями.
       --------------------------------------------------------------------- */
    const SOUND_PROFILES = {
        main: {
            hoverGain: 0.04,
            click: { from: 280, to: 80, gain: 0.08, duration: 0.045 },
            successGain: 0.07
        },
        music: {
            hoverGain: 0.03,
            click: { from: 260, to: 70, gain: 0.06, duration: 0.04 },
            successGain: 0.06
        }
    };

    // Аккорды для синтезированного «сэмпла», если iTunes недоступен (A minor / пентатоника)
    const MELODIC_CHORDS = [
        [440, 523.25, 659.25, 783.99, 880],
        [349.23, 440, 523.25, 659.25, 698.46],
        [392, 493.88, 587.33, 698.46, 783.99],
        [329.63, 392, 493.88, 587.33, 659.25]
    ];

    class SoundEngine {
        constructor(profileName) {
            this.ctx = null;
            this.enabled = true;
            this.profile = SOUND_PROFILES[profileName] || SOUND_PROFILES.main;
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

        // Один тон: частота (с плавным спадом до freqEnd), громкость, длительность, старт
        tone(type, freq, freqEnd, gainValue, duration, startAt) {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, startAt);
            if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, startAt + duration);
            gain.gain.setValueAtTime(gainValue, startAt);
            gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startAt);
            osc.stop(startAt + duration);
            return osc;
        }

        // Обёртка для коротких эффектов: учитывает флаг enabled и глушит ошибки аудио
        play(fn) {
            if (!this.enabled) return;
            try {
                this.init();
                if (!this.ctx) return;
                fn(this.ctx.currentTime);
            } catch (e) {}
        }

        playHover() {
            this.play((now) => this.tone('triangle', 140, 45, this.profile.hoverGain, 0.025, now));
        }

        playClick() {
            const c = this.profile.click;
            this.play((now) => this.tone('square', c.from, c.to, c.gain, c.duration, now));
        }

        playSuccess() {
            this.play((now) => {
                [523.25, 659.25, 783.99].forEach((freq, idx) => {
                    this.tone('sine', freq, null, this.profile.successGain, 0.12, now + idx * 0.055);
                });
            });
        }

        // 32 ноты арпеджио (~7 сек). Возвращает { stop } или null, если аудио недоступно
        playMelodicSample(patternIdx = 0) {
            this.init();
            if (!this.ctx) return null;
            const now = this.ctx.currentTime;
            const scale = MELODIC_CHORDS[patternIdx % MELODIC_CHORDS.length];
            const notes = [];
            for (let i = 0; i < 32; i++) {
                const type = i % 2 === 0 ? 'sine' : 'triangle';
                notes.push(this.tone(type, scale[i % scale.length], null, 0.05, 0.2, now + i * 0.22));
            }
            return {
                stop: () => notes.forEach((osc) => { try { osc.stop(); } catch (err) {} })
            };
        }
    }

    /* ---------------------------------------------------------------------
       3. ГЛИТЧ-ФОН (canvas с сеткой и случайными цветными полосами)
       --------------------------------------------------------------------- */
    function triggerGlitchSpike(intensity = 1) {
        window.dispatchEvent(new CustomEvent('glitch-spike', { detail: { intensity } }));
    }

    const GLITCH_COLORS = ['#FF5722', '#CCFF00', '#00E5FF', '#000000'];
    const GLITCH_PROFILES = {
        main: {
            gridColor: (dark) => (dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.05)'),
            strokeEachLine: true,
            pauseWhenHidden: true,
            spikeScale: 18,
            spikeDecay: 1,
            maxBarHeight: 14,
            barStyle: (dark, spiking) => ({
                fill: GLITCH_COLORS[Math.floor(Math.random() * GLITCH_COLORS.length)],
                alpha: spiking ? 0.35 : 0.12
            }),
            style: undefined
        },
        music: {
            gridColor: (dark) => (dark ? 'rgba(255, 87, 34, 0.04)' : 'rgba(0, 0, 0, 0.03)'),
            strokeEachLine: false,
            pauseWhenHidden: false,
            spikeScale: 14,
            spikeDecay: 0.6,
            maxBarHeight: 12,
            barStyle: (dark) => ({
                fill: Math.random() > 0.4
                    ? (dark ? 'rgba(204, 255, 0, 0.25)' : 'rgba(255, 87, 34, 0.22)')
                    : (dark ? 'rgba(0, 229, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)'),
                alpha: 1
            }),
            style: { opacity: 0.85 }
        }
    };

    function drawGrid(ctx, canvas, p, darkMode) {
        const gridSize = 48;
        ctx.strokeStyle = p.gridColor(darkMode);
        ctx.lineWidth = 1;
        const line = (x1, y1, x2, y2) => {
            if (p.strokeEachLine) ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            if (p.strokeEachLine) ctx.stroke();
        };
        if (!p.strokeEachLine) ctx.beginPath();
        for (let x = 0; x < canvas.width; x += gridSize) line(x, 0, x, canvas.height);
        for (let y = 0; y < canvas.height; y += gridSize) line(0, y, canvas.width, y);
        if (!p.strokeEachLine) ctx.stroke();
    }

    function GlitchCanvas({ darkMode, variant = 'main' }) {
        const canvasRef = React.useRef(null);
        const spikeRef = React.useRef(0);
        const p = GLITCH_PROFILES[variant] || GLITCH_PROFILES.main;

        React.useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            let animationFrameId;

            const handleResize = () => {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            };
            handleResize();
            window.addEventListener('resize', handleResize);

            const handleSpike = (e) => {
                spikeRef.current = ((e.detail && e.detail.intensity) || 1) * p.spikeScale;
            };
            window.addEventListener('glitch-spike', handleSpike);

            const render = () => {
                if (!(p.pauseWhenHidden && document.hidden)) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawGrid(ctx, canvas, p, darkMode);

                    const isSpiking = spikeRef.current > 0;
                    if (Math.random() < (isSpiking ? 0.85 : 0.03)) {
                        const count = isSpiking ? Math.ceil(spikeRef.current / 3) : 1;
                        for (let i = 0; i < count; i++) {
                            const gx = Math.random() * canvas.width;
                            const gy = Math.random() * canvas.height;
                            const gw = 40 + Math.random() * 220;
                            const gh = 2 + Math.random() * p.maxBarHeight;
                            const bar = p.barStyle(darkMode, isSpiking);
                            ctx.fillStyle = bar.fill;
                            ctx.globalAlpha = bar.alpha;
                            ctx.fillRect(gx, gy, gw, gh);
                            ctx.globalAlpha = 1.0;
                        }
                    }

                    if (spikeRef.current > 0) {
                        spikeRef.current = Math.max(0, spikeRef.current - p.spikeDecay);
                    }
                }
                animationFrameId = requestAnimationFrame(render);
            };

            render();
            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('glitch-spike', handleSpike);
                cancelAnimationFrame(animationFrameId);
            };
        }, [darkMode]);

        return React.createElement('canvas', {
            ref: canvasRef,
            className: 'fixed inset-0 pointer-events-none z-0',
            style: p.style
        });
    }

    /* ---------------------------------------------------------------------
       4. УТИЛИТЫ
       --------------------------------------------------------------------- */
    function copyTextToClipboard(text) {
        try {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (err) {
            return false;
        }
    }

    // Скачать содержимое (строку/Blob) как файл
    function downloadFile(content, fileName, mimeType) {
        const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        downloadUrl(url, fileName);
        URL.revokeObjectURL(url);
    }

    // Скачать файл по ссылке
    function downloadUrl(href, fileName) {
        const a = document.createElement('a');
        a.href = href;
        a.download = fileName;
        a.click();
    }

    // 125 → "2:05"
    function formatClock(sec) {
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }

    // Перебирает адреса по очереди и возвращает первый корректный JSON (или null)
    async function fetchFirstJson(urls, { init, accept } = {}) {
        for (const url of urls) {
            try {
                const res = await fetch(url, init);
                if (!res.ok) continue;
                const data = await res.json();
                if (!accept || accept(data)) return data;
            } catch (e) {}
        }
        return null;
    }

    // URL 30-секундного превью трека из iTunes (или null). Сетевые ошибки пробрасываются.
    async function fetchItunesPreview(artist, title) {
        const query = encodeURIComponent(`${artist} ${title}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=song&limit=1`);
        const data = await res.json();
        return (data && data.results && data.results[0] && data.results[0].previewUrl) || null;
    }

    global.ArchiveCore = {
        CONFIG,
        SoundEngine,
        triggerGlitchSpike,
        GlitchCanvas,
        copyTextToClipboard,
        downloadFile,
        downloadUrl,
        formatClock,
        fetchFirstJson,
        fetchItunesPreview
    };
}(window));
