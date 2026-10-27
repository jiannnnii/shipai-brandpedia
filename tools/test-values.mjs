// 复现第一批 VALUES 查询
import { readFileSync } from 'node:fs';
const v = readFileSync('data/audit/test-values.txt', 'utf8');
const q = `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?label ?item WHERE {
  VALUES ?label { ${v} }
  ?item rdfs:label ?label .
  ?item wdt:P856 ?anySite .
} LIMIT 900`;
const r = await fetch('https://qlever.dev/api/wikidata?query=' + encodeURIComponent(q), { headers: { 'User-Agent': 'test' } });
const txt = await r.text();
try {
  const j = JSON.parse(txt);
  console.log('status', r.status, 'rows:', j.results.bindings.length);
  for (const row of j.results.bindings.slice(0, 5)) console.log(' ', row.label.value, '→', row.item.value.split('/').pop());
} catch {
  console.log('status', r.status, 'BODY:', txt.slice(0, 300));
}
