// 高清 logo 重抓 v2:必应搜「{品牌} logo」,替换 <2KB 的糊图和缺失的
// 用法:node --use-system-ca tools/fetch-logo-bing.mjs
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const IMG = join(ROOT, 'data', 'logos');
mkdirSync(IMG, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const jobs = [];
for (const b of data.brands) {
  const p = join(IMG, b.id + '.png');
  const s = join(IMG, b.id + '.svg');
  const size = (existsSync(p) ? statSync(p).size : 0) + (existsSync(s) ? statSync(s).size : 0);
  if (!b.nameEn) continue;
  if (size < 2000 || (!existsSync(p) && !existsSync(s))) jobs.push(b);
}
console.log(`待重抓 logo ${jobs.length} 个`);

async function fetchBuf(url, timeoutMs = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}
const isImg = buf => (buf[0] === 0xFF && buf[1] === 0xD8) || (buf[0] === 0x89 && buf[1] === 0x50);

async function bingMurls(kw) {
  const html = await (await fetchBuf(`https://cn.bing.com/images/search?q=${encodeURIComponent(kw)}&form=HDRSC2&first=1`, 15000)).toString();
  return [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)].map(m => m[1].replace(/\\u002f/gi, '/')).slice(0, 8);
}

let ok = 0, fail = [];
const queue = [...jobs];
const workers = Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const b = queue.shift();
    let saved = false;
    try {
      const murls = await bingMurls(`${b.nameEn} logo`);
      for (const mu of murls) {
        try {
          const buf = await fetchBuf(mu, 12000);
          if (buf.length >= 5000 && buf.length <= 800_000 && isImg(buf)) {
            writeFileSync(join(IMG, b.id + '.png'), buf);
            ok++; saved = true; break;
          }
        } catch {}
      }
    } catch {}
    if (!saved) fail.push(b.id);
    await sleep(1000 + Math.floor(Math.random() * 1200));
  }
});
await Promise.all(workers);
console.log(`✔ logo 重抓成功 ${ok} / 失败 ${fail.length}`);
if (fail.length) console.log('失败:', fail.join(','));
