// 批量下载品牌图标到 data/logos/{id}.png
// 用法:node tools/fetch-logos.mjs  读取 data/index.json,并发 6,带重试与尺寸校验
import { mkdirSync, writeFileSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'data', 'logos');
mkdirSync(OUT, { recursive: true });

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const brands = data.brands.filter(b => b.domain);
console.log(`品牌总数 ${brands.length}`);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';

async function fetchBuf(url, timeoutMs = 15000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 500) throw new Error('too small ' + buf.length);
    return buf;
  } finally { clearTimeout(t); }
}

const sources = b => [
  `https://icons.duckduckgo.com/ip3/${b.domain}.ico`,
  `https://icon.horse/icon/${b.domain}`,
  `https://www.google.com/s2/favicons?domain=${b.domain}&sz=128`,
  `https://${b.domain}/favicon.ico`,
  `https://logo.clearbit.com/${b.domain}`,
];

let ok = 0, skip = 0, fail = [];
const queue = [...brands];
const workers = Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const b = queue.shift();
    const file = join(OUT, b.id + '.png');
    if (existsSync(file) && statSync(file).size > 500) { skip++; continue; }
    let done = false;
    for (const url of sources(b)) {
      try { const buf = await fetchBuf(url); writeFileSync(file, buf); ok++; done = true; break; }
      catch {}
    }
    if (!done) fail.push(`${b.id}(${b.domain})`);
  }
});
await Promise.all(workers);
console.log(`✔ 成功 ${ok} / 跳过 ${skip} / 失败 ${fail.length}`);
if (fail.length) console.log('失败清单:', fail.join(', '));
