// 等待最后两个数据文件就绪后自动:合并→拉logo→提交→重建APK
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const wait = ms => new Promise(r => setTimeout(r, ms));
const valid = f => { try { const j = JSON.parse(readFileSync(f, 'utf8')); return j.brands.length >= 15; } catch { return false; } };

for (let i = 0; i < 60; i++) {
  const a = valid('data/src/brands.fashion.3.json');
  const b = valid('data/src/brands.sports.2.json');
  console.log(`poll#${i} fashion.3=${a} sports.2=${b}`);
  if (a && b) break;
  await wait(30000);
}

try {
  console.log(execSync('node tools/build-data.mjs', { encoding: 'utf8' }));
  console.log(execSync('node tools/fetch-logos.mjs', { encoding: 'utf8', timeout: 300000 }));
  execSync('"C:\\Program Files\\Git\\bin\\git.exe" add -A', { stdio: 'ignore' });
  execSync('"C:\\Program Files\\Git\\bin\\git.exe" commit -m "v1.0 数据完工:505品牌/fashion.3+sports.2交付" --quiet', { stdio: 'ignore' });
  console.log('COMMITTED');
  execSync('node tools/copy-web.mjs', { encoding: 'utf8' });
  console.log(execSync('node tools/build-apk.mjs', { encoding: 'utf8', timeout: 600000 }));
  console.log('WATCH_DONE');
} catch (e) {
  console.log('WATCH_ERROR', e.message?.slice(0, 300));
}
