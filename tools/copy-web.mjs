// 复制 Web 资源到 www/ 供 Capacitor 打包:node tools/copy-web.mjs
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dst = root + 'www';

rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });

for (const item of ['index.html', 'manifest.json', 'css', 'js']) {
  const src = root + item;
  if (!existsSync(src)) { console.error('缺文件:', src); process.exitCode = 1; continue; }
  cpSync(src, dst + '/' + item, { recursive: true });
}
// data 只打包 index.json 和 logos(产品图走 GitHub 在线加载,方案 C)
mkdirSync(dst + '/data', { recursive: true });
cpSync(root + 'data/index.json', dst + '/data/index.json');
if (existsSync(root + 'data/logos')) cpSync(root + 'data/logos', dst + '/data/logos', { recursive: true });
console.log('✔ 已复制 Web 资源到 www/(产品图不打包,走在线)');

