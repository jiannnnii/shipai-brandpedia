// 生成候选选图清单:列出候选图齐全的产品及其 3 张候选路径
import { readFileSync, writeFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const CAND = join(ROOT, 'data', 'img', 'cand');
const out = join(ROOT, 'data', 'audit', `cand-manifest-${process.argv[2] || 'all'}.json`);

const data = JSON.parse(readFileSync(join(ROOT, 'data', 'index.json'), 'utf8'));
const byId = new Map();
for (const b of data.brands) for (const p of (b.products || [])) byId.set(p.id, { b, p });

// 候选目录里凑满 3 张的 pid
const groups = {};
for (const f of readdirSync(CAND)) {
  const m = f.match(/^(.+)-([123])\.jpg$/);
  if (!m) continue;
  groups[m[1]] = groups[m[1]] || [];
  groups[m[1]].push(f);
}
const items = [];
for (const [pid, files] of Object.entries(groups)) {
  if (files.length < 3) continue;
  const rec = byId.get(pid);
  if (!rec) continue;
  items.push({
    id: pid,
    brand: rec.b.name,
    name: rec.p.name,
    type: rec.p.type || '',
    desc: (rec.p.desc || '').slice(0, 80),
    files: files.sort().map(f => join('data', 'img', 'cand', f)),
  });
}
writeFileSync(out, JSON.stringify(items, null, 1));
console.log(`✔ 候选齐全的产品 ${items.length} 个 → ${out}`);
