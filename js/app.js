import { icons, initTabIcons } from './icons.js';
import {
  store, applyTheme, toggleFav, isFav, markSeen, isSeen, pushHistory,
  setNote, setPrefs, onStore, idb, saveFavs, saveSeen, saveHistory, saveNotes,
} from './store.js';
import {
  esc, qs, qsa, fmtPrice, timeAgo, debounce, brandColor, initials,
  logoUrl, iconForType, fmtMoney,
} from './util.js';

/* ================= 数据 ================= */
let DATA = { categories: [], brands: [], counts: { brands: 0, products: 0 }, version: '' };
const brandById = new Map();
const prodById  = new Map();
const brandsOfCat = new Map();   // catId -> [brand]

function indexData(d) {
  DATA = d;
  brandById.clear(); prodById.clear(); brandsOfCat.clear();
  for (const c of d.categories) brandsOfCat.set(c.id, []);
  for (const b of d.brands) {
    brandById.set(b.id, b);
    (brandsOfCat.get(b.categoryId) || brandsOfCat.set(b.categoryId, []).get(b.categoryId)).push(b);
    for (const p of (b.products || [])) { p.brandId = b.id; prodById.set(p.id, p); }
  }
}

async function loadLocal() {
  const r = await fetch('data/index.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('local data missing');
  return r.json();
}

export async function loadData() {
  let d = null;
  try { d = await loadLocal(); } catch {}
  // 远端数据(条数更多才采用)
  if (store.prefs.remoteUrl) {
    try {
      const r = await fetch(store.prefs.remoteUrl, { cache: 'no-store' });
      if (r.ok) {
        const rd = await r.json();
        if ((rd.counts?.brands || 0) >= (d?.counts?.brands || 0)) {
          rd._src = 'remote'; d = rd; idb.put('remoteData', rd);
        }
      }
    } catch {}
  }
  if (!d) { const c = await idb.get('remoteData'); if (c) { c._src = 'cache'; d = c; } }
  if (!d) d = { categories: [], brands: [], counts: { brands: 0, products: 0 } };
  indexData(d);
}

/* ================= 渲染基建 ================= */
const view = qs('#view');

function setView(html, sub) {
  document.body.classList.toggle('subpage', !!sub);
  view.innerHTML = html;
  window.scrollTo(0, 0);
}

function stagger(sel, step = 30, cap = 420) {
  qsa(sel).forEach((el, i) => {
    el.classList.add('stagger');
    el.style.animationDelay = Math.min(i * step, cap) + 'ms';
  });
}

let toastTimer;
export function toast(msg) {
  const t = qs('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

window.logoFail = img => {
  const chain = (img.dataset.fb || '').split('|').filter(Boolean);
  if (chain.length) {
    img.dataset.fb = chain.slice(1).join('|');
    img.src = chain[0];
    return;
  }
  const d = document.createElement('div');
  d.className = 'logo-fb';
  d.style.setProperty('--c', img.dataset.color || '#555');
  d.style.fontSize = (img.dataset.size || 20) + 'px';
  d.textContent = (img.dataset.name || '?').trim().slice(0, 1);
  img.replaceWith(d);
};

function logoHtml(b, size = 20) {
  const color = brandColor(b, DATA.categories);
  if (!store.prefs.onlineImg) {
    return `<div class="logo-fb" style="--c:${color};font-size:${size}px">${esc(initials(b))}</div>`;
  }
  const fb = [
    `https://icons.duckduckgo.com/ip3/${b.domain}.ico`,
    `https://icon.horse/icon/${b.domain}`,
    `https://www.google.com/s2/favicons?domain=${b.domain}&sz=128`,
  ].join('|');
  return `<img src="data/logos/${esc(b.id)}.png" alt="${esc(b.name)}" loading="lazy"
    data-fb="${esc(fb)}" data-name="${esc(initials(b))}" data-color="${color}" data-size="${size}" onerror="logoFail(this)">`;
}

function prodCard(p, masonry = false) {
  const b = brandById.get(p.brandId) || {};
  const color = brandColor(b, DATA.categories);
  const seen = isSeen('p:' + p.id);
  return `
  <a class="prod-card" href="#/product/${esc(p.id)}">
    <button class="card-fav ${isFav('p:' + p.id) ? 'fav-on' : ''}" data-act="fav" data-ref="p:${esc(p.id)}" aria-label="收藏">${icons[isFav('p:' + p.id) ? 'starFill' : 'star']}</button>
    <div class="prod-media" style="--c:${color}">
      <span class="pm-icon">${icons[iconForType(p.type, b.categoryId)]}</span>
      ${b.domain ? `<img class="pm-logo" src="data/logos/${esc(b.id)}.png" loading="lazy" alt="" onerror="this.remove()">` : ''}
    </div>
    <div class="prod-body">
      <div class="prod-brand">${esc(b.name || '')}</div>
      <div class="prod-name"><span class="pn">${esc(p.name)}</span>${seen ? '<span class="seen-badge">已看</span>' : ''}</div>
      <div class="prod-desc">${esc(p.desc || '')}</div>
      <div class="prod-price">${fmtPrice(p.price)}<small>${esc(p.price?.label || '')}</small></div>
    </div>
  </a>`;
}

function brandTile(b) {
  return `
  <a class="brand-tile" href="#/brand/${esc(b.id)}">
    <span class="bt-logo">${logoHtml(b, 18)}</span>
    <span class="bt-name">${esc(b.name)}</span>
    <span class="bt-en">${esc(b.nameEn || '')}</span>
    <span class="bt-meta">${esc(b.country || '')}${b.founded ? ' · ' + b.founded : ''}</span>
  </a>`;
}

function brandRow(b, sub) {
  return `
  <a class="rowitem" href="#/brand/${esc(b.id)}">
    <span class="ri-logo">${logoHtml(b, 14)}</span>
    <span class="ri-main">
      <span class="ri-name">${esc(b.name)}</span>
      <span class="ri-sub">${esc(sub || b.nameEn || '')}</span>
    </span>
    <span class="ri-time">${esc(b.country || '')}</span>
  </a>`;
}

function prodRow(p) {
  const b = brandById.get(p.brandId) || {};
  return `
  <a class="rowitem" href="#/product/${esc(p.id)}">
    <span class="ri-logo">${logoHtml(b, 14)}</span>
    <span class="ri-main">
      <span class="ri-name">${esc(p.name)} <small style="color:var(--muted);font-weight:400">· ${esc(b.name || '')}</small></span>
      <span class="ri-sub">${fmtPrice(p.price)} · ${esc(p.type || '')}</span>
    </span>
    ${isFav('p:' + p.id) ? `<span style="color:#d4a53f;flex:none">${icons.starFill}</span>` : ''}
  </a>`;
}

/* ================= 首页 ================= */
function viewHome() {
  const cats = DATA.categories;
  const dayIdx = Math.floor(Date.now() / 86400000);
  const pool = DATA.brands.filter(b => (b.products || []).length);
  const featured = pool.length ? pool[dayIdx % pool.length] : null;
  const today = new Date();
  const dateStr = `${today.getFullYear()} 年 ${today.getMonth()+1} 月 ${today.getDate()} 日`;

  const rails = cats.map(c => {
    const list = (brandsOfCat.get(c.id) || []).slice(0, 14);
    if (!list.length) return '';
    return `
    <div class="sect-label"><span class="zh">${esc(c.name)}</span><span class="en">${esc(c.en || '')}</span><span class="rule"></span></div>
    <div class="rail">
      ${list.map(b => `
        <a class="rail-item" href="#/brand/${esc(b.id)}">
          <span class="rail-logo">${logoHtml(b, 18)}</span>
          <span class="ri-name">${esc(b.name)}</span>
        </a>`).join('')}
      <a class="rail-item" href="#/category/${esc(c.id)}" style="display:grid;place-items:center">
        <span class="rail-logo" style="display:grid;place-items:center;color:var(--muted)">${icons.explore}</span>
        <span class="ri-name">全部</span>
      </a>
    </div>`;
  }).join('');

  setView(`
    <header class="home-head">
      <div class="wordmark">识<em>牌</em></div>
      <div class="date">${dateStr}</div>
    </header>

    <a class="search-pill" href="#/search">${icons.search}<span>搜索品牌 / 产品 · 如「劳力士」「SUV」</span></a>

    ${featured ? `
    <div class="sect-label"><span class="zh">今日识牌</span><span class="en">Featured</span><span class="rule"></span></div>
    <a class="feature-card" href="#/brand/${esc(featured.id)}">
      <div class="fc-tag">BRAND OF THE DAY</div>
      <div class="fc-name"><span class="mini-logo">${logoHtml(featured, 20)}</span><span>${esc(featured.name)}</span></div>
      <div class="fc-en">${esc(featured.nameEn || '')} · ${esc(featured.country || '')}</div>
      <div class="fc-desc">${esc(featured.desc || '')}</div>
      <div class="fc-meta">${esc(featured.slogan || '')}</div>
    </a>` : ''}

    <div class="sect-label"><span class="zh">分类逛</span><span class="en">Categories</span><span class="rule"></span></div>
    <div class="cat-grid">
      ${cats.map(c => `
        <a class="cat-card" href="#/category/${esc(c.id)}" style="background:linear-gradient(150deg, hsl(${c.h} ${c.s}% 30%), hsl(${c.h} ${c.s}% 18%))">
          <span class="cc-ic">${icons[c.icon] || icons.gem}</span>
          <span class="cc-count">${(brandsOfCat.get(c.id) || []).length} 品牌</span>
          <span class="cc-name">${esc(c.name)}</span>
          <span class="cc-en">${esc(c.en || '')}</span>
        </a>`).join('')}
    </div>

    ${store.history.length ? `
    <div class="sect-label"><span class="zh">足迹</span><span class="en">History</span><span class="rule"></span><a href="#/me" style="font-size:11px;color:var(--muted)">全部</a></div>
    <div class="rail">
      ${store.history.slice(0, 12).map(h => {
        const [t, id] = h.ref.split(':');
        if (t === 'b') { const b = brandById.get(id); return b ? `<a class="rail-item" href="#/brand/${esc(id)}"><span class="rail-logo">${logoHtml(b, 18)}</span><span class="ri-name">${esc(b.name)}</span></a>` : ''; }
        const p = prodById.get(id);
        if (!p) return '';
        const b = brandById.get(p.brandId) || {};
        return `<a class="rail-item" href="#/product/${esc(p.id)}"><span class="rail-logo">${logoHtml(b, 18)}</span><span class="ri-name">${esc(p.name)}</span></a>`;
      }).join('')}
    </div>` : ''}

    ${rails}
  `, false);
  stagger('.cat-grid > *');
  stagger('.rail > *', 22, 300);
}

/* ================= 品类页 ================= */
const catFilter = {};   // catId -> {tier, country}

function viewCategory(catId) {
  const c = DATA.categories.find(x => x.id === catId);
  if (!c) return setView('<p class="empty-tip">分类不存在</p>', true);
  let list = brandsOfCat.get(catId) || [];
  const tiers = [...new Set(list.map(b => b.tier).filter(Boolean))];
  const countries = [...new Set(list.map(b => b.country).filter(Boolean))];
  const f = catFilter[catId] || (catFilter[catId] = { tier: '全部', country: '全部' });

  const chipRow = (group, vals) => `
    <div class="chipbar" data-chipgroup="${group}">
      ${['全部', ...vals].map(v =>
        `<button class="chip ${f[group] === v ? 'on' : ''}" data-act="cat-chip" data-cat="${esc(catId)}" data-group="${group}" data-val="${esc(v)}">${esc(v)}</button>`).join('')}
    </div>`;

  const renderGrid = () => {
    let l = list.filter(b =>
      (f.tier === '全部' || b.tier === f.tier) &&
      (f.country === '全部' || b.country === f.country));
    l = [...l].sort((a, b) => (b.products || []).length - (a.products || []).length);
    const g = qs('#brandGrid');
    g.innerHTML = l.length
      ? `<div class="brand-grid">${l.map(brandTile).join('')}</div>`
      : '<p class="empty-tip">没有符合筛选的品牌</p>';
    stagger('.brand-grid > *', 26, 400);
  };

  setView(`
    <div class="subhead">
      <button class="backbtn" data-act="back">${icons.back}</button>
      <div class="sh-title">${esc(c.name)}</div>
    </div>
    <div class="cat-hero" style="padding-top:10px">
      <div class="ch-en" style="color:hsl(${c.h} ${c.s}% 45%)">${esc(c.en || '')}</div>
      <div class="ch-desc" style="margin-top:6px">${esc(c.desc || '')} · 共 ${list.length} 个品牌</div>
    </div>
    ${tiers.length > 1 ? chipRow('tier', tiers) : ''}
    ${countries.length > 1 ? chipRow('country', countries) : ''}
    <div id="brandGrid" style="margin-top:6px"></div>
  `, true);

  renderGrid();
}

/* ================= 品牌页 ================= */
const brandProdFilter = {};

function viewBrand(id) {
  const b = brandById.get(id);
  if (!b) return setView('<p class="empty-tip">品牌不存在</p>', true);
  const cat = DATA.categories.find(c => c.id === b.categoryId) || {};
  const color = brandColor(b, DATA.categories);
  const prods = b.products || [];
  const types = [...new Set(prods.map(p => p.type).filter(Boolean))];
  const f = brandProdFilter[id] || (brandProdFilter[id] = '全部');
  const favRef = 'b:' + b.id;

  setView(`
    <div class="subhead">
      <button class="backbtn" data-act="back">${icons.back}</button>
      <div class="sh-title">${esc(b.name)}</div>
      <button class="iconbtn ${isFav(favRef) ? 'fav-on' : ''}" data-act="fav" data-ref="${favRef}" aria-label="收藏品牌">${icons[isFav(favRef) ? 'starFill' : 'star']}</button>
    </div>

    <div class="brand-hero">
      <div class="bh-logo">${logoHtml(b, 30)}</div>
      <div class="bh-name">${esc(b.name)}</div>
      <div class="bh-en">${esc(b.nameEn || '')}</div>
      ${b.slogan ? `<div class="bh-slogan">「${esc(b.slogan)}」</div>` : ''}
    </div>

    <div class="meta-line">
      ${b.country ? `<div class="mi"><b>${esc(b.country)}</b><span>国家</span></div>` : ''}
      ${b.founded ? `<div class="mi"><b>${esc(String(b.founded))}</b><span>创立</span></div>` : ''}
      ${b.hq ? `<div class="mi"><b>${esc(b.hq)}</b><span>总部</span></div>` : ''}
      ${b.tier ? `<div class="mi"><b>${esc(b.tier)}</b><span>定位</span></div>` : ''}
    </div>

    ${(b.tags || []).length ? `<div class="hl-chips" style="justify-content:center">${b.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>` : ''}

    ${b.story ? `<div class="sect-label"><span class="zh">品牌故事</span><span class="en">Story</span><span class="rule"></span></div>
    <div class="brand-story">${b.story.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}</div>` : (b.desc ? `<div class="brand-story"><p>${esc(b.desc)}</p></div>` : '')}

    ${prods.length ? `
    <div class="sect-label"><span class="zh">产品系列</span><span class="en">Products</span><span class="rule"></span>
      <span style="font-size:11px;color:var(--muted)">${prods.length} 条</span></div>
    ${types.length > 1 ? `<div class="chipbar" style="position:static;backdrop-filter:none;background:none;padding-top:0">
      ${['全部', ...types].map(t => `<button class="chip ${f === t ? 'on' : ''}" data-act="btype" data-id="${esc(id)}" data-val="${esc(t)}">${esc(t)}</button>`).join('')}
    </div>` : ''}
    <div class="prod-list" id="brandProds"></div>` : '<p class="empty-tip">暂无产品数据</p>'}

    <div style="height:26px"></div>
  `, true);

  const renderProds = () => {
    const g = qs('#brandProds'); if (!g) return;
    const l = f === '全部' ? prods : prods.filter(p => p.type === f);
    g.innerHTML = l.length ? l.map(p => prodCard(p)).join('') : '<p class="empty-tip">该类型暂无产品</p>';
    stagger('.prod-list > *', 30, 360);
  };
  renderProds();
  pushHistory('b:' + b.id);
}

/* ================= 产品页 ================= */
function viewProduct(id) {
  const p = prodById.get(id);
  if (!p) return setView('<p class="empty-tip">产品不存在</p>', true);
  const b = brandById.get(p.brandId) || {};
  const cat = DATA.categories.find(c => c.id === b.categoryId) || {};
  const color = brandColor(b, DATA.categories);
  const favRef = 'p:' + p.id;
  const ref = favRef;

  const wiki = `https://zh.wikipedia.org/w/index.php?search=${encodeURIComponent(b.name + ' ' + p.name)}`;
  const jd   = `https://search.jd.com/Search?keyword=${encodeURIComponent(b.name + ' ' + p.name)}`;
  const tm   = `https://list.tmall.com/search_product.htm?q=${encodeURIComponent(b.name + ' ' + p.name)}`;
  const bing = `https://www.bing.com/search?q=${encodeURIComponent(b.name + ' ' + p.name)}`;
  const site = b.domain ? `https://${b.domain}` : '';

  setView(`
    <div class="subhead">
      <button class="backbtn" data-act="back">${icons.back}</button>
      <div class="sh-title">${esc(b.name)} · ${esc(p.name)}</div>
      <button class="iconbtn ${isFav(favRef) ? 'fav-on' : ''}" data-act="fav" data-ref="${favRef}">${icons[isFav(favRef) ? 'starFill' : 'star']}</button>
    </div>

    <div class="crumb"><a href="#/category/${esc(cat.id || '')}">${esc(cat.name || '')}</a> · <a href="#/brand/${esc(b.id || '')}">${esc(b.name || '')}</a></div>

    <div class="pd-media" style="--c:${color}">
      ${store.prefs.onlineImg && p.image
        ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.remove()">` : ''}
      ${(!store.prefs.onlineImg || !p.image) ? `<span class="pm-big">${icons[iconForType(p.type, b.categoryId)]}</span>` : ''}
      ${b.domain ? `<img class="pm-logo" src="data/logos/${esc(b.id)}.png" alt="" onerror="this.remove()">` : ''}
      ${p.type ? `<span class="pm-type">${esc(p.type)}</span>` : ''}
    </div>

    <div class="pd-head">
      <div>
        <h1>${esc(p.name)}</h1>
        ${p.nameEn ? `<div class="pd-en">${esc(p.nameEn)}</div>` : ''}
      </div>
    </div>
    <div class="pd-brand-line">来自品牌 <a href="#/brand/${esc(b.id || '')}">${esc(b.name || '')}</a>${b.nameEn ? ` · ${esc(b.nameEn)}` : ''}</div>

    <div class="price-panel">
      <div>
        <div class="pp-val">${fmtPrice(p.price)}</div>
        <div class="pp-label">${esc(p.price?.label || '参考价格')}</div>
      </div>
      <div style="font-size:10.5px;color:var(--muted);text-align:right;line-height:1.7">AI 整理参考价<br>点下方链接查实时</div>
    </div>

    ${(p.highlights || []).length || (p.tags || []).length ? `
    <div class="hl-chips">
      ${(p.highlights || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
      ${(p.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
    </div>` : ''}

    ${p.desc ? `<div class="pd-desc">${esc(p.desc)}</div>` : ''}

    <div class="act-row">
      <button class="act-btn ${isFav(favRef) ? 'fav-on' : ''}" data-act="fav" data-ref="${favRef}">
        ${icons[isFav(favRef) ? 'starFill' : 'star']} ${isFav(favRef) ? '已收藏' : '收藏'}
      </button>
      <button class="act-btn ${isSeen(ref) ? 'seen-on' : ''}" data-act="seen" data-ref="${ref}">
        ${icons.check} ${isSeen(ref) ? '已看过' : '标记已看'}
      </button>
    </div>

    <div class="sect-label"><span class="zh">去别处看看</span><span class="en">Links</span><span class="rule"></span></div>
    <div class="ext-links">
      <a href="${wiki}" target="_blank" rel="noopener">${icons.wiki} 维基百科</a>
      ${site ? `<a href="${esc(site)}" target="_blank" rel="noopener">${icons.globe} 品牌官网</a>` : ''}
      <a href="${jd}" target="_blank" rel="noopener">${icons.store} 京东搜索</a>
      <a href="${tm}" target="_blank" rel="noopener">${icons.store} 天猫搜索</a>
      <a href="${bing}" target="_blank" rel="noopener" style="grid-column:1/-1">${icons.search} 必应搜索实时信息</a>
    </div>

    <div class="note-box">
      <label>我的笔记</label>
      <textarea id="noteArea" placeholder="记点什么…比如「试驾过,底盘偏硬」「朋友说这个包的五金容易花」">${esc(store.notes[ref] || '')}</textarea>
      <button class="nb-save" data-act="note-save" data-ref="${ref}">保存笔记</button>
    </div>

    <div class="verify-box">
      <div class="vb-head">
        <span>联网核实</span>
        <button class="mini-btn ${store.prefs.apiKey ? '' : 'ghost'}" data-act="verify" data-ref="${ref}">${store.prefs.apiKey ? 'AI 核实' : '未配置 Key'}</button>
      </div>
      <div class="vb-res" id="verifyRes" style="display:none"></div>
    </div>

    ${(() => {
      const siblings = (b.products || []).filter(x => x.id !== p.id).slice(0, 10);
      if (!siblings.length) return '';
      return `
      <div class="sect-label"><span class="zh">该品牌还有</span><span class="en">More</span><span class="rule"></span>
        <a href="#/brand/${esc(b.id)}" style="font-size:11px;color:var(--muted)">进店</a></div>
      <div class="rail">
        ${siblings.map(x => `
          <a class="rail-item" style="width:120px" href="#/product/${esc(x.id)}">
            <span class="rail-logo" style="width:100%;height:86px;border-radius:14px;background:linear-gradient(135deg, color-mix(in srgb, ${color} 26%, var(--surface)), var(--surface2))">
              <span style="width:30px;height:30px;color:${color};opacity:.85">${icons[iconForType(x.type, b.categoryId)]}</span>
            </span>
            <span class="ri-name">${esc(x.name)}</span>
            <span style="font-size:10.5px;color:var(--muted)">${fmtPrice(x.price)}</span>
          </a>`).join('')}
      </div>`;
    })()}

    <div style="height:30px"></div>
  `, true);

  markSeen(ref);
  pushHistory(ref);
}

async function doVerify(ref) {
  const box = qs('#verifyRes');
  if (!box) return;
  if (!store.prefs.apiKey) { toast('先在「我的 → 设置」里填 AI API Key'); return; }
  const [t, id] = ref.split(':');
  const p = prodById.get(id); const b = brandById.get(p?.brandId);
  if (!p) return;
  box.style.display = 'block';
  box.textContent = '正在联网核实…';
  try {
    const base = store.prefs.apiBase || 'https://open.bigmodel.cn/api/paas/v4';
    const res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + store.prefs.apiKey },
      body: JSON.stringify({
        model: store.prefs.model || 'glm-4.5-flash',
        messages: [{
          role: 'user',
          content: `请核实以下品牌产品信息是否准确(基于你的知识)。若有错误,一句话指出并给更准确的说法;若基本准确,回答"信息基本准确"。不要展开。\n品牌:${b?.name} (${b?.nameEn || ''})\n产品:${p.name} (${p.nameEn || ''})\n类型:${p.type || ''}\n价格:${fmtPrice(p.price)}\n介绍:${p.desc || ''}`,
        }],
        temperature: 0.2,
      }),
    });
    const j = await res.json();
    box.textContent = j.choices?.[0]?.message?.content?.trim() || ('接口返回:' + JSON.stringify(j).slice(0, 300));
  } catch (e) {
    box.textContent = '核实失败:' + e.message + '(可能是浏览器跨域限制,可换用支持 CORS 的接口地址)';
  }
}

/* ================= 探索 ================= */
const PAGE = 18;
let exploreShown = PAGE;
let exploreIO = null;

function viewExplore() {
  const cats = DATA.categories;
  setView(`
    <div class="cat-hero">
      <div class="ch-en">Explore</div>
      <div class="ch-name" style="font-size:26px">探索产品流</div>
    </div>
    <div class="chipbar" style="position:static;background:none;backdrop-filter:none;padding-top:4px">
      <button class="chip ${ui.exploreCat === 'all' ? 'on' : ''}" data-act="ex-cat" data-val="all">全部</button>
      ${cats.map(c => `<button class="chip ${ui.exploreCat === c.id ? 'on' : ''}" data-act="ex-cat" data-val="${esc(c.id)}">${esc(c.name)}</button>`).join('')}
      <button class="chip" style="margin-left:auto;background:var(--ink);color:var(--bg);border-color:var(--ink)" data-act="random">🎲 随便逛逛</button>
    </div>
    <div class="masonry" id="masonry">
      <div class="m-col" id="mcol0"></div>
      <div class="m-col" id="mcol1"></div>
    </div>
    <div id="sentinel"></div>
    <p class="empty-tip" id="exEmpty" style="display:none">这个分类还没有产品</p>
  `, false);

  exploreShown = 0;
  qs('#mcol0').innerHTML = '';
  qs('#mcol1').innerHTML = '';
  renderMore();
  if (exploreIO) exploreIO.disconnect();
  exploreIO = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) renderMore();
  }, { rootMargin: '600px' });
  exploreIO.observe(qs('#sentinel'));
}

function explorePool() {
  let all = [];
  const cats = ui.exploreCat === 'all' ? DATA.categories.map(c => c.id) : [ui.exploreCat];
  for (const cid of cats) for (const b of (brandsOfCat.get(cid) || [])) for (const p of (b.products || [])) all.push(p);
  // 随机打散(每次进入顺序不同,逛起来新鲜)
  for (let i = all.length - 1; i > 0; i--) { const j = (i * 2654435761 + Date.now()) % (i + 1); [all[i], all[j]] = [all[j], all[i]]; }
  return all;
}

function renderMore() {
  const pool = explorePool();
  const cols = [qs('#mcol0'), qs('#mcol1')];
  if (!cols[0] || !cols[1]) return;
  const chunk = pool.slice(exploreShown, exploreShown + PAGE);
  if (!pool.length) qs('#exEmpty').style.display = 'block';
  if (!chunk.length) return;
  chunk.forEach((p, i) => {
    const col = cols[(exploreShown + i) % 2];
    col.insertAdjacentHTML('beforeend', prodCard(p, true));
    const el = col.lastElementChild;
    el.classList.add('stagger');
    el.style.animationDelay = Math.min(i * 30, 320) + 'ms';
  });
  exploreShown += chunk.length;
}

/* ================= 搜索 ================= */
function viewSearch() {
  setView(`
    <div class="search-head">
      <div class="search-input-wrap">
        ${icons.search}
        <input id="searchInput" type="text" placeholder="搜品牌 / 产品 / 国家 / 关键词" autocomplete="off">
        <button class="si-clear" id="siClear">${icons.x}</button>
      </div>
      <div class="hot-words" id="hotWords"></div>
    </div>
    <div id="searchRes"></div>
  `, false);

  const hot = ['劳力士', '法拉利', '爱马仕', 'Nike', '索尼', '茅台', '戴森', 'SUV', '瑞士', '日本'];
  qs('#hotWords').innerHTML = hot.map(w => `<button class="chip" data-act="hot" data-val="${esc(w)}">${esc(w)}</button>`).join('');

  const input = qs('#searchInput');
  input.focus();
  input.addEventListener('input', debounce(() => doSearch(input.value), 160));
  qs('#siClear').addEventListener('click', () => { input.value = ''; doSearch(''); input.focus(); });
}

function doSearch(qRaw) {
  const q = qRaw.trim().toLowerCase();
  const resBox = qs('#searchRes'); if (!resBox) return;
  qs('#siClear').style.display = q ? 'block' : 'none';
  if (!q) { resBox.innerHTML = ''; return; }

  const match = s => (s || '').toLowerCase().includes(q);
  const brands = DATA.brands.filter(b => match(b.name) || match(b.nameEn) || match(b.country) || match(b.tier) || (b.tags || []).some(match)).slice(0, 24);
  const prods = [];
  for (const b of DATA.brands) {
    for (const p of (b.products || [])) {
      if (match(p.name) || match(p.nameEn) || match(p.type) || match(p.desc) || (p.tags || []).some(match)) prods.push(p);
      if (prods.length >= 40) break;
    }
    if (prods.length >= 40) break;
  }

  resBox.innerHTML = `
    ${brands.length ? `<div class="sr-sect"><div class="sect-label"><span class="zh">品牌</span><span class="rule"></span></div>
      <div class="brand-grid" style="grid-template-columns:repeat(2,1fr)">${brands.map(brandTile).join('')}</div></div>` : ''}
    ${prods.length ? `<div class="sr-sect"><div class="sect-label"><span class="zh">产品</span><span class="rule"></span></div>
      <div class="prod-list">${prods.slice(0, 20).map(p => prodCard(p)).join('')}</div></div>` : ''}
    ${!brands.length && !prods.length ? '<p class="empty-tip">没找到,换个词试试</p>' : ''}`;
}

/* ================= 我的 ================= */
const meState = { tab: 'favs' };

function viewMe() {
  setView(`
    <header class="home-head"><div class="wordmark">我的<em>识牌</em></div><div class="date">MY MUSEUM</div></header>

    <div class="me-stats">
      <div class="ms"><b>${store.favs.size}</b><span>收藏</span></div>
      <div class="ms"><b>${store.history.length}</b><span>足迹</span></div>
      <div class="ms"><b>${store.seen.size}</b><span>已看</span></div>
      <div class="ms"><b>${DATA.counts?.brands || 0}</b><span>品牌库</span></div>
    </div>

    <div class="seg">
      ${['favs', 'history', 'settings'].map(t =>
        `<button class="chip ${meState.tab === t ? 'on' : ''}" data-act="me-tab" data-val="${t}">${{ favs: '收藏', history: '足迹', settings: '设置' }[t]}</button>`).join('')}
    </div>

    <div id="mePanel"></div>
  `, false);
  renderMePanel();
}

function renderMePanel() {
  const panel = qs('#mePanel'); if (!panel) return;
  if (meState.tab === 'favs') {
    const prods = [], brands = [];
    for (const ref of store.favs) (ref[0] === 'p' ? prods : brands).push(ref.slice(2));
    panel.innerHTML = (prods.length || brands.length) ? `
      ${brands.length ? `<div class="sect-label"><span class="zh">收藏的品牌</span><span class="rule"></span></div>
        <div class="rowlist">${brands.map(id => brandById.get(id)).filter(Boolean).map(b => brandRow(b, b.nameEn)).join('')}</div>` : ''}
      ${prods.length ? `<div class="sect-label"><span class="zh">收藏的产品</span><span class="rule"></span></div>
        <div class="rowlist">${prods.map(id => prodById.get(id)).filter(Boolean).map(prodRow).join('')}</div>` : ''}`
      : '<p class="empty-tip">还没有收藏<br><small>看到喜欢的品牌或产品,点 ★ 收起来</small></p>';
  } else if (meState.tab === 'history') {
    panel.innerHTML = store.history.length ? `
      <div class="sect-label"><span class="zh">浏览足迹</span><span class="en">History</span><span class="rule"></span>
        <button class="mini-btn ghost" data-act="clear-history">清空</button></div>
      <div class="rowlist">${store.history.map(h => {
        const [t, id] = h.ref.split(':');
        const main = t === 'b' ? brandById.get(id) : prodById.get(id);
        if (!main) return '';
        const b = t === 'p' ? brandById.get(main.brandId) : null;
        return `
        <a class="rowitem" href="#/${t === 'b' ? 'brand' : 'product'}/${esc(id)}">
          <span class="ri-logo">${logoHtml(t === 'b' ? main : b, 14)}</span>
          <span class="ri-main">
            <span class="ri-name">${esc(main.name)}</span>
            <span class="ri-sub">${esc(b ? b.name : (main.nameEn || ''))}</span>
          </span>
          <span class="ri-time">${timeAgo(h.t)}</span>
        </a>`;
      }).join('')}</div>`
      : '<p class="empty-tip">足迹会出现在这里</p>';
  } else {
    panel.innerHTML = `
      <div class="set-group">
        <div class="sg-label">外观</div>
        <div class="set-row">
          <span class="sr-label">主题<small>奢侈品默认深色更有质感</small></span>
          <select id="setTheme">
            <option value="auto" ${store.prefs.theme === 'auto' ? 'selected' : ''}>跟随系统</option>
            <option value="light" ${store.prefs.theme === 'light' ? 'selected' : ''}>浅色</option>
            <option value="dark" ${store.prefs.theme === 'dark' ? 'selected' : ''}>深色</option>
          </select>
        </div>
        <div class="set-row">
          <span class="sr-label">在线图片<small>关掉可省流量(用本地占位图)</small></span>
          <label class="switch"><input type="checkbox" id="setImg" ${store.prefs.onlineImg ? 'checked' : ''}><span class="sl"></span></label>
        </div>
      </div>

      <div class="set-group">
        <div class="sg-label">数据源</div>
        <div class="set-row" style="flex-direction:column;align-items:stretch;gap:8px">
          <span class="sr-label">远端数据地址(GitHub Raw)<small>留空 = 只用内置数据。填了以后启动自动拉最新。</small></span>
          <input type="text" id="setRemote" placeholder="https://raw.githubusercontent.com/…/data/index.json" value="${esc(store.prefs.remoteUrl)}">
        </div>
        <div class="set-row">
          <span class="sr-label">当前数据<small id="dataMeta">${esc(DATA.version || '内置数据')} · ${DATA.counts?.brands || 0} 品牌 / ${DATA.counts?.products || 0} 产品${DATA._src ? ' · ' + (DATA._src === 'remote' ? '远端' : DATA._src === 'cache' ? '缓存' : '内置') : ''}</small></span>
          <button class="mini-btn" data-act="check-update">检查更新</button>
        </div>
        <div class="set-row">
          <span class="sr-label">本地记录<small>收藏 / 足迹 / 笔记</small></span>
          <button class="mini-btn ghost" data-act="export">导出</button>
          <button class="mini-btn ghost" data-act="import">导入</button>
          <input type="file" id="importFile" accept=".json" style="display:none">
        </div>
      </div>

      <div class="set-group">
        <div class="sg-label">AI 联网核实</div>
        <div class="set-row" style="flex-direction:column;align-items:stretch;gap:8px">
          <span class="sr-label">API Key<small>智谱 / OpenAI 兼容格式,留空则用外链自查</small></span>
          <input type="password" id="setKey" placeholder="sk-…" value="${esc(store.prefs.apiKey)}">
        </div>
        <div class="set-row">
          <span class="sr-label">接口地址</span>
          <input type="text" id="setApiBase" value="${esc(store.prefs.apiBase || 'https://open.bigmodel.cn/api/paas/v4')}">
        </div>
        <div class="set-row">
          <span class="sr-label">模型</span>
          <input type="text" id="setModel" value="${esc(store.prefs.model)}">
        </div>
      </div>

      <div class="set-group">
        <div class="sg-label">关于</div>
        <div class="set-row"><span class="sr-label">识牌 BrandPedia<small>v1.0 · 只属于一个人的品牌百科</small></span></div>
        <div class="set-row"><button class="mini-btn ghost" data-act="clear-cache">清除全部本地数据</button></div>
      </div>
      <div style="height:20px"></div>`;

    qs('#setTheme').addEventListener('change', e => setPrefs({ theme: e.target.value }));
    qs('#setImg').addEventListener('change', e => { setPrefs({ onlineImg: e.target.checked }); renderRoute(); });
    qs('#setRemote').addEventListener('change', e => setPrefs({ remoteUrl: e.target.value.trim() }));
    qs('#setKey').addEventListener('change', e => setPrefs({ apiKey: e.target.value.trim() }));
    qs('#setApiBase').addEventListener('change', e => setPrefs({ apiBase: e.target.value.trim() }));
    qs('#setModel').addEventListener('change', e => setPrefs({ model: e.target.value.trim() }));
    qs('#importFile').addEventListener('change', importBackup);
  }
}

async function checkUpdate() {
  if (!store.prefs.remoteUrl) return toast('先填远端数据地址');
  toast('正在检查…');
  try {
    const r = await fetch(store.prefs.remoteUrl, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const rd = await r.json();
    await idb.put('remoteData', rd);
    indexData(rd);
    toast(`已更新:${rd.counts?.brands || 0} 品牌 / ${rd.counts?.products || 0} 产品`);
    renderMePanel();
  } catch (e) { toast('更新失败:' + e.message); }
}

function exportBackup() {
  const data = { favs: [...store.favs], seen: [...store.seen], history: store.history, notes: store.notes, prefs: { ...store.prefs, apiKey: '' } };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'shipai-backup.json';
  a.click();
  toast('已导出备份文件');
}

function importBackup(e) {
  const file = e.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (d.favs) { store.favs = new Set(d.favs); saveFavs(); }
      if (d.seen) { store.seen = new Set(d.seen); saveSeen(); }
      if (d.history) { store.history = d.history; saveHistory(); }
      if (d.notes) { Object.assign(store.notes, d.notes); saveNotes(); }
      toast('导入成功'); renderMePanel();
    } catch { toast('文件格式不对'); }
  };
  r.readAsText(file);
}

/* ================= 路由 ================= */
const ui = { exploreCat: 'all' };

export function renderRoute() {
  const h = location.hash.replace(/^#\/?/, '');
  const [head, ...rest] = h.split('/');
  if (head === 'category' && rest[0]) return viewCategory(rest[0]);
  if (head === 'brand' && rest[0]) return viewBrand(rest[0]);
  if (head === 'product' && rest[0]) return viewProduct(rest[0]);
  if (head === 'explore') return viewExplore();
  if (head === 'search') return viewSearch();
  if (head === 'me') return viewMe();
  return viewHome();
}

function activateTab() {
  const h = location.hash;
  const name = h.startsWith('#/explore') ? 'explore' : h.startsWith('#/search') ? 'search'
    : h.startsWith('#/me') ? 'me' : 'home';
  qsa('#tabbar .tab').forEach(t => t.classList.toggle('on', t.dataset.tab === name));
}

/* ================= 全局事件 ================= */
document.addEventListener('click', e => {
  const fav = e.target.closest('[data-act="fav"]');
  if (fav) {
    e.preventDefault(); e.stopPropagation();
    const on = toggleFav(fav.dataset.ref);
    toast(on ? '已收藏 ★' : '取消收藏');
    const [t] = fav.dataset.ref.split(':');
    // 局部刷新按钮态
    qsa(`[data-act="fav"][data-ref="${fav.dataset.ref}"]`).forEach(el => {
      const on2 = isFav(fav.dataset.ref);
      el.classList.toggle('fav-on', on2);
      if (el.classList.contains('act-btn')) el.innerHTML = `${icons[on2 ? 'starFill' : 'star']} ${on2 ? '已收藏' : '收藏'}`;
      if (el.classList.contains('iconbtn') || el.classList.contains('card-fav')) el.innerHTML = icons[on2 ? 'starFill' : 'star'];
    });
    return;
  }
  const seen = e.target.closest('[data-act="seen"]');
  if (seen) {
    e.preventDefault(); e.stopPropagation();
    markSeen(seen.dataset.ref);
    seen.classList.add('seen-on');
    seen.innerHTML = `${icons.check} 已看过`;
    toast('已标记为看过');
    return;
  }
  const el = e.target.closest('[data-act]');
  if (!el) return;
  switch (el.dataset.act) {
    case 'back': history.length > 1 ? history.back() : (location.hash = '#/home'); break;
    case 'cat-chip': {
      const f = catFilter[el.dataset.cat];
      f[el.dataset.group] = el.dataset.val;
      qsa(`[data-act="cat-chip"][data-group="${el.dataset.group}"]`).forEach(c => c.classList.toggle('on', c.dataset.val === el.dataset.val));
      const sy = window.scrollY;
      viewCategory(el.dataset.cat);
      window.scrollTo(0, sy);
      break;
    }
    case 'btype': {
      brandProdFilter[el.dataset.id] = el.dataset.val;
      const sy = window.scrollY;
      viewBrand(el.dataset.id);
      const g = qs('#brandProds');
      if (g) window.scrollTo(0, Math.min(sy, document.body.scrollHeight));
      break;
    }
    case 'ex-cat': {
      ui.exploreCat = el.dataset.val;
      viewExplore();
      break;
    }
    case 'random': {
      const all = [...prodById.values()];
      if (!all.length) break;
      const p = all[Math.floor(Math.random() * all.length)];
      toast('命运带你去看:' + p.name);
      location.hash = '#/product/' + p.id;
      break;
    }
    case 'hot': {
      const inp = qs('#searchInput');
      inp.value = el.dataset.val;
      doSearch(el.dataset.val);
      break;
    }
    case 'me-tab': {
      meState.tab = el.dataset.val;
      qsa('[data-act="me-tab"]').forEach(c => c.classList.toggle('on', c === el));
      renderMePanel();
      break;
    }
    case 'note-save': {
      const ta = qs('#noteArea');
      setNote(el.dataset.ref, ta.value);
      toast('笔记已保存');
      break;
    }
    case 'verify': doVerify(el.dataset.ref); break;
    case 'check-update': checkUpdate(); break;
    case 'export': exportBackup(); break;
    case 'import': qs('#importFile').click(); break;
    case 'clear-history': {
      store.history = []; saveHistory(); renderMePanel(); toast('足迹已清空');
      break;
    }
    case 'clear-cache': {
      if (confirm('确定清除所有收藏、足迹、笔记和设置?不可恢复。')) {
        Object.keys(localStorage).filter(k => k.startsWith('bp.')).forEach(k => localStorage.removeItem(k));
        location.reload();
      }
      break;
    }
  }
});

/* ================= 启动 ================= */
applyTheme();
initTabIcons();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (store.prefs.theme === 'auto') applyTheme();
});
window.addEventListener('hashchange', () => { renderRoute(); activateTab(); });

// 安卓物理返回键:优先页内回退,首页再退出
try {
  import('@capacitor/app').then(({ App }) => {
    App.addListener('backButton', () => {
      const h = location.hash.replace(/^#\/?/, '');
      if (h && !['home', 'explore', 'search', 'me', ''].includes(h)) {
        history.back();
      } else if (h) {
        location.hash = '#/home';
      } else {
        App.exitApp();
      }
    });
  }).catch(() => {});
} catch {}

view.innerHTML = `
  <div style="padding-top:40vh;display:grid;gap:14px;justify-items:center">
    <div class="wordmark" style="font-size:36px">识<em>牌</em></div>
    <div class="skel" style="width:120px;height:8px;border-radius:99px"></div>
  </div>`;

loadData().then(() => {
  renderRoute();
  activateTab();
  console.log('[识牌] 数据就绪', DATA.counts);
}).catch(err => {
  view.innerHTML = `<p class="empty-tip">数据加载失败:${esc(err.message)}</p>`;
});
