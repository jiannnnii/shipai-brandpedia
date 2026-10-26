// 通用工具:转义 / 价格格式化 / 颜色 / 时间
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export const qs  = (sel, el=document) => el.querySelector(sel);
export const qsa = (sel, el=document) => [...el.querySelectorAll(sel)];

export function fmtMoney(n){
  if (n == null || isNaN(n)) return '';
  n = +n;
  if (n >= 1e8) return (n/1e8).toFixed(n % 1e8 ? 2 : 0).replace(/\.?0+$/,'') + '亿';
  if (n >= 1e4) return (n/1e4).toFixed(n % 1e4 ? 2 : 1).replace(/\.?0+$/,'') + '万';
  return String(n);
}
export function fmtPrice(price){
  if (!price) return '';
  const f = fmtMoney;
  if (price.min && price.max && price.min !== price.max) return `¥${f(price.min)} – ${f(price.max)}`;
  if (price.min) return `¥${f(price.min)} 起`;
  if (price.max) return `¥${f(price.max)} 以内`;
  return price.label || '暂无定价';
}
export function timeAgo(t){
  const s = (Date.now() - t) / 1000;
  if (s < 60) return '刚刚';
  if (s < 3600) return Math.floor(s/60) + ' 分钟前';
  if (s < 86400) return Math.floor(s/3600) + ' 小时前';
  if (s < 86400*30) return Math.floor(s/86400) + ' 天前';
  const d = new Date(t);
  return `${d.getMonth()+1}月${d.getDate()}日`;
}
export function debounce(fn, ms=200){
  let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); };
}

export function hashCode(str){
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = (h*31 + str.charCodeAt(i)) | 0; }
  return Math.abs(h);
}
// 品牌主题色:按品类基色 + 品牌名哈希微调,保证同品类色系、品牌间有区分
export function brandColor(brand, categories){
  const cat = categories.find(c => c.id === brand.categoryId);
  const base = cat?.h ?? 30, sat = cat?.s ?? 38;
  const l = 26 + (hashCode(brand.id) % 18);           // 26–44
  const h = (base + (hashCode(brand.name) % 36) - 18 + 360) % 360;
  return `hsl(${h} ${sat}% ${l}%)`;
}
export function initials(brand){
  return (brand.name || brand.nameEn || '?').trim().slice(0, 1);
}
export function logoUrl(brand){
  if (!brand.domain) return '';
  return `https://logo.clearbit.com/${brand.domain}`;
}

const TYPE_ICONS = [
  ['car',      /车|轿|SUV|MPV|超跑|摩托|新能源/i],
  ['dress',    /服装|成衣|时装|高定|皮具|包|鞋|箱包|礼服|外套/i],
  ['watch',    /腕表|手表|机芯|计时/i],
  ['gem',      /珠宝|钻石|项链|戒指|首饰|宝石|翡翠/i],
  ['run',      /运动|跑|健身|户外|球|冲锋衣|瑜伽/i],
  ['building', /家电|冰箱|空调|电视|洗衣机|家居|家具|床垫|沙发/i],
  ['book',     /笔|纸|图书|文具|眼镜/i],
  ['flame',    /香|香水|美妆|护肤|口红|彩妆/i],
  ['store',    /超市|零售|便利|电商/i],
];
export function iconForType(type='', category=''){
  for (const [ic, re] of TYPE_ICONS) if (re.test(type)) return ic;
  return { auto:'car', fashion:'dress', watchjewel:'watch', beauty:'flame',
           sports:'run', apparel:'dress', food:'store', drinks:'store',
           tech:'building', home:'building' }[category] || 'gem';
}
