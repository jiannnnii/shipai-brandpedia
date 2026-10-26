// 一次性文本修复工具
import { readFileSync, writeFileSync } from 'node:fs';
const [file, ...pairs] = process.argv.slice(2);
let s = readFileSync(file, 'utf8');
for (let i = 0; i < pairs.length; i += 2) s = s.split(pairs[i]).join(pairs[i + 1]);
writeFileSync(file, s);
const j = JSON.parse(s);
console.log('fixed & valid:', j.brands?.length ?? j.length, 'entries');
