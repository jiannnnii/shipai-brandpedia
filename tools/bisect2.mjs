// 正确的数组二分:定位导致 0 行的 VALUES 变体
import { readFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('data/index.json', 'utf8'));
function titleCase(en) {
  return en.split(/\s+/).map(w => {
    if (!w) return w;
    if (w.length <= 4 && w === w.toUpperCase() && /^[A-Z0-9&]+$/.test(w)) return w;
    return w[0].toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}
const first20 = data.brands.slice(0, 20);
const variants = [];
const meta = [];
for (const b of first20) {
  const orig = (b.nameEn || b.name).trim();
  const keys = new Set([orig.toLowerCase()]);
  const tc = titleCase(orig);
  keys.add(tc.toLowerCase());
  const singles = tc.split(/\s+/).filter(w => w.length > 2 && w !== w.toLowerCase());
  if (singles.length === 1) keys.add(singles[0].toLowerCase());
  for (const k of keys) {
    if (/^[a-z0-9&.\-\s]+$/.test(k)) { variants.push(`"${k}"@en`); meta.push(b.id + ':' + k); }
  }
}
async function tryList(list) {
  const q = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?label ?item WHERE {
  VALUES ?label { ${list.join(' ')} }
  ?item rdfs:label ?label .
  ?item wdt:P856 ?anySite .
} LIMIT 900`;
  const r = await fetch('https://qlever.dev/api/wikidata?query=' + encodeURIComponent(q), { headers: { 'User-Agent': 'test' } });
  const txt = await r.text();
  try { const j = JSON.parse(txt); return { status: r.status, rows: j.results.bindings.length }; }
  catch { return { status: r.status, rows: -1, body: txt.slice(0, 150) };
  }
}
async function bisect(list, depth) {
  const r = await tryList(list);
  console.log('  '.repeat(depth) + `[${list.length}] ${r.status}/${r.rows}`, list.length === 1 ? meta[variants.indexOf(list[0])] : '');
  if (list.length === 1) { if (r.rows === 0) console.log('>>> 毒丸:', list[0], meta[variants.indexOf(list[0])]); return; }
  if (r.rows > 0 && r.status === 200) { console.log('  '.repeat(depth) + '这半正常'); return; }
  await bisect(list.slice(0, Math.ceil(list.length / 2)), depth + 1);
  await bisect(list.slice(Math.ceil(list.length / 2)), depth + 1);
}
console.log('总变体:', variants.length);
await bisect(variants, 0);
