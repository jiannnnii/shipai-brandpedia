// 高清 logo 重抓:Google256 → worldvectorlogo SVG → icon.horse → 保留旧图
// app 端 logoHtml 优先尝试 {id}.svg → {id}.png → 在线链
import { readdirSync, readFileSync, writeFileSync, existsSync, statSync, unlinkSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'data', 'logos');
mkdirSync(OUT, { recursive: true });

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const brands = data.brands.filter(b => b.domain);
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

async function fetchBuf(url, timeoutMs = 15000, ua = UA) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': ua } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    return buf;
  } finally { clearTimeout(t); }
}

const slugGuesses = b => {
  const en = (b.nameEn || '').toLowerCase().trim();
  const base = en.replace(/&/g, 'and').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  const noDash = base.replace(/-/g, '');
  return [base, noDash, base + '-2', base + '-1', base + '-logo'].filter(s => s && s.length > 1);
};

async function wvlSearch(kw) {
  try {
    const html = await (await fetchBuf('https://worldvectorlogo.com/search/' + encodeURIComponent(kw), 12000)).toString();
    const slugs = [...html.matchAll(/\/logo\/([a-z0-9-]+)/gi)].map(m => m[1]);
    return [...new Set(slugs)];
  } catch { return []; }
}

let svgN = 0, pngUp = 0, keep = 0, fail = [];
const queue = [...brands];
const workers = Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const b = queue.shift();
    const pngPath = join(OUT, b.id + '.png');
    const svgPath = join(OUT, b.id + '.svg');
    if (existsSync(svgPath)) { keep++; continue; }
    let done = false;

    // 1) Google s2 256(彩色位图,比旧的大就替换)
    try {
      const buf = await fetchBuf(`https://www.google.com/s2/favicons?domain=${b.domain}&sz=256`);
      const oldSize = existsSync(pngPath) ? statSync(pngPath).size : 0;
      if (buf.length >= 600 && buf.length > oldSize && buf[0] === 0x89) {
        writeFileSync(pngPath, buf); pngUp++; done = true;
      }
    } catch {}

    // 2) worldvectorlogo SVG(彩色矢量,最高优先展示)
    if (!done) {
      let slugs = slugGuesses(b);
      const searched = await wvlSearch(b.nameEn || b.name);
      slugs = slugs.concat(searched.slice(0, 3));
      for (const slug of slugs) {
        try {
          const buf = await fetchBuf(`https://cdn.worldvectorlogo.com/logos/${slug}.svg`, 12000);
          if (buf.length > 400 && buf.toString('utf8', 0, 100).includes('<svg')) {
            writeFileSync(svgPath, buf); svgN++; done = true; break;
          }
        } catch {}
      }
    }

    // 3) 官方 apple-touch-icon(iPhone UA,180px 常见)
    if (!done) {
      for (const path of ['/apple-touch-icon.png', '/apple-touch-icon-precomposed.png']) {
        try {
          const buf = await fetchBuf(`https://${b.domain}${path}`, 10000, UA_IOS);
          const oldSize = existsSync(pngPath) ? statSync(pngPath).size : 0;
          if (buf.length >= 1000 && buf.length > oldSize && buf[0] === 0x89) {
            writeFileSync(pngPath, buf); pngUp++; done = true; break;
          }
        } catch {}
      }
    }

    if (!done) { keep++; if (!existsSync(pngPath)) fail.push(b.id); }
  }
});
await Promise.all(workers);

// 清掉 <600B 的废图(会显示字块兜底)
let cleaned = 0;
for (const f of readdirSync(OUT)) {
  const p = join(OUT, f);
  if (statSync(p).size < 600) { unlinkSync(p); cleaned++; }
}
console.log(`✔ SVG ${svgN} / PNG升级 ${pngUp} / 维持 ${keep} / 清废图 ${cleaned} / 缺失 ${fail.length}`);
if (fail.length) console.log('缺失:', fail.join(','));
