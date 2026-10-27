// 生成图片审查清单:data/audit/manifest-<cat>.json
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const IMG = join(ROOT, 'data', 'img');
mkdirSync(join(ROOT, 'data', 'audit'), { recursive: true });

const cat = process.argv[2] || '';
const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const items = [];
for (const b of data.brands) {
  if (cat && b.categoryId !== cat) continue;
  for (const p of (b.products || [])) {
    const f = join(IMG, p.id + '.jpg');
    if (existsSync(f) && statSync(f).size > 8000) {
      items.push({ id: p.id, brand: b.name, name: p.name, nameEn: p.nameEn || '', type: p.type || '', desc: (p.desc || '').slice(0, 60), file: join('data', 'img', p.id + '.jpg') });
    }
  }
}
const out = join(ROOT, 'data', 'audit', `manifest-${cat || 'all'}.json`);
writeFileSync(out, JSON.stringify(items, null, 1));
console.log(`✔ 清单 ${items.length} 项 → ${out}`);
