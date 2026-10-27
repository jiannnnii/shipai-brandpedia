// Batch add "sub" field after "tier" for brand objects
const fs = require('fs');
const path = require('path');
const DIR = path.join(__dirname, 'data', 'src');

const VOCAB = {
  fashion: ['高定', '成衣', '皮具', '鞋履', '轻奢', '设计师'],
  beauty: ['高端护肤', '大众护肤', '彩妆', '香氛', '敏感肌', '国货'],
  apparel: ['快时尚', '潮牌', '牛仔', '内衣', '童装', '国民休闲'],
};

const SUB = {
  // ---- fashion.1 ----
  hermes: '皮具', chanel: '高定', 'louis-vuitton': '皮具', dior: '高定', gucci: '皮具',
  prada: '皮具', 'saint-laurent': '成衣', balenciaga: '高定', fendi: '皮具', 'miu-miu': '成衣',
  givenchy: '高定', celine: '皮具', loewe: '皮具', 'bottega-veneta': '皮具', valentino: '高定',
  ferragamo: '鞋履', tods: '鞋履', zegna: '成衣', 'giorgio-armani': '成衣', versace: '成衣',
  'dolce-gabbana': '成衣', 'max-mara': '成衣',
  // ---- fashion.2 ----
  tomford: '设计师', burberry: '成衣', kenzo: '设计师', ralphlauren: '轻奢', tommy: '轻奢',
  calvinklein: '轻奢', moncler: '成衣', canadagoose: '成衣', coach: '轻奢', michaelkors: '轻奢',
  katespade: '轻奢', toryburch: '轻奢', longchamp: '轻奢', furla: '轻奢', bally: '皮具',
  chloe: '成衣', alexandermcqueen: '设计师', stellamccartney: '设计师', viviennewestwood: '设计师',
  moschino: '设计师', robertocavalli: '设计师', etro: '成衣',
  // ---- fashion.3 ----
  marni: '设计师', brunellocucinelli: '成衣', christianlouboutin: '鞋履', rogervivier: '鞋履',
  jimmychoo: '鞋履', manoloblahnik: '鞋履', stuartweitzman: '鞋履', rickowens: '设计师',
  thombrowne: '设计师', isseymiyake: '设计师', cmdesgarcons: '设计师', yohjiyamamoto: '设计师',
  paulsmith: '设计师', jeanpaulgaultier: '设计师', philippplein: '设计师', brooksbrothers: '成衣',
  boss: '成衣', lacoste: '成衣', jnby: '设计师', dazzle: '成衣', cabbeen: '设计师',
  // ---- beauty.1 ----
  lancome: '高端护肤', 'estee-lauder': '高端护肤', guerlain: '香氛', shiseido: '高端护肤',
  'sk-ii': '高端护肤', 'cle-de-peau-beaute': '高端护肤', decorte: '高端护肤', clarins: '高端护肤',
  sisley: '高端护肤', 'helena-rubinstein': '高端护肤', 'la-mer': '高端护肤',
  'la-prairie': '高端护肤', valmont: '高端护肤', skinceuticals: '高端护肤',
  'la-roche-posay': '敏感肌', cerave: '大众护肤', curel: '敏感肌', freeplus: '敏感肌',
  kose: '大众护肤', albion: '高端护肤', 'shu-uemura': '彩妆', 'bobbi-brown': '彩妆',
  'loreal-paris': '大众护肤',
  // ---- beauty.2 ----
  maybelline: '彩妆', mac: '彩妆', nars: '彩妆', maxfactor: '彩妆', perfectdiary: '彩妆',
  florasis: '彩妆', proya: '大众护肤', winona: '敏感肌', jomalone: '香氛',
  ateliercologne: '香氛', diptyque: '香氛', fredericmalle: '香氛', byredo: '香氛',
  acquadiparma: '香氛', penhaligons: '香氛', sergelutens: '香氛', nivea: '大众护肤',
  dovebody: '大众护肤', vaseline: '大众护肤', neutrogena: '大众护肤', schwarzkopf: '大众护肤',
  kerastase: '高端护肤',
  // ---- apparel.1 ----
  uniqlo: '快时尚', zara: '快时尚', hm: '快时尚', gap: '快时尚', ca: '快时尚',
  giordano: '国民休闲', baleno: '国民休闲', metersbonwe: '国民休闲', semir: '国民休闲',
  peacebird: '快时尚', youngor: '国民休闲', hla: '国民休闲', bosideng: '国民休闲',
  yaya: '国民休闲', erdos: '国民休闲', hengyuanxiang: '国民休闲', septwolves: '国民休闲',
  joeone: '国民休闲', only: '快时尚', 'vero-moda': '快时尚', jackjones: '快时尚',
  levis: '牛仔', lee: '牛仔', wrangler: '牛仔', dickies: '潮牌', 'g-star-raw': '牛仔',
  skechers: '快时尚', gu: '快时尚',
  // ---- apparel.2 ----
  supreme: '潮牌', offwhite: '潮牌', palmangels: '潮牌', fearofgod: '潮牌', stussy: '潮牌',
  carhartt: '潮牌', champion: '潮牌', evisu: '牛仔', bape: '潮牌', aape: '潮牌',
  kith: '潮牌', clot: '潮牌', victoriassecret: '内衣', triumph: '内衣', wacoal: '内衣',
  ubras: '内衣', bananain: '内衣', neiwai: '内衣', balabala: '童装', hotwind: '快时尚',
  urbanrevivo: '快时尚', moussy: '牛仔', camel: '国民休闲', jeanswest: '牛仔',
  yishion: '国民休闲', kappa: '潮牌', markfairwhale: '潮牌',
};

const FILES = [
  'brands.fashion.1.json', 'brands.fashion.2.json', 'brands.fashion.3.json',
  'brands.beauty.1.json', 'brands.beauty.2.json',
  'brands.apparel.1.json', 'brands.apparel.2.json',
];

const errors = [];
const report = [];

for (const f of FILES) {
  const fp = path.join(DIR, f);
  const cat = f.match(/^brands\.([a-z]+)\./)[1];
  const root = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const brands = root.brands;
  const dist = {};
  for (const b of brands) {
    const sub = SUB[b.id];
    if (!sub) { errors.push(`${f}: 品牌无映射 ${b.id}(${b.name})`); continue; }
    if (!VOCAB[cat].includes(sub)) { errors.push(`${f}: ${b.id} sub="${sub}" 不在 ${cat} 词表`); }
    if (b.sub !== undefined) errors.push(`${f}: ${b.id} 已有 sub`);
    // rebuild object preserving key order, inserting sub right after tier
    const out = {};
    let placed = false;
    for (const [k, v] of Object.entries(b)) {
      out[k] = v;
      if (k === 'tier') { out.sub = sub; placed = true; }
    }
    if (!placed) { errors.push(`${f}: ${b.id} 缺少 tier 字段`); }
    b.sub = out.sub; // simplest: Object.assign with ordered rebuild below
    // replace in place with ordered copy
    const idx = brands.indexOf(b);
    brands[idx] = out;
    dist[sub] = (dist[sub] || 0) + 1;
  }
  fs.writeFileSync(fp, JSON.stringify(root, null, 2) + '\n', 'utf8');
  report.push({ file: f, count: brands.length, dist });
}

if (errors.length) {
  console.error('ERRORS:\n' + errors.join('\n'));
  process.exit(1);
}
console.log(JSON.stringify(report, null, 2));
