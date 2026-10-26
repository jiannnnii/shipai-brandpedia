// 本地状态:收藏 / 已看 / 足迹 / 笔记 / 偏好,localStorage 持久化
const KEY = k => 'bp.' + k;
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(KEY(k))) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(KEY(k), JSON.stringify(v)); } catch {} };

const listeners = new Set();
export function onStore(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit(what, id) { listeners.forEach(fn => fn(what, id)); }

export const store = {
  favs:   new Set(read('favs', [])),          // 'p:id' / 'b:id'
  seen:   new Set(read('seen', [])),          // 'p:id'
  history: read('history', []),               // [{ref,t}] 新的在前
  notes:  read('notes', {}),                  // { 'p:id': text }
  prefs: Object.assign({
    theme: 'auto',        // auto | light | dark
    apiKey: '',
    model: 'glm-4.5-flash',
    remoteUrl: '',        // GitHub raw 数据地址
    onlineImg: true,
  }, read('prefs', {})),
};

export const saveFavs   = () => write('favs', [...store.favs]);
export const saveSeen   = () => write('seen', [...store.seen]);
export const saveHistory= () => write('history', store.history.slice(0, 300));
export const saveNotes  = () => write('notes', store.notes);
export const savePrefs  = () => write('prefs', store.prefs);

export function toggleFav(ref) {
  if (store.favs.has(ref)) { store.favs.delete(ref); saveFavs(); emit('fav', ref); return false; }
  store.favs.add(ref); saveFavs(); emit('fav', ref); return true;
}
export function isFav(ref) { return store.favs.has(ref); }

export function markSeen(ref) {
  if (store.seen.has(ref)) return;
  store.seen.add(ref); saveSeen(); emit('seen', ref);
}
export function isSeen(ref) { return store.seen.has(ref); }

export function pushHistory(ref) {
  store.history = store.history.filter(h => h.ref !== ref);
  store.history.unshift({ ref, t: Date.now() });
  saveHistory(); emit('history', ref);
}

export function setNote(ref, text) {
  if (text && text.trim()) store.notes[ref] = text.trim();
  else delete store.notes[ref];
  saveNotes(); emit('note', ref);
}

export function setPrefs(patch) {
  Object.assign(store.prefs, patch); savePrefs();
  if (patch.theme !== undefined) applyTheme();
  emit('prefs', null);
}

export function applyTheme() {
  const t = store.prefs.theme;
  const dark = t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

// ---------- 简易 IndexedDB(缓存远程数据) ----------
const idb = {
  db: null,
  async _open() {
    if (this.db) return this.db;
    this.db = await new Promise((res, rej) => {
      const q = indexedDB.open('shipai', 1);
      q.onupgradeneeded = () => q.result.createObjectStore('kv');
      q.onsuccess = () => res(q.result);
      q.onerror = () => rej(q.error);
    });
    return this.db;
  },
  async get(k) {
    try {
      const db = await this._open();
      return await new Promise((res, rej) => {
        const r = db.transaction('kv').objectStore('kv').get(k);
        r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
      });
    } catch { return undefined; }
  },
  async put(k, v) {
    try {
      const db = await this._open();
      await new Promise((res, rej) => {
        const r = db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
        r.onsuccess = () => res(); r.onerror = () => rej(r.error);
      });
    } catch {}
  },
};
export { idb };
