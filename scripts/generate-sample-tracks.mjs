import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function makeGpx(name, desc, time, points) {
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<gpx version="1.1" creator="Pruushkaa GPX Engine" xmlns="http://www.topografix.com/GPX/1/1">\n';
  xml += '  <metadata>\n';
  xml += `    <name>${name}</name>\n`;
  xml += `    <desc>${desc}</desc>\n`;
  xml += `    <time>${time}</time>\n`;
  xml += '  </metadata>\n';
  xml += '  <trk>\n';
  xml += `    <name>${name}</name>\n`;
  xml += '    <type>Cycling</type>\n';
  xml += '    <trkseg>\n';
  for (const pt of points) {
    xml += `      <trkpt lat="${pt.lat.toFixed(6)}" lon="${pt.lon.toFixed(6)}">\n`;
    xml += `        <ele>${pt.ele.toFixed(1)}</ele>\n`;
    xml += `        <time>${pt.time}</time>\n`;
    xml += '      </trkpt>\n';
  }
  xml += '    </trkseg>\n';
  xml += '  </trk>\n';
  xml += '</gpx>';
  return xml;
}

const tracksDir = path.join(rootDir, 'tracks');
if (!fs.existsSync(tracksDir)) fs.mkdirSync(tracksDir, { recursive: true });

// Track 1: Forest Trail
{
  const pts = [];
  const baseLat = 55.8200;
  const baseLon = 37.4900;
  let t = new Date('2026-06-15T10:00:00Z').getTime();
  for (let i = 0; i <= 60; i++) {
    const angle = (i / 60) * Math.PI * 2.5;
    const r = 0.015 + 0.008 * Math.sin(i * 0.3);
    const lat = baseLat + Math.sin(angle) * r + (i * 0.0003);
    const lon = baseLon + Math.cos(angle) * r * 1.5 + (i * 0.0002);
    const ele = 145 + 35 * Math.sin(i * 0.25) + 15 * Math.cos(i * 0.5);
    t += 70000;
    pts.push({ lat, lon, ele, time: new Date(t).toISOString() });
  }
  const gpx = makeGpx('Лесной маршрут', 'Грунты, лесные тропы и полевые участки вдоль бора', '2026-06-15T10:00:00Z', pts);
  fs.writeFileSync(path.join(tracksDir, 'route1-forest.gpx'), gpx, 'utf8');
}

// Track 2: River & Dam
{
  const pts = [];
  const baseLat = 55.7400;
  const baseLon = 37.5800;
  let t = new Date('2026-07-22T17:30:00Z').getTime();
  for (let i = 0; i <= 75; i++) {
    const lat = baseLat + (i * 0.0012) + 0.002 * Math.sin(i * 0.15);
    const lon = baseLon + (i * 0.0025) + 0.004 * Math.cos(i * 0.12);
    const ele = 120 + 8 * Math.sin(i * 0.1);
    t += 55000;
    pts.push({ lat, lon, ele, time: new Date(t).toISOString() });
  }
  const gpx = makeGpx('Набережная и дамба', 'Скоростной асфальтовый заезд вдоль реки и набережных', '2026-07-22T17:30:00Z', pts);
  fs.writeFileSync(path.join(tracksDir, 'route2-river.gpx'), gpx, 'utf8');
}

// Track 3: Night Urban Sprint
{
  const pts = [];
  const baseLat = 55.7600;
  const baseLon = 37.6200;
  let t = new Date('2026-08-09T22:15:00Z').getTime();
  for (let i = 0; i <= 70; i++) {
    const angle = (i / 70) * Math.PI * 2;
    const lat = baseLat + Math.sin(angle) * 0.02 + 0.003 * Math.sin(i * 0.6);
    const lon = baseLon + Math.cos(angle) * 0.035 + 0.002 * Math.cos(i * 0.4);
    const ele = 135 + 18 * Math.sin(i * 0.3);
    t += 60000;
    pts.push({ lat, lon, ele, time: new Date(t).toISOString() });
  }
  const gpx = makeGpx('Ночной урбан-заезд', 'Пустые ночные проспекты, мосты и кольцевые развязки', '2026-08-09T22:15:00Z', pts);
  fs.writeFileSync(path.join(tracksDir, 'route3-night-city.gpx'), gpx, 'utf8');
}

console.log('Sample GPX tracks generated in tracks/');
