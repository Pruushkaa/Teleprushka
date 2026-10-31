import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('[OG-GEN] Initializing Open Graph Banner Generator (1200x630)...');

const SITE_TITLE = 'PRUUSHKAA';
const SITE_SUBTITLE = '// ARCHIVE_OS';
const TAGLINE_RU_1 = 'Интерактивные GPX-маршруты, цифровая картография,';
const TAGLINE_RU_2 = 'музыкальная аналитика Last.fm и инженерный архив.';
const CANONICAL_URL = 'https://pruushkaa.github.io/Teleprushka/';

function buildSvg() {
    return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0C10" />
      <stop offset="45%" stop-color="#10131B" />
      <stop offset="100%" stop-color="#0C0E14" />
    </linearGradient>

    <!-- Accent Radial Glows -->
    <radialGradient id="orangeGlow" cx="15%" cy="18%" r="48%">
      <stop offset="0%" stop-color="#FF5722" stop-opacity="0.16" />
      <stop offset="60%" stop-color="#FF5722" stop-opacity="0.04" />
      <stop offset="100%" stop-color="#FF5722" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="limeGlow" cx="88%" cy="88%" r="45%">
      <stop offset="0%" stop-color="#CCFF00" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#CCFF00" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="cyanGlow" cx="82%" cy="22%" r="35%">
      <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.10" />
      <stop offset="100%" stop-color="#00E5FF" stop-opacity="0" />
    </radialGradient>

    <!-- Dot Grid Pattern -->
    <pattern id="dotGrid" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#FFFFFF" fill-opacity="0.06" />
    </pattern>

    <!-- Linear Grid Pattern -->
    <pattern id="lineGrid" width="56" height="56" patternUnits="userSpaceOnUse">
      <path d="M 56 0 L 0 0 0 56" fill="none" stroke="#FFFFFF" stroke-width="1" stroke-opacity="0.02" />
    </pattern>

    <!-- GPX Wave Gradient -->
    <linearGradient id="gpxAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.40" />
      <stop offset="65%" stop-color="#00E5FF" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#00E5FF" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Base Background & Ambient Lighting -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#orangeGlow)" />
  <rect width="1200" height="630" fill="url(#limeGlow)" />
  <rect width="1200" height="630" fill="url(#cyanGlow)" />

  <!-- Cyber Grid Overlays -->
  <rect width="1200" height="630" fill="url(#lineGrid)" />
  <rect width="1200" height="630" fill="url(#dotGrid)" />

  <!-- Technical Outer Borders & Corner Brackets -->
  <rect x="22" y="22" width="1156" height="586" fill="none" stroke="#252A38" stroke-width="2" />
  <rect x="26" y="26" width="1148" height="578" fill="none" stroke="#151722" stroke-width="1" />

  <!-- Heavy Brutalist Corner L-Brackets -->
  <!-- Top Left -->
  <path d="M 18 46 L 18 18 L 46 18" fill="none" stroke="#FF5722" stroke-width="4" stroke-linecap="square" />
  <!-- Bottom Left -->
  <path d="M 18 584 L 18 612 L 46 612" fill="none" stroke="#CCFF00" stroke-width="4" stroke-linecap="square" />
  <!-- Top Right -->
  <path d="M 1154 18 L 1182 18 L 1182 46" fill="none" stroke="#CCFF00" stroke-width="4" stroke-linecap="square" />
  <!-- Bottom Right -->
  <path d="M 1182 584 L 1182 612 L 1154 612" fill="none" stroke="#FF5722" stroke-width="4" stroke-linecap="square" />

  <!-- Corner Crosshairs -->
  <g stroke="#3D4559" stroke-width="1.5">
    <line x1="16" y1="18" x2="8" y2="18" />
    <line x1="18" y1="16" x2="18" y2="8" />
    <line x1="1184" y1="18" x2="1192" y2="18" />
    <line x1="1182" y1="16" x2="1182" y2="8" />
  </g>

  <!-- ================= TOP HEADER BAR ================= -->
  <!-- Monospace Status Badge -->
  <g transform="translate(52, 46)">
    <!-- Hard Black Shadow -->
    <rect x="4" y="4" width="310" height="34" fill="#000000" />
    <!-- Main Box -->
    <rect x="0" y="0" width="310" height="34" fill="#11131B" stroke="#CCFF00" stroke-width="2" />
    <!-- Pulsing Green Indicator -->
    <circle cx="18" cy="17" r="5" fill="#CCFF00" />
    <circle cx="18" cy="17" r="8" fill="#CCFF00" fill-opacity="0.3" />
    <!-- Status Text -->
    <text x="34" y="22" fill="#CCFF00" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" letter-spacing="1.5">SYSTEM: ONLINE // TELEMETRY READY</text>
  </g>

  <!-- Top Right Telemetry & Status Badges -->
  <g transform="translate(710, 48)">
    <text x="436" y="16" text-anchor="end" fill="#8890A6" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="600" letter-spacing="1">ARCHIVE_OS v3.1 // SYS_ID: 655742532772429834</text>
    <!-- Brutalist Color Swatches -->
    <g transform="translate(346, 23)">
      <rect x="0" y="0" width="15" height="7" fill="#FF5722" />
      <rect x="18" y="0" width="15" height="7" fill="#CCFF00" />
      <rect x="36" y="0" width="15" height="7" fill="#00E5FF" />
      <rect x="54" y="0" width="15" height="7" fill="#B388FF" />
      <rect x="72" y="0" width="15" height="7" fill="#FFFFFF" />
    </g>
  </g>

  <!-- Top Divider -->
  <line x1="52" y1="98" x2="1146" y2="98" stroke="#252A38" stroke-width="1" stroke-dasharray="6,4" />

  <!-- ================= LEFT COLUMN: HERO IDENTITY ================= -->
  <!-- Kicker Pill Tag -->
  <g transform="translate(52, 122)">
    <rect x="3" y="3" width="280" height="28" fill="#000000" />
    <rect x="0" y="0" width="280" height="28" fill="#FF5722" stroke="#000000" stroke-width="2" />
    <text x="14" y="19" fill="#FFFFFF" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" letter-spacing="1.5">INDUSTRIAL DIGITAL ARCHIVE</text>
  </g>

  <!-- Massive Hero Headline -->
  <g transform="translate(52, 232)">
    <!-- PRUUSHKAA Shadow & Main Text -->
    <text x="5" y="5" fill="#000000" font-family="'Segoe UI', Arial, sans-serif" font-size="80" font-weight="900" letter-spacing="-1">${SITE_TITLE}</text>
    <text x="0" y="0" fill="#FFFFFF" font-family="'Segoe UI', Arial, sans-serif" font-size="80" font-weight="900" letter-spacing="-1">${SITE_TITLE}</text>

    <!-- ARCHIVE_OS Line & v3.1 Badge -->
    <g transform="translate(0, 68)">
      <text x="4" y="4" fill="#000000" font-family="'Segoe UI', Arial, sans-serif" font-size="52" font-weight="800" letter-spacing="-0.5">${SITE_SUBTITLE}</text>
      <text x="0" y="0" fill="#CCFF00" font-family="'Segoe UI', Arial, sans-serif" font-size="52" font-weight="800" letter-spacing="-0.5">${SITE_SUBTITLE}</text>

      <!-- Badge positioned cleanly to the right of ARCHIVE_OS -->
      <g transform="translate(425, -34)">
        <rect x="2" y="2" width="68" height="30" fill="#000000" />
        <rect x="0" y="0" width="68" height="30" fill="#FF5722" stroke="#000000" stroke-width="2" />
        <text x="34" y="20" text-anchor="middle" fill="#FFFFFF" font-family="Consolas, 'Courier New', monospace" font-size="14" font-weight="bold">v3.1</text>
      </g>
    </g>
  </g>

  <!-- Positioning Tagline in Russian -->
  <g transform="translate(52, 355)">
    <text x="0" y="0" fill="#E2E6F0" font-family="'Segoe UI', Arial, sans-serif" font-size="21" font-weight="600">
      ${TAGLINE_RU_1}
    </text>
    <text x="0" y="32" fill="#9AA1B5" font-family="'Segoe UI', Arial, sans-serif" font-size="19" font-weight="400">
      ${TAGLINE_RU_2}
    </text>
  </g>

  <!-- Brutalist Feature Pills -->
  <g transform="translate(52, 442)">
    <!-- Pill 1: Routes / GPX -->
    <g transform="translate(0, 0)">
      <rect x="4" y="4" width="186" height="42" fill="#000000" />
      <rect x="0" y="0" width="186" height="42" fill="#FF5722" stroke="#000000" stroke-width="2" />
      <text x="14" y="26" fill="#FFFFFF" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" letter-spacing="0.5">[ ROUTES / TRACKS ]</text>
    </g>

    <!-- Pill 2: Last.fm Analytics -->
    <g transform="translate(202, 0)">
      <rect x="4" y="4" width="224" height="42" fill="#000000" />
      <rect x="0" y="0" width="224" height="42" fill="#CCFF00" stroke="#000000" stroke-width="2" />
      <text x="14" y="26" fill="#000000" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" letter-spacing="0.5">[ LAST.FM 40K+ STATS ]</text>
    </g>

    <!-- Pill 3: Dev Deck -->
    <g transform="translate(442, 0)">
      <rect x="4" y="4" width="190" height="42" fill="#000000" />
      <rect x="0" y="0" width="190" height="42" fill="#00E5FF" stroke="#000000" stroke-width="2" />
      <text x="14" y="26" fill="#000000" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="bold" letter-spacing="0.5">[ DEV DECK / UTILITY ]</text>
    </g>
  </g>

  <!-- ================= RIGHT COLUMN: TELEMETRY HUD CARD ================= -->
  <g transform="translate(710, 122)">
    <!-- Brutalist Heavy Card Frame with Orange Offset Shadow -->
    <rect x="8" y="8" width="436" height="380" fill="#FF5722" />
    <rect x="0" y="0" width="436" height="380" fill="#12141D" stroke="#000000" stroke-width="3" />

    <!-- Card Window Header -->
    <rect x="0" y="0" width="436" height="38" fill="#090A0F" stroke="#000000" stroke-width="2" />
    <!-- Window Control Squares -->
    <rect x="14" y="13" width="12" height="12" fill="#FF5722" stroke="#000000" stroke-width="1.5" />
    <rect x="34" y="13" width="12" height="12" fill="#CCFF00" stroke="#000000" stroke-width="1.5" />
    <rect x="54" y="13" width="12" height="12" fill="#00E5FF" stroke="#000000" stroke-width="1.5" />
    <!-- Window Title -->
    <text x="78" y="24" fill="#A0A5B5" font-family="Consolas, 'Courier New', monospace" font-size="11" font-weight="bold" letter-spacing="1">RADAR_HUD // CARTOGRAPHY_TELEMETRY</text>

    <!-- HUD Sub-Section 1: GPX Waveform Elevation Chart -->
    <g transform="translate(18, 54)">
      <!-- Background Chart Grid -->
      <rect x="0" y="0" width="400" height="130" fill="#08090D" stroke="#1D202C" stroke-width="1.5" />
      <line x1="0" y1="35" x2="400" y2="35" stroke="#181B26" stroke-width="1" stroke-dasharray="4,4" />
      <line x1="0" y1="70" x2="400" y2="70" stroke="#181B26" stroke-width="1" stroke-dasharray="4,4" />
      <line x1="0" y1="105" x2="400" y2="105" stroke="#181B26" stroke-width="1" stroke-dasharray="4,4" />
      <line x1="100" y1="0" x2="100" y2="130" stroke="#181B26" stroke-width="1" stroke-dasharray="4,4" />
      <line x1="200" y1="0" x2="200" y2="130" stroke="#181B26" stroke-width="1" stroke-dasharray="4,4" />
      <line x1="300" y1="0" x2="300" y2="130" stroke="#181B26" stroke-width="1" stroke-dasharray="4,4" />

      <!-- GPX Elevation Polygon Fill -->
      <polygon points="0,130 0,95 35,85 70,105 110,65 145,75 180,45 220,55 255,25 295,45 330,20 370,60 400,35 400,130" fill="url(#gpxAreaGrad)" />

      <!-- GPX Cyan Path Stroke -->
      <polyline points="0,95 35,85 70,105 110,65 145,75 180,45 220,55 255,25 295,45 330,20 370,60 400,35" fill="none" stroke="#00E5FF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Waypoint 1 (Start) -->
      <circle cx="35" cy="85" r="4.5" fill="#FF5722" stroke="#000000" stroke-width="2" />
      <!-- Peak Point -->
      <circle cx="330" cy="20" r="5" fill="#CCFF00" stroke="#000000" stroke-width="2" />
      <rect x="290" y="5" width="80" height="15" fill="#000000" stroke="#CCFF00" stroke-width="1" />
      <text x="330" y="16" text-anchor="middle" fill="#CCFF00" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">PEAK +248M</text>

      <!-- Waypoint Target -->
      <circle cx="400" cy="35" r="4.5" fill="#00E5FF" stroke="#000000" stroke-width="2" />

      <!-- Chart Info Overlay -->
      <text x="10" y="18" fill="#7E8599" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">GPX ELEVATION PROFILE // 48.2 KM</text>
    </g>

    <!-- HUD Sub-Section 2: Last.fm Audio Equalizer Stream -->
    <g transform="translate(18, 198)">
      <rect x="0" y="0" width="400" height="68" fill="#08090D" stroke="#1D202C" stroke-width="1.5" />
      <!-- Scrobbler Status Label -->
      <text x="12" y="18" fill="#FF5722" font-family="Consolas, 'Courier New', monospace" font-size="10" font-weight="bold">LAST.FM LIVE STREAM</text>
      <text x="145" y="18" fill="#7E8599" font-family="Consolas, 'Courier New', monospace" font-size="10" font-weight="600">// 40,842 SCROBBLES LOGGED</text>

      <!-- Equalizer Bars -->
      <g transform="translate(12, 28)">
        <rect x="0" y="16" width="10" height="16" fill="#CCFF00" />
        <rect x="14" y="8" width="10" height="24" fill="#CCFF00" />
        <rect x="28" y="2" width="10" height="30" fill="#CCFF00" />
        <rect x="42" y="12" width="10" height="20" fill="#CCFF00" />
        <rect x="56" y="20" width="10" height="12" fill="#FF5722" />
        <rect x="70" y="6" width="10" height="26" fill="#FF5722" />
        <rect x="84" y="0" width="10" height="32" fill="#FF5722" />
        <rect x="98" y="14" width="10" height="18" fill="#00E5FF" />
        <rect x="112" y="4" width="10" height="28" fill="#00E5FF" />
        <rect x="126" y="10" width="10" height="22" fill="#00E5FF" />
        <rect x="140" y="18" width="10" height="14" fill="#B388FF" />
        <rect x="154" y="8" width="10" height="24" fill="#B388FF" />
      </g>

      <!-- Now Playing Text Box -->
      <g transform="translate(186, 27)">
        <rect x="0" y="0" width="202" height="32" fill="#131620" stroke="#252A3B" stroke-width="1" />
        <text x="10" y="14" fill="#E0E4F0" font-family="Consolas, 'Courier New', monospace" font-size="10" font-weight="bold">NOW SCROBBLING:</text>
        <text x="10" y="26" fill="#CCFF00" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">POST-PUNK / DARKWAVE WAVE</text>
      </g>
    </g>

    <!-- HUD Sub-Section 3: Quick Telemetry Metrics Grid -->
    <g transform="translate(18, 278)">
      <!-- Metric 1 -->
      <g transform="translate(0, 0)">
        <rect x="0" y="0" width="124" height="84" fill="#08090D" stroke="#1D202C" stroke-width="1.5" />
        <text x="12" y="18" fill="#7E8599" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">GEO_TRACKS</text>
        <text x="12" y="48" fill="#FFFFFF" font-family="Impact, Arial Black, sans-serif" font-size="22" font-weight="bold">6 ACTIVE</text>
        <text x="12" y="70" fill="#00E5FF" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">GPX SYNCED</text>
      </g>

      <!-- Metric 2 -->
      <g transform="translate(138, 0)">
        <rect x="0" y="0" width="124" height="84" fill="#08090D" stroke="#1D202C" stroke-width="1.5" />
        <text x="12" y="18" fill="#7E8599" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">SYSTEM_MODE</text>
        <text x="12" y="48" fill="#CCFF00" font-family="Impact, Arial Black, sans-serif" font-size="22" font-weight="bold">ONLINE</text>
        <text x="12" y="70" fill="#CCFF00" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">DISCORD LIVE</text>
      </g>

      <!-- Metric 3 -->
      <g transform="translate(276, 0)">
        <rect x="0" y="0" width="124" height="84" fill="#08090D" stroke="#1D202C" stroke-width="1.5" />
        <text x="12" y="18" fill="#7E8599" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">DESIGN_CORE</text>
        <text x="12" y="48" fill="#FF5722" font-family="Impact, Arial Black, sans-serif" font-size="22" font-weight="bold">BRUTAL</text>
        <text x="12" y="70" fill="#FF5722" font-family="Consolas, 'Courier New', monospace" font-size="9" font-weight="bold">ZERO RADIUS</text>
      </g>
    </g>
  </g>

  <!-- ================= BOTTOM STATUS FOOTER ================= -->
  <!-- Bottom Bar Divider Line -->
  <line x1="52" y1="532" x2="1146" y2="532" stroke="#252A38" stroke-width="1.5" />

  <g transform="translate(52, 562)">
    <!-- Domain Tag -->
    <text x="0" y="0" fill="#CCFF00" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="bold">&gt; CANONICAL_URL:</text>
    <text x="150" y="0" fill="#FFFFFF" font-family="Consolas, 'Courier New', monospace" font-size="13" font-weight="600">${CANONICAL_URL}</text>

    <!-- Technical Stack & Specs -->
    <text x="1094" y="0" text-anchor="end" fill="#7E8599" font-family="Consolas, 'Courier New', monospace" font-size="12" font-weight="600" letter-spacing="0.5">LEAFLET // REACT 18 // BABEL // LAST.FM API // INDUSTRIAL ARCHIVE</text>
  </g>

  <!-- Bottom Accent Stripe Bar -->
  <rect x="52" y="582" width="1094" height="4" fill="#FF5722" />
</svg>`;
}

async function generate() {
    try {
        const svgContent = buildSvg();
        
        const publicDir = path.join(rootDir, 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }
        
        // 1. Save pure SVG for vector use
        const svgPath = path.join(publicDir, 'og-image.svg');
        fs.writeFileSync(svgPath, svgContent, 'utf8');
        fs.writeFileSync(path.join(rootDir, 'og-image.svg'), svgContent, 'utf8');
        console.log(`✔ Created vector SVG asset: ${svgPath}`);

        // 2. Render 1200x630 PNG using Resvg
        const resvg = new Resvg(svgContent, {
            fitTo: { mode: 'width', value: 1200 }
        });
        const pngData = resvg.render();
        const pngBuffer = pngData.asPng();

        // Save to public/og-image.png and root og-image.png
        const pngPath = path.join(publicDir, 'og-image.png');
        fs.writeFileSync(pngPath, pngBuffer);
        fs.writeFileSync(path.join(rootDir, 'og-image.png'), pngBuffer);
        console.log(`✔ Generated OpenGraph PNG: ${pngPath} and root og-image.png (${(pngBuffer.length / 1024).toFixed(1)} KB) [1200x630]`);

        console.log('[OG-GEN] OpenGraph generation complete! Status: OK.');
    } catch (err) {
        console.error('[OG-GEN] Error generating OpenGraph image:', err);
        process.exit(1);
    }
}

generate();
