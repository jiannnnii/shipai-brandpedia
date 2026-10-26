// 合并 data/src/*.json → data/index.json(含校验)。在项目根目录运行:node tools/build-data.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'data/src';
const categories = JSON.parse(readFileSync(join(SRC, 'categories.json'), 'utf8'));
const catIds = new Set(categories.map(c => c.id));

const brands = [];
const errors = [];

for (const f of readdirSync(SRC).sort()) {
  if (!/^brands\..+\.json$/.test(f)) continue;
  let j;
  try { j = JSON.parse(readFileSync(join(SRC, f), 'utf8')); }
  catch (e) { errors.push(`${f}: JSON 解析失败 ${e.message}`); continue; }
  const arr = Array.isArray(j) ? j : j.brands;
  if (!Array.isArray(arr)) { errors.push(`${f}: 缺少 brands 数组`); continue; }
  for (const b of arr) brands.push(Object.assign({}, b, { __src: f }));
}

const seen = new Set();
for (const b of brands) {
  const tag = `[${b.__src}] ${b.id || b.name || '?'}`;
  if (!b.id) errors.push(`${tag}: 缺 id`);
  else if (seen.has(b.id)) errors.push(`${tag}: 品牌 id 重复`);
  seen.add(b.id);
  if (!b.name) errors.push(`${tag}: 缺 name`);
  if (!catIds.has(b.categoryId)) errors.push(`${tag}: categoryId 无效(${b.categoryId})`);
  b.products = b.products || [];
  const pids = new Set();
  for (const p of b.products) {
    const pt = `${tag} / ${p.id || p.name || '?'}`;
    if (!p.id) errors.push(`${pt}: 产品缺 id`);
    else if (pids.has(p.id)) errors.push(`${pt}: 产品 id 重复`);
    pids.add(p.id);
    if (!p.name) errors.push(`${pt}: 产品缺 name`);
    if (p.price && typeof p.price.min !== 'number' && !p.price.label) errors.push(`${pt}: price 异常`);
  }
  delete b.__src;
}

brands.sort((a, b) => (a.categoryId === b.categoryId ? a.id.localeCompare(b.id) : a.categoryId.localeCompare(b.categoryId)));

const counts = {
  brands: brands.length,
  products: brands.reduce((s, b) => s + b.products.length, 0),
};
const out = {
  version: '数据版本 ' + new Date().toLocaleString('sv-SE').replace('T', ' '),
  counts,
  categories,
  brands,
};

mkdirSync('data', { recursive: true });
writeFileSync(join('data', 'index.json'), JSON.stringify(out));

console.log(`✔ 合并完成:${counts.brands} 个品牌 / ${counts.products} 个产品 → data/index.json`);
const byCat = {};
for (const b of brands) byCat[b.categoryId] = (byCat[b.categoryId] || 0) + 1;
console.log(Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join('  '));
if (errors.length) {
  console.log(`\n✘ ${errors.length} 个问题:`);
  for (const e of errors) console.log('  -', e);
  process.exitCode = 1;
}
