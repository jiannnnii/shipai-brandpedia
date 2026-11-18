// 应用挑图结果:选中的候选图转正,全否决的删除错图(回落字块)
// 用法:node tools/apply-picks.mjs data/audit/pick-auto2.json [pick-auto3a.json ...]
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const IMG = join(ROOT, 'data', 'img');
const CAND = join(IMG, 'cand');

let applied = 0, removed = 0, missing = 0;
for (const vf of process.argv.slice(2)) {
  const picks = JSON.parse(readFileSync(join(ROOT, vf), 'utf8'));
  for (const p of picks) {
    const target = join(IMG, p.id + '.jpg');
    if (p.pick && existsSync(join(ROOT, p.pick))) {
      copyFileSync(join(ROOT, p.pick), target);
      applied++;
    } else {
      // 全否决:删除错图,回落字块
      if (existsSync(target)) { unlinkSync(target); removed++; }
      else missing++;
    }
  }
}
// 清理已应用的候选文件
try {
  for (const f of readdirSync(CAND)) {
    const pid = f.replace(/-[123]\.jpg$/, '');
    if (existsSync(join(IMG, pid + '.jpg'))) unlinkSync(join(CAND, f));
  }
} catch {}
console.log(`✔ 选图落地:转正 ${applied} / 删除错图 ${removed + missing} (错图回落字块)`);
