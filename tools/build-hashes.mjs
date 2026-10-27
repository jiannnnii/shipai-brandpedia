// 从现有图片建立内容哈希注册表
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const IMG = join(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), 'data', 'img');
const HASHFILE = join(IMG, '.hashes.json');
const hashes = existsSync(HASHFILE) ? JSON.parse(readFileSync(HASHFILE, 'utf8')) : {};
let n = 0;
for (const f of readdirSync(IMG)) {
  if (!f.endsWith('.jpg')) continue;
  const id = f.replace('.jpg', '');
  if (Object.values(hashes).includes(id)) continue;
  const h = createHash('md5').update(readFileSync(join(IMG, f))).digest('hex').slice(0, 16);
  if (!hashes[h]) { hashes[h] = id; n++; }
}
writeFileSync(HASHFILE, JSON.stringify(hashes));
console.log('哈希注册表:', Object.keys(hashes).length, '项(新增', n, ')');
