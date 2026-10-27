// 错图重抓:输入审查判定文件,对非 ok 的产品换词重抓
// 用法:node tools/fix-imgs.mjs data/audit/verdict-auto-1.json
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const IMG = join(ROOT, 'data', 'img');
mkdirSync(IMG, { recursive: true });

const verdictFile = process.argv[2];
const verdicts = JSON.parse(readFileSync(verdictFile, 'utf8'));
const bad = verdicts.filter(v => v.verdict !== 'ok').map(v => v.id);
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const byId = new Map();
for (const b of data.brands) for (const p of (b.products || [])) byId.set(p.id, { b, p });
const jobs = bad.map(id => byId.get(id)).filter(Boolean);
console.log(`待重抓 ${jobs.length} 个错图`);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

async function fetchBuf(url, timeoutMs = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA, 'Referer': 'https://cn.bing.com/' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
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
  return s.w >= 400 && s.h >= 300 && ratio >= 0.5 && ratio <= 2.2;
}
async function bingImage(kw) {
  const html = await (await fetchBuf(`https://cn.bing.com/images/search?q=${encodeURIComponent(kw)}&form=HDRSC2&first=1`, 15000)).toString();
  return [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)].map(m => m[1].replace(/\\u002f/gi, '/')).slice(0, 8);
}
const CAT_HINT = { auto: '汽车', fashion: '时装', watchjewel: '腕表', beauty: '化妆品', sports: '运动', apparel: '服饰', food: '食品', drinks: '', tech: '数码', home: '家电' };
const crypto = await import('node:crypto');
const HASHFILE = join(IMG, '.hashes.json');
const hashes = (() => { try { return JSON.parse(readFileSync(HASHFILE, 'utf8')); } catch { return {}; } })();
const saveHashes = () => { try { writeFileSync(HASHFILE, JSON.stringify(hashes)); } catch {} };
function contentHash(buf) { return crypto.createHash('md5').update(buf).digest('hex').slice(0, 16); }
function hashTaken(h, selfId) { return hashes[h] && hashes[h] !== selfId; }

let fixed = 0, still = [];
for (const { b, p } of jobs) {
  const hint = CAT_HINT[b.categoryId] || '';
  // 换词顺序:英文全名 → 中文+类型 → 中文+品类词
  const queries = [
    [b.nameEn, p.nameEn || p.name].filter(Boolean).join(' '),
    `${b.name} ${p.name} ${p.type || ''}`.trim(),
    `${b.name} ${p.name} ${hint}`.trim(),
  ].filter(q => q && q.length > 2);
  let saved = false;
  for (const kw of queries) {
    if (saved) break;
    try {
      const murls = await bingImage(kw);
      // 跳过前2个候选(原查询大概率命中过它们),从第3个开始轮
      for (const mu of murls.slice(2)) {
        try {
          const buf = await fetchBuf(mu, 15000);
          const h = contentHash(buf);
          if (buf.length >= 15000 && buf.length <= 4_000_000 && isImg(buf) && looksRight(buf) && !hashTaken(h, p.id)) {
            writeFileSync(join(IMG, p.id + '.jpg'), buf);
            hashes[h] = p.id; saveHashes();
            fixed++; saved = true; break;
          }
        } catch {}
      }
    } catch {}
    await sleep(400);
  }
  if (!saved) still.push(p.id);
}
console.log(`✔ 重抓成功 ${fixed} / 仍未解决 ${still.length}`);
if (still.length) console.log(still.join(','));
