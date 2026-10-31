import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.resolve(__dirname, '..', 'index.html');

let raw = fs.readFileSync(indexPath, 'utf8');
const isCrlf = raw.includes('\r\n');
let content = raw.replace(/\r\n/g, '\n');

// 1. Add direct button in LastFmWidget header
const widgetHeaderTarget = `{apiStatus === 'LIVE' ? (
                                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold px-2.5 py-0.5 border-2 border-black bg-[#CCFF00] text-black">
                                    <span className="w-2 h-2 rounded-full bg-black animate-ping"></span>
                                    СЕЙЧАС ИГРАЕТ // NOW PLAYING
                                </span>`;

const widgetHeaderReplacement = `<a
                                    href="music.html"
                                    className="brutal-btn bg-black text-[#CCFF00] hover:bg-[#FF5722] hover:text-white px-2.5 py-0.5 font-mono text-[11px] font-black uppercase flex items-center gap-1.5 transition-colors shadow-[2px_2px_0px_#000]"
                                    title="Открыть полную аналитику 40,000+ скробблов"
                                >
                                    <i className="fa-solid fa-chart-line"></i>
                                    <span>АНАЛИТИКА (40K+)</span>
                                    <i className="fa-solid fa-arrow-right text-[9px]"></i>
                                </a>

                                ` + widgetHeaderTarget;

if (content.includes(widgetHeaderTarget) && !content.includes('АНАЛИТИКА (40K+)')) {
    content = content.replace(widgetHeaderTarget, widgetHeaderReplacement);
    console.log('✔ Patched LastFmWidget header with analytics link');
}

// 2. Uniform tabs in navbar
const navBlockRegex = /<nav className="brutal-card p-2\.5 mb-6 bg-white text-black flex flex-wrap items-center justify-between gap-2 font-mono text-xs">[\s\S]*?<\/div>\s*<\/div>/;

const navBlockReplacement = `<nav className="brutal-card p-2.5 mb-6 bg-white text-black flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
                        <div className="flex flex-wrap items-center gap-2">
                            {[
                                { id: 'HOME', label: 'ГЛАВНАЯ // МУЗЫКА И СОЦСЕТИ', icon: 'fa-compact-disc' },
                                { id: 'MUSIC', label: 'МУЗЫКА // АНАЛИТИКА (40K)', icon: 'fa-chart-pie', href: 'music.html' },
                                { id: 'TRACKS', label: \`МАРШРУТЫ // GPX (\${tracks.length})\`, icon: 'fa-map-location-dot' },
                                { id: 'PHOTOS', label: \`ФОТОАРХИВ (\${photos.length})\`, icon: 'fa-camera-retro' },
                                { id: 'WIKI', label: \`ВИКИ СРП (\${wikiArticles.length})\`, icon: 'fa-book-journal-whills' },
                                { id: 'TOOLS', label: 'ТЕРМИНАЛ УТИЛИТ', icon: 'fa-screwdriver-wrench' }
                            ].map((tab) => (
                                tab.href ? (
                                    <a
                                        key={tab.id}
                                        href={tab.href}
                                        onClick={() => {
                                            sfx.playClick();
                                            triggerGlitchSpike(0.5);
                                        }}
                                        onMouseEnter={() => sfx.playHover()}
                                        className="brutal-btn px-3 py-1.5 font-extrabold uppercase flex items-center gap-1.5 bg-[#F4F0EA] text-black hover:bg-[#CCFF00]"
                                        title="Полноценная страница музыкальной аналитики"
                                    >
                                        <i className={\`fa-solid \${tab.icon} text-[#FF5722]\`}></i>
                                        <span>{tab.label}</span>
                                        <span className="text-[10px] bg-black text-[#CCFF00] px-1 py-0.2">NEW</span>
                                    </a>
                                ) : (
                                    <button
                                        key={tab.id}
                                        onClick={() => {
                                            sfx.playClick();
                                            setActiveSection(tab.id);
                                            triggerGlitchSpike(0.5);
                                        }}
                                        onMouseEnter={() => sfx.playHover()}
                                        className={\`brutal-btn px-3 py-1.5 font-extrabold uppercase flex items-center gap-1.5 \${
                                            activeSection === tab.id ? 'bg-[#FF5722] text-white shadow-[3px_3px_0px_#000]' : 'bg-[#F4F0EA] text-black'
                                        }\`}
                                    >
                                        <i className={\`fa-solid \${tab.icon}\`}></i>
                                        <span>{tab.label}</span>
                                    </button>
                                )
                            ))}
                        </div>`;

if (navBlockRegex.test(content)) {
    content = content.replace(navBlockRegex, navBlockReplacement);
    console.log('✔ Patched Navigation menu with inline MUSIC tab');
}

if (isCrlf) {
    content = content.replace(/\n/g, '\r\n');
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log('index.html updated.');
