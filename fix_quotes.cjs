const fs = require('fs');
const p = 'data/src/brands.food.2.json';
let s = fs.readFileSync(p, 'utf8');
const re = /^(\s*"[^"]*"\s*:\s*)"(.*)"(,?)\s*$/;
const lines = s.split(/\r?\n/);
const out = lines.map(line => {
  // 修复被误转成全角引号的结构性键名引号,如:  “products": [  或  “products”: [
  let l = line
    .replace(/^(\s*)\u201C([^"\u201C\u201D:]*)"/, '$1"$2"')
    .replace(/^(\s*)\u201C([^:\u201C\u201D]*)\u201D:/, '$1"$2":');
  const m = l.match(re);
  if (!m) return l;
  let idx = 0;
  const mid = m[2].replace(/[\u201C\u201D"]/g, () => (idx++ % 2 === 0 ? '\u201C' : '\u201D'));
  return m[1] + '"' + mid + '"' + m[3];
}).join('\n');
fs.writeFileSync(p, out, 'utf8');
try {
  const j = JSON.parse(out);
  console.log('OK', j.brands.length, j.brands.reduce((a, b) => a + b.products.length, 0));
} catch (e) {
  console.error('PARSE FAIL:', e.message);
}
