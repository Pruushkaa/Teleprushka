import fs from 'fs';
import { parse } from '@babel/parser';

const html = fs.readFileSync('index.html', 'utf8');
const scriptMatch = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (!scriptMatch) {
    console.error('FAIL: No babel script found in index.html!');
    process.exit(1);
}

const code = scriptMatch[1];
console.log('Testing JSX syntax with official @babel/parser...');

try {
    const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx']
    });
    console.log('✔ JSX AND BABEL SYNTAX PARSED 100% SUCCESSFULLY! Zero syntax errors.');
} catch (err) {
    console.error(`❌ BABEL PARSE ERROR at line ${err.loc?.line}, col ${err.loc?.column}:`);
    console.error(err.message);
    const lines = code.split('\n');
    const lineNum = err.loc?.line;
    if (lineNum) {
        console.error('Context:');
        for (let i = Math.max(0, lineNum - 5); i < Math.min(lines.length, lineNum + 5); i++) {
            console.error(`${i + 1}: ${lines[i]}`);
        }
    }
    process.exit(1);
}
