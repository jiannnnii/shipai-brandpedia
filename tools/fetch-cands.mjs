// 错图三候选抓取:为每个待修产品抓 3 张不同候选图 → data/img/cand/{pid}-{1,2,3}.jpg
// 用法:node tools/fetch-cands.mjs data/audit/verdict2-auto-1.json [verdict2-auto-2.json ...]
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CAND = join(ROOT, 'data', 'img', 'cand');
mkdirSync(CAND, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const CAT_HINT = { auto: '汽车', fashion: '时装', watchjewel: '腕表', beauty: '化妆品', sports: '运动', apparel: '服饰', food: '食品', drinks: '', tech: '数码', home: '家电' };

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const byId = new Map();
for (const b of data.brands) for (const p of (b.products || [])) byId.set(p.id, { b, p });

const jobs = [];
for (const vf of process.argv.slice(2)) {
  try {
    const verdicts = JSON.parse(readFileSync(join(ROOT, vf), 'utf8'));
    for (const v of verdicts) {
      if (v.verdict !== 'ok') {
        const rec = byId.get(v.id);
        if (rec) jobs.push({ id: v.id, ...rec });
      }
    }
  } catch (e) { console.log('跳过', vf, e.message.slice(0, 60)); }
}
console.log(`待抓候选 ${jobs.length} 个产品`);

async function fetchBuf(url, timeoutMs = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, 'Referer': 'https://cn.bing.com/' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}
const isImg = buf => (buf[0] === 0xFF && buf[1] === 0xD8) || (buf[0] === 0x89 && buf[1] === 0x50);
function imgSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}
function looksRight(buf) {
  const s = imgSize(buf);
  if (!s) return false;
  const ratio = s.w / s.h;
  return s.w >= 400 && s.h >= 280 && ratio >= 0.5 && ratio <= 2.2;
}
async function bingMurls(kw) {
  const html = await (await fetchBuf(`https://cn.bing.com/images/search?q=${encodeURIComponent(kw)}&form=HDRSC2&first=1`, 15000)).toString();
  return [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)].map(m => m[1].replace(/\\u002f/gi, '/')).slice(0, 10);
}

let done = 0;
const failures = [];
for (const job of jobs) {
  const { b, p, id } = job;
  const hint = CAT_HINT[b.categoryId] || '';
  const queries = [
    `${b.nameEn || ''} ${p.nameEn || ''}`.trim(),
    `${b.name} ${p.name} ${hint}`.trim(),
  ].filter(Boolean);
  let got = 0;
  try {
    for (const kw of queries) {
      if (got >= 3) break;
      const murls = await bingMurls(kw);
      for (const mu of murls) {
        if (got >= 3) break;
        try {
          const buf = await fetchBuf(mu, 15000);
          if (buf.length >= 15000 && buf.length <= 4_000_000 && isImg(buf) && looksRight(buf)) {
            got++;
            writeFileSync(join(CAND, `${id}-${got}.jpg`), buf);
          }
        } catch {}
      }
      await sleep(1500 + Math.floor(Math.random() * 1500));
    }
  } catch {}
  if (got === 0) failures.push(id);
  done++;
  if (done % 20 === 0) console.log(`进度 ${done}/${jobs.length}`);
  await sleep(800 + Math.floor(Math.random() * 800));
}
console.log(`✔ 候选抓取完成:${jobs.length - failures.length} 成功 / ${failures.length} 无候选`);
if (failures.length) console.log('无候选:', failures.join(','));
