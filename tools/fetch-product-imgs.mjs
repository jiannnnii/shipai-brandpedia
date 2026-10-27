// 产品图试水:必应图片搜索 → 下载 → data/img/{pid}.jpg
// 用法:node tools/fetch-product-imgs.mjs auto   (参数=品类id,只抓该品类缺图的产品)
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const IMG = join(ROOT, 'data', 'img');
mkdirSync(IMG, { recursive: true });

const cat = process.argv[2] || '';
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
let jobs = [];
for (const b of data.brands) {
  if (cat && b.categoryId !== cat) continue;
  for (const p of (b.products || [])) {
    if (!existsSync(join(IMG, p.id + '.jpg'))) jobs.push({ b, p });
  }
}
console.log(`待抓 ${jobs.length} 个产品(品类:${cat || '全部'})`);
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
const isImg = buf => buf && (buf[0] === 0xFF && buf[1] === 0xD8) || (buf[0] === 0x89 && buf[1] === 0x50) || (buf[0] === 0x52 && buf[1] === 0x49);

// 解析 JPEG/PNG 像素尺寸
function imgSize(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xFF && buf[1] === 0xD8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xFF) { i++; continue; }
      const marker = buf[i + 1];
      if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
        return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}
// 拒绝超宽横幅(游戏截图/头图)和过小的图
function looksRight(buf) {
  const s = imgSize(buf);
  if (!s) return false;
  const ratio = s.w / s.h;
  return s.w >= 400 && s.h >= 300 && ratio >= 0.5 && ratio <= 2.2;
}

const CAT_HINT = { auto: '汽车', fashion: '时装', watchjewel: '腕表', beauty: '化妆品', sports: '运动', apparel: '服饰', food: '食品', drinks: '', tech: '数码', home: '家电' };

async function bingImage(kw) {
  const url = `https://cn.bing.com/images/search?q=${encodeURIComponent(kw)}&form=HDRSC2&first=1`;
  const html = await (await fetchBuf(url, 15000)).toString();
  const murls = [...html.matchAll(/murl&quot;:&quot;(.*?)&quot;/g)].map(m => m[1].replace(/\\u002f/gi, '/'));
  return murls.slice(0, 8);
}

let ok = 0, noresult = 0, dlfail = 0;
const failures = [];
const queue = [...jobs];
const workers = Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const { b, p } = queue.shift();
    const kw = `${b.name} ${p.name} ${CAT_HINT[b.categoryId] || ''}`.trim();
    try {
      const murls = await bingImage(kw);
      let saved = false;
      for (const mu of murls) {
        try {
          const buf = await fetchBuf(mu, 15000);
          if (buf.length >= 15000 && buf.length <= 4_000_000 && isImg(buf) && looksRight(buf)) {
            writeFileSync(join(IMG, p.id + '.jpg'), buf);
            ok++; saved = true; break;
          }
        } catch {}
      }
      if (!saved) { noresult++; failures.push(p.id); }
    } catch { noresult++; failures.push(p.id); }
    await sleep(300 + Math.floor(Math.random() * 500));
  }
});
await Promise.all(workers);
console.log(`✔ 成功 ${ok} / 无结果 ${noresult} (共 ${jobs.length})`);
if (failures.length) console.log('失败清单:', failures.slice(0, 50).join(','), failures.length > 50 ? `…等${failures.length}个` : '');
