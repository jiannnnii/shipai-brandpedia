// 复制 Web 资源到 www/ 供 Capacitor 打包:node tools/copy-web.mjs
import { cpSync, rmSync, existsSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const dst = root + 'www';

rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });

// data 打包 index.json + logos + 产品图(离线完整体验)
for (const item of ['index.html', 'manifest.json', 'css', 'js', 'data']) {
  const src = root + item;
  if (!existsSync(src)) { console.error('缺文件:', src); process.exitCode = 1; continue; }
  cpSync(src, dst + '/' + item, { recursive: true });
}
console.log('✔ 已复制 Web 资源到 www/(含产品图,离线可用)');

