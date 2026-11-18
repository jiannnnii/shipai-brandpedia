// worldvectorlogo 兜底:为 Bing 失败的品牌找矢量 logo
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const IMG = join(ROOT, 'data', 'logos');
mkdirSync(IMG, { recursive: true });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const ids = (process.argv[2] || '').split(',').filter(Boolean);
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const byId = new Map(data.brands.map(b => [b.id, b]));

async function fetchBuf(url, timeoutMs = 12000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctl.signal, headers: { 'User-Agent': UA } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return Buffer.from(await r.arrayBuffer());
  } finally { clearTimeout(t); }
}

let ok = 0, fail = [];
for (const id of ids) {
  const b = byId.get(id);
  if (!b) continue;
  const en = (b.nameEn || '').toLowerCase().trim();
  const slugs = [en.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), en.replace(/[^a-z0-9]/g, ''), en.replace(/[^a-z0-9]+/g, '-') + '-2', en.replace(/[^a-z0-9]+/g, '-') + '-1'];
  let saved = false;
  // 先搜站内 slug
  try {
    const html = await (await fetchBuf('https://worldvectorlogo.com/search/' + encodeURIComponent(en))).toString();
    const found = [...html.matchAll(/\/logo\/([a-z0-9-]+)/gi)].map(m => m[1]);
    slugs.unshift(...found.slice(0, 3));
  } catch {}
  for (const slug of [...new Set(slugs)].filter(Boolean)) {
    try {
      const buf = await fetchBuf(`https://cdn.worldvectorlogo.com/logos/${slug}.svg`);
      if (buf.length > 400 && buf.toString('utf8', 0, 200).includes('<svg')) {
        writeFileSync(join(IMG, id + '.svg'), buf);
        ok++; saved = true; break;
      }
    } catch {}
    await sleep(200);
  }
  if (!saved) fail.push(id);
  await sleep(300);
}
console.log(`✔ worldvectorlogo 成功 ${ok} / 失败 ${fail.length}`);
if (fail.length) console.log(fail.join(','));
