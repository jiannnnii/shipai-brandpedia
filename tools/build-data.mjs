// 合并 data/src/*.json → data/index.json(含校验)。在项目根目录运行:node tools/build-data.mjs
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'data/src';
const IMG_REMOTE = 'https://cdn.jsdelivr.net/gh/jiannnnii/shipai-brandpedia@master/data/img';
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
const uniq = [];
let dupCount = 0;
for (const b of brands) {
  const tag = `[${b.__src}] ${b.id || b.name || '?'}`;
  if (!b.id) { errors.push(`${tag}: 缺 id`); continue; }
  if (seen.has(b.id)) { dupCount++; continue; }   // 先到先得,种子数据会被品类数据覆盖
  seen.add(b.id);
  if (!b.name) errors.push(`${tag}: 缺 name`);
  if (!catIds.has(b.categoryId)) errors.push(`${tag}: categoryId 无效(${b.categoryId})`);
  b.products = b.products || [];
  const pids = new Set();
  const pu = [];
  for (const p of b.products) {
    const pt = `${tag} / ${p.id || p.name || '?'}`;
    if (!p.id || pids.has(p.id)) { errors.push(`${pt}: 产品 id 缺失或重复`); continue; }
    pids.add(p.id);
    if (!p.name) errors.push(`${pt}: 产品缺 name`);
    if (p.price && typeof p.price.min !== 'number' && !p.price.label) errors.push(`${pt}: price 异常`);
    const imgPath = join('data', 'img', `${p.id}.jpg`);
    if (existsSync(imgPath) && statSync(imgPath).size > 8000) {
      p.image = `data/img/${p.id}.jpg`;
    }
    pu.push(p);
  }
  b.products = pu;
  delete b.__src;
  uniq.push(b);
}
if (dupCount) console.log(`⚠ 跳过重复品牌 ${dupCount} 个(先到先得)`);
uniq.sort((a, b) => (a.categoryId === b.categoryId ? a.id.localeCompare(b.id) : a.categoryId.localeCompare(b.categoryId)));
const finalBrands = uniq;

const counts = {
  brands: finalBrands.length,
  products: finalBrands.reduce((s, b) => s + b.products.length, 0),
};
const out = {
  vtime: Date.now(),
  version: '数据版本 ' + new Date().toLocaleString('sv-SE').replace('T', ' '),
  counts,
  categories,
  brands: finalBrands,
};

mkdirSync('data', { recursive: true });
writeFileSync(join('data', 'index.json'), JSON.stringify(out));

console.log(`✔ 合并完成:${counts.brands} 个品牌 / ${counts.products} 个产品 → data/index.json`);
const byCat = {};
for (const b of finalBrands) byCat[b.categoryId] = (byCat[b.categoryId] || 0) + 1;
console.log(Object.entries(byCat).map(([k, v]) => `${k}:${v}`).join('  '));
if (errors.length) {
  console.log(`\n✘ ${errors.length} 个问题:`);
  for (const e of errors) console.log('  -', e);
  process.exitCode = 1;
}
