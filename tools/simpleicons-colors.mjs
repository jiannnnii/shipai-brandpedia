// 抓 Simple Icons 品牌主色:slug 命中的把十六进制色写进 data/brandcolors.json
// 用法:node --use-system-ca tools/simpleicons-colors.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'data', 'brandcolors.json');
const colors = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const UA = 'ShipaiBrandpedia/1.0';

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const slugOf = b => (b.nameEn || '').toLowerCase().replace(/[^a-z0-9]/g, '');

let hits = 0, miss = 0, i = 0;
for (const b of data.brands) {
  i++;
  const slug = slugOf(b);
  if (!slug || colors[b.id]) continue;
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(`https://cdn.simpleicons.org/${slug}`, { signal: ctl.signal, headers: { 'User-Agent': UA } });
    clearTimeout(t);
    if (r.ok) {
      const svg = await r.text();
      const m = svg.match(/fill="#([0-9A-Fa-f]{6})"/);
      if (m) { colors[b.id] = '#' + m[1].toUpperCase(); hits++; }
      else miss++;
    } else miss++;
  } catch { miss++; }
  if (i % 50 === 0) { writeFileSync(OUT, JSON.stringify(colors, null, 1)); console.log(`${i}/${data.brands.length} 命中${hits}`); }
  await sleep3();
}
function sleep3() { return new Promise(r => setTimeout(r, 150)); }
writeFileSync(OUT, JSON.stringify(colors, null, 1));
console.log(`✔ Simple Icons 主色:命中 ${hits} / 未覆盖 ${miss}`);
