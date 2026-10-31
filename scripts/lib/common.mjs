/**
 * Общие пути и хелперы для скриптов сборки PRUUSHKAA // ARCHIVE_OS.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Единственные места хранения данных сайта
export const TRACKS_DIR = path.join(rootDir, 'public', 'tracks');
export const TRACKS_MANIFEST = path.join(TRACKS_DIR, 'manifest.json');
export const DATA_DIR = path.join(rootDir, 'public', 'data');
export const PAGES = ['index.html', 'music.html'];

export const rel = (p) => path.relative(rootDir, p);

export function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

export function writeJson(file, data) {
    ensureDir(path.dirname(file));
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Загружает браузерный UMD-скрипт из assets/js (он кладёт API в self.<globalName>).
 * Так Node-скрипты используют тот же код, что и сайт, без копирования.
 */
export function loadBrowserLib(relPath, globalName) {
    const code = fs.readFileSync(path.join(rootDir, relPath), 'utf8');
    const sandbox = {};
    sandbox.self = sandbox;
    vm.runInNewContext(code, sandbox, { filename: relPath });
    if (!sandbox[globalName]) throw new Error(`${relPath} не экспортировал ${globalName}`);
    return sandbox[globalName];
}

/**
 * Проверяет синтаксис JSX в <script type="text/babel"> страницы.
 * Возвращает { ok: true } или { ok: false, message, context }.
 */
export async function validatePageJsx(pageFile) {
    const { parse } = await import('@babel/parser');
    const html = fs.readFileSync(path.join(rootDir, pageFile), 'utf8');
    const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
    if (!match) return { ok: false, message: `в ${pageFile} нет <script type="text/babel">` };
    try {
        parse(match[1], { sourceType: 'module', plugins: ['jsx'] });
        return { ok: true };
    } catch (err) {
        const line = err.loc?.line;
        const lines = match[1].split('\n');
        const start = Math.max(0, (line || 0) - 5);
        const context = line
            ? lines.slice(start, line + 5).map((l, i) => `${start + i + 1}: ${l}`).join('\n')
            : '';
        return { ok: false, message: `${pageFile}: строка ${line}, колонка ${err.loc?.column}: ${err.message}`, context };
    }
}
