// 本地静态服务器:node tools/serve.mjs [端口]  默认 8177
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const root = process.cwd();
const port = +process.argv[2] || 8177;
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = join(root, normalize(p).replace(/^([.][.][\\/])+/, ''));
    if (!file.startsWith(root + sep) && file !== root) { res.statusCode = 403; return res.end(); }
    const data = await readFile(file);
    res.setHeader('Content-Type', mime[extname(file).toLowerCase()] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(data);
  } catch {
    res.statusCode = 404; res.end('404');
  }
}).listen(port, () => console.log(`识牌 dev server → http://localhost:${port}`));
