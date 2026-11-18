// 四品类产品图重抓:删除限流期垃圾图 → 用加固版脚本重抓
// 用法:node tools/rescrape-4cats.mjs
import { execSync } from 'node:child_process';
import { readFileSync, unlinkSync, existsSync } from 'node:fs';

const cats = ['watchjewel', 'fashion', 'beauty', 'sports'];
const data = JSON.parse(readFileSync('data/index.json', 'utf8'));

for (const cat of cats) {
  console.log(`\n===== ${cat}:清理旧图 =====`);
  let n = 0;
  for (const b of data.brands) {
    if (b.categoryId !== cat) continue;
    for (const p of (b.products || [])) {
      const f = `data/img/${p.id}.jpg`;
      if (existsSync(f)) { unlinkSync(f); n++; }
    }
  }
  console.log(`删除 ${n} 张旧图`);
  console.log(`===== ${cat}:重抓 ${new Date().toLocaleTimeString('sv-SE')} =====`);
  try {
    const out = execSync(`node --use-system-ca tools/fetch-product-imgs.mjs ${cat}`, {
      encoding: 'utf8', timeout: 3600000, maxBuffer: 10 * 1024 * 1024,
    });
    console.log(out);
  } catch (e) {
    console.log(`${cat} 出错:`, (e.stdout || '').slice(-500), (e.message || '').slice(0, 200));
  }
}
console.log('\nRESCRAPE_4CATS_DONE');
