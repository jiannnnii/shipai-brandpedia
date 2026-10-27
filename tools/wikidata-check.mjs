// Wikidata 数据体检(逐品牌直查,QLever 镜像;官方端点被墙时的可用通道)
// 用法:node --use-system-ca tools/wikidata-check.mjs
// - 缓存 data/wikidata-cache.json(断点续跑);产出 review-flags.json + review-report.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const UA = 'ShipaiBrandpedia/1.0 (personal brand encyclopedia)';
const ENDPOINT = 'https://qlever.dev/api/wikidata';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const CACHE_FILE = join(ROOT, 'data', 'wikidata-cache.json');
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};

const SKIP = new Set(['com', 'cn', 'net', 'org', 'co', 'www', 'jp', 'de', 'fr', 'it', 'us', 'uk', 'hk', 'tw', 'kr', 'group', 'global']);
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } }
function cores(host) { return host.split('.').filter(p => p && !SKIP.has(p)); }
function domainMatch(ours, theirs) {
  const a = cores(ours), c = cores(theirs);
  return a.some(x => c.some(y => y.includes(x) || x.includes(y)));
}
function yearOf(s) { return s ? parseInt(String(s).slice(0, 4)) : null; }
function esc(s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); }
function titleCase(en) {
  return en.split(/\s+/).map(w => {
    if (!w) return w;
    if (w.length <= 4 && w === w.toUpperCase() && /^[A-Z0-9&]+$/.test(w)) return w;
    return w[0].toUpperCase() + w.slice(1).toLowerCase();
  }).join(' ');
}

async function sparql(query, timeoutMs = 30000) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const r = await fetch(ENDPOINT + '?query=' + encodeURIComponent(query), {
        signal: ctl.signal, headers: { 'User-Agent': UA, 'Accept': 'application/sparql-results+json' },
      });
      if (r.status === 429 || r.status === 503) {
        console.log(`  ⚠ ${r.status} 限流,60s 后重试`);
        await sleep(60000);
        continue;
      }
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) {
      if (attempt === 3) throw e;
      await sleep(15000);
    } finally { clearTimeout(t); }
  }
}

function qFor(literal) {
  return `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?item ?site ?founded ?cLabel ?hLabel WHERE {
  ?item rdfs:label "${esc(literal)}"@en .
  OPTIONAL { ?item wdt:P856 ?site }
  OPTIONAL { ?item wdt:P571 ?founded }
  OPTIONAL { ?item wdt:P17 ?c . ?c rdfs:label ?cZh . FILTER(LANG(?cZh) IN ("zh-cn","zh","en")) }
  OPTIONAL { ?item wdt:P159 ?h . ?h rdfs:label ?hZh . FILTER(LANG(?hZh) IN ("zh-cn","zh","en")) }
  BIND(COALESCE(?cZh, "") AS ?cLabel)
  BIND(COALESCE(?hZh, "") AS ?hLabel)
} LIMIT 50`;
}
function qFuzzy(token) {
  return `PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX wdt: <http://www.wikidata.org/prop/direct/>
SELECT ?item ?site ?founded ?cLabel ?hLabel WHERE {
  ?item rdfs:label ?l .
  FILTER(CONTAINS(LCASE(?l), "${esc(token)}"))
  FILTER(LANG(?l) = "en")
  ?item wdt:P856 ?site .
  OPTIONAL { ?item wdt:P571 ?founded }
  OPTIONAL { ?item wdt:P17 ?c . ?c rdfs:label ?cZh . FILTER(LANG(?cZh) IN ("zh-cn","zh","en")) }
  OPTIONAL { ?item wdt:P159 ?h . ?h rdfs:label ?hZh . FILTER(LANG(?hZh) IN ("zh-cn","zh","en")) }
  BIND(COALESCE(?cZh, "") AS ?cLabel)
  BIND(COALESCE(?hZh, "") AS ?hLabel)
} LIMIT 20`;
}
function pickBest(rows) {
  let best = null, score = -1;
  for (const row of rows) {
    const rec = {
      item: row.item?.value || '', site: hostOf(row.site?.value || ''),
      founded: yearOf(row.founded?.value) || 0, country: row.cLabel?.value || '', hq: row.hLabel?.value || '',
    };
    rec.score = (rec.site ? 1 : 0) + (rec.founded ? 1 : 0) + (rec.country ? 1 : 0) + (rec.hq ? 1 : 0);
    if (rec.score > score) { best = rec; score = rec.score; }
  }
  return best;
}
function compare(b, wd) {
  const diffs = [];
  if (b.founded && wd.founded && Math.abs(b.founded - wd.founded) > 1) {
    diffs.push(`Wikidata 记录成立于 ${wd.founded},数据里是 ${b.founded}`);
  }
  if (b.country && wd.country) {
    const a = b.country.replace(/国$/, ''), c = wd.country.replace(/国$/, '');
    if (!c.includes(a) && !a.includes(c)) diffs.push(`Wikidata 国家为 ${wd.country},数据里是 ${b.country}`);
  }
  if (b.hq && wd.hq && !wd.hq.includes(b.hq) && !b.hq.includes(wd.hq)) {
    diffs.push(`Wikidata 总部为 ${wd.hq},数据里是 ${b.hq}`);
  }
  if (b.domain && wd.site && !domainMatch(b.domain, wd.site)) {
    diffs.push(`Wikidata 官网为 ${wd.site},数据里是 ${b.domain}`);
  }
  return diffs;
}

let notFound = 0, fieldDiff = 0, okN = 0, errors = 0;
const flagged = {};
const report = [];

const pending = data.brands.filter(b => !cache[b.id]);
console.log(`待查 ${pending.length} 个品牌(缓存已有 ${data.brands.length - pending.length})`);

for (const b of pending) {
  const orig = (b.nameEn || b.name).trim();
  process.stdout.write(`${b.id} `);
  const variants = [orig];
  const tc = titleCase(orig);
  if (tc !== orig) variants.push(tc);
  const singles = tc.split(/\s+/).filter(w => w.length > 2 && w !== w.toLowerCase());
  if (singles.length === 1) variants.push(singles[0]);
  let rec = null;
  for (const v of variants) {
    if (rec) break;
    try {
      rec = pickBest((await sparql(qFor(esc(v)))).results?.bindings || []);
      if (rec && rec.score === 0) rec = null;
      await sleep(500);
    } catch (e) {
      errors++;
      console.log(`  ${b.id}: 查询失败 ${String(e.message || e).slice(0, 60)}`);
      await sleep(8000);
    }
  }
  if (!rec) {
    notFound++;
    flagged[b.id] = { needsReview: true, reviewNote: 'Wikidata 未找到对应实体(' + (b.nameEn || b.name) + '),建议人工核对' };
    report.push({ id: b.id, name: b.name, note: flagged[b.id].reviewNote });
    cache[b.id] = { qid: null, t: Date.now() };
    continue;
  }
  const wd = { site: rec.site, founded: rec.founded, country: rec.country, hq: rec.hq, t: Date.now() };
  cache[b.id] = wd;
  const diffs = compare(b, wd);
  if (diffs.length) {
    fieldDiff++;
    flagged[b.id] = { needsReview: true, reviewNote: diffs.join(';') };
    report.push({ id: b.id, name: b.name, note: diffs.join(';') });
  } else okN++;
  const done = notFound + fieldDiff + okN;
  if (done % 20 === 0) {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
    console.log(`  进度 ${done}/${pending.length} · 一致 ${okN} 差异 ${fieldDiff} 未找到 ${notFound}`);
  }
}

writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
writeFileSync(join(ROOT, 'data', 'review-flags.json'), JSON.stringify(flagged, null, 1));
writeFileSync(join(ROOT, 'data', 'review-report.json'), JSON.stringify({
  timestamp: new Date().toLocaleString('sv-SE'),
  total: data.brands.length, notFound, fieldDiff, ok: okN, errors,
  items: report,
}, null, 1));
console.log(`✔ 体检完成:一致 ${okN} / 字段差异 ${fieldDiff} / 未找到 ${notFound} / 查询错误 ${errors}`);
