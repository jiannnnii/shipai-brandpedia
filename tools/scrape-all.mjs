// 顺序抓取剩余 9 个品类的产品图(每个品类内部 3 并发)
import { execSync } from 'node:child_process';

const cats = ['watchjewel', 'fashion', 'beauty', 'sports', 'apparel', 'food', 'drinks', 'tech', 'home'];
for (const c of cats) {
  console.log(`\n===== ${c} 开始 ${new Date().toLocaleTimeString('sv-SE')} =====`);
  try {
    const out = execSync(`node tools/fetch-product-imgs.mjs ${c}`, { encoding: 'utf8', timeout: 3600000, maxBuffer: 10 * 1024 * 1024 });
    console.log(out);
  } catch (e) {
    console.log(`${c} 出错:`, (e.stdout || '') + (e.message || '').slice(0, 200));
  }
}
console.log('\nSCRAPE_ALL_DONE');
