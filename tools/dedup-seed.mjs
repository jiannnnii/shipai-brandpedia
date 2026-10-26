// 从种子文件移除已被正式数据覆盖的品牌
import { readFileSync, writeFileSync } from 'node:fs';
const remove = process.argv.slice(2);
const p = 'data/src/brands.seed.json';
const j = JSON.parse(readFileSync(p, 'utf8'));
j.brands = j.brands.filter(b => !remove.includes(b.id));
writeFileSync(p, JSON.stringify(j, null, 2));
console.log('seed now:', j.brands.map(b => b.id).join(','));
