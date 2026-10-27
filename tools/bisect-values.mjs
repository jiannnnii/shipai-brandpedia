// 二分定位毒丸 VALUES
import { readFileSync } from 'node:fs';
const variants = readFileSync('data/audit/test-values.txt', 'utf8').split(' ');
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
  catch { return { status: r.status, rows: -1, body: txt.slice(0, 120) }; }
}
async function bisect(list) {
  if (list.length === 1) { console.log('毒丸:', list[0]); return; }
  const a = list.slice(0, Math.ceil(list.length / 2));
  const b = list.slice(Math.ceil(list.length / 2));
  const ra = await tryList(a);
  const rb = await tryList(b);
  console.log(`左(${a.length}): ${ra.status}/${ra.rows}   右(${b.length}): ${rb.status}/${rb.rows}`);
  if (ra.rows === 0 || ra.status !== 200) return bisect(a);
  if (rb.rows === 0 || rb.status !== 200) return bisect(b);
  console.log('两半都正常?!');
}
await bisect(variants);
