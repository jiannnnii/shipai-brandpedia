// Wikidata 数据体检(逐品牌直查,QLever 镜像;官方端点被墙时的可用通道)
// 用法:node --use-system-ca tools/wikidata-check.mjs
// - 缓存 data/wikidata-cache.json(断点续跑);比对逻辑改动后用缓存即可重算
// - 产出 data/review-flags.json(供 build-data 挂 needsReview)+ data/review-report.json
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const UA = 'ShipaiBrandpedia/1.0 (personal brand encyclopedia)';
const ENDPOINT = 'https://qlever.dev/api/wikidata';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- 基础工具 ----------
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
// 繁→简(城市/国家常用字)
const T2S = { 蘭:'兰', 亞:'亚', 維:'维', 爾:'尔', 漢:'汉', 華:'华', 龍:'龙', 國:'国', 際:'际', 奧:'奥', 灣:'湾', 東:'东', 車:'车', 馬:'马', 達:'达', 羅:'罗', 納:'纳', 蘇:'苏', 縣:'县', 島:'岛', 內:'内', 貝:'贝', 萊:'莱', 錫:'锡', 頓:'顿', 茲:'兹', 舍:'舍', 爾:'尔' };
const simp = s => String(s).replace(/[蘭亞維爾漢華龍國際奧灣東車馬達羅納蘇縣島內貝裏萊錫頓茲]/g, ch => T2S[ch] || ch);
const EN_COUNTRY = { germany:'德国', sweden:'瑞典', denmark:'丹麦', italy:'意大利', france:'法国', 'united states':'美国', usa:'美国', 'united states of america':'美国', japan:'日本', switzerland:'瑞士', 'united kingdom':'英国', uk:'英国', 'south korea':'韩国', korea:'韩国', netherlands:'荷兰', spain:'西班牙', austria:'奥地利', finland:'芬兰', norway:'挪威', canada:'加拿大', australia:'澳大利亚', china:'中国', taiwan:'台湾', 'hong kong':'香港', india:'印度', mexico:'墨西哥', brazil:'巴西', thailand:'泰国', malaysia:'马来西亚', singapore:'新加坡', belgium:'比利时', ireland:'爱尔兰' };

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
function compare(b, wdRaw) {
  let wd = { ...wdRaw };
  if (wd.country && !/[\u4e00-\u9fff]/.test(wd.country)) {
    wd.country = EN_COUNTRY[wd.country.toLowerCase()] || wd.country;
  }
  wd.country = simp(wd.country); wd.hq = simp(wd.hq);

  const diffs = [];
  if (b.founded && wd.founded && Math.abs(b.founded - wd.founded) > 1) {
    diffs.push(`Wikidata 记录成立于 ${wd.founded},数据里是 ${b.founded}`);
  }
  if (b.country && wd.country) {
    const a = b.country.replace(/国$/, ''), c = wd.country.replace(/国$/, '');
    if (!c.includes(a) && !a.includes(c)) diffs.push(`Wikidata 国家为 ${wd.country},数据里是 ${b.country}`);
  }
  if (b.hq && wd.hq && /[\u4e00-\u9fff]/.test(wd.hq) && !wd.hq.includes(b.hq) && !b.hq.includes(wd.hq)) {
    diffs.push(`Wikidata 总部为 ${wd.hq},数据里是 ${b.hq}`);
  }
  if (b.domain && wd.site && !domainMatch(b.domain, wd.site)) {
    diffs.push(`Wikidata 官网为 ${wd.site},数据里是 ${b.domain}`);
  }
  return diffs;
}

// ---------- 主流程 ----------
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const CACHE_FILE = join(ROOT, 'data', 'wikidata-cache.json');
const cache = existsSync(CACHE_FILE) ? JSON.parse(readFileSync(CACHE_FILE, 'utf8')) : {};

// 1) 抓取循环(只补缓存缺口)
const pending = data.brands.filter(b => !cache[b.id]);
console.log(`待查 ${pending.length} 个品牌(缓存已有 ${data.brands.length - pending.length})`);
let fetched = 0;
for (const b of pending) {
  const orig = (b.nameEn || b.name).trim();
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
  cache[b.id] = rec
    ? { site: rec.site, founded: rec.founded, country: rec.country, hq: rec.hq, t: Date.now() }
    : { qid: null, t: Date.now() };
  fetched++;
  const done = Object.keys(cache).length;
  if (done % 20 === 0) {
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
    console.log(`  抓取进度 ${done}/${data.brands.length}`);
  }
}
if (fetched) writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));

// 2) 统一比对(全量,基于缓存)
let notFound = 0, fieldDiff = 0, okN = 0, errors = 0;
const flagged = {};
const report = [];
for (const b of data.brands) {
  const wd = cache[b.id];
  if (!wd) {
    flagged[b.id] = { needsReview: true, reviewNote: '尚未体检(网络未完成)' };
    continue;
  }
  if (wd.qid === null) {
    notFound++;
    flagged[b.id] = { needsReview: true, reviewNote: 'Wikidata 未找到对应实体(' + (b.nameEn || b.name) + '),建议人工核对' };
    report.push({ id: b.id, name: b.name, note: flagged[b.id].reviewNote });
    continue;
  }
  const diffs = compare(b, wd);
  if (diffs.length) {
    fieldDiff++;
    flagged[b.id] = { needsReview: true, reviewNote: diffs.join(';') };
    report.push({ id: b.id, name: b.name, qid: wd.qid, note: diffs.join(';') });
  } else okN++;
}

writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 1));
writeFileSync(join(ROOT, 'data', 'review-flags.json'), JSON.stringify(flagged, null, 1));
writeFileSync(join(ROOT, 'data', 'review-report.json'), JSON.stringify({
  timestamp: new Date().toLocaleString('sv-SE'),
  total: data.brands.length, notFound, fieldDiff, ok: okN, errors,
  items: report,
}, null, 1));
console.log(`✔ 体检完成:一致 ${okN} / 字段差异 ${fieldDiff} / 未找到 ${notFound} / 错误 ${errors}`);
