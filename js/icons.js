// 内联 SVG 图标集(线性风格,24 viewBox,stroke currentColor)
const w = (inner, vb='0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
const f = (inner, vb='0 0 24 24') =>
  `<svg viewBox="${vb}" fill="currentColor" aria-hidden="true">${inner}</svg>`;

export const icons = {
  home: w('<path d="M4 11.2 12 4l8 7.2"/><path d="M6 10v9h12v-9"/>'),
  explore: w('<circle cx="12" cy="12" r="8.6"/><path d="m14.8 9.2-1.7 4-4 1.7 1.7-4z" fill="currentColor" stroke="none"/>'),
  search: w('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  me: w('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5"/>'),
  back: w('<path d="M14.5 5 8 12l6.5 7"/>'),
  star: w('<path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.3-4.8-2.6L7.2 18.8l1-5.3-4-3.8 5.4-.7z"/>'),
  starFill: f('<path d="m12 3.4 2.5 5.2 5.7.7-4.2 4 1.1 5.6L12 16l-5.1 2.9 1.1-5.6-4.2-4 5.7-.7z"/>'),
  eye: w('<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.7"/>'),
  check: w('<path d="m4.5 12.5 5 5L19.5 7"/>'),
  external: w('<path d="M9 5H5.5v13.5H19V15"/><path d="M13.5 4.5H19.5V10.5"/><path d="M19 5 11 13"/>'),
  refresh: w('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/>'),
  note: w('<path d="M5 4.5h14v12l-3.5 3.5H5z"/><path d="M15.5 20v-3.5H19"/><path d="M8.5 9h7M8.5 12.5h5"/>'),
  shield: w('<path d="M12 3.5 19 6v5.4c0 4.6-3 7.7-7 9.1-4-1.4-7-4.5-7-9.1V6z"/><path d="m9 11.8 2.2 2.2L15.5 9.7"/>'),
  globe: w('<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c-4.8 4.9-4.8 12.3 0 17.2 4.8-4.9 4.8-12.3 0-17.2Z"/>'),
  jd: f('<rect x="3" y="5" width="18" height="14" rx="2.4"/><path d="m6.5 9 5.5 4 5.5-4" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),
  store: w('<path d="M4 9.5 5.5 4.5h13L20 9.5"/><path d="M4 9.5a2.6 2.6 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.6 2.6 0 0 0 5.3 0"/><path d="M5.5 12v7.5h13V12"/><path d="M9.5 19.5V15h5v4.5"/>'),
  bing: w('<circle cx="12" cy="12" r="8.6"/><path d="m9 8 2.2.8v5.4l3.1-1.7-1.5-.7-.6-1.9 3.8 1.5-4.8 4.4L9 14.8z" fill="currentColor" stroke="none"/>'),
  wiki: w('<path d="M4.5 6.5h5M4.5 6.5c2.2 0 2.6 3 3.6 5.3l3.2 6.7 3.2-6.7c1-2.3 1.4-5.3 3.6-5.3"/><path d="M12 6.5h5"/>'),
  car: w('<path d="M5 13 6.4 8.6A2 2 0 0 1 8.3 7.2h7.4a2 2 0 0 1 1.9 1.4L19 13"/><path d="M4 13h16v4.5h-2M4 17.5v-4.5"/><circle cx="7.8" cy="17" r="1.6"/><circle cx="16.2" cy="17" r="1.6"/><path d="M9.4 17.5h5.2"/>'),
  dress: w('<path d="m9 4 3 2.5L15 4l3.5 2-1.8 3.2 1 3L14.5 20h-5L6.3 12.2l1-3L5.5 6z"/><path d="M9 4c.5 1.4 1.6 2.2 3 2.2S12.5 5.4 13 4" fill="none"/>'),
  watch: w('<circle cx="12" cy="12" r="5.4"/><path d="M12 9.4V12l1.8 1.4"/><path d="M9.2 7 9 3.5h6l-.2 3.5M9.2 17l.2 3.5h6l-.2-3.5"/>'),
  run: w('<circle cx="15.5" cy="5" r="1.9"/><path d="m4 17.5 3.8-1.6 2-3.4 2.7 2.2-1 4.8"/><path d="m10.5 12 2.5-3.5 3.4 1.2 2.6 2.3"/><path d="m6.5 8.5 3-.7 1.6 1.7"/>'),
  building: w('<path d="M5 20V5.5L12 4v16M12 8l7 1.6V20"/><path d="M3.5 20h17"/><path d="M8 8.5h1.2M8 12h1.2M8 15.5h1.2M15 12.5h1.2M15 16h1.2"/>'),
  gem: w('<path d="m7 4.5-3.5 5L12 20l8.5-10.5-3.5-5z"/><path d="M3.5 9.5h17M9.5 4.5l-1 5 3.5 9 3.5-9-1-5"/>'),
  moon: w('<path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10Z"/>'),
  x: w('<path d="m6 6 12 12M18 6 6 18"/>'),
  book: w('<path d="M5 4.5h6.5a2.5 2.5 0 0 1 2.5 2.5v12.5a2 2 0 0 0-2-2H5z"/><path d="M19 4.5h-5a2.5 2.5 0 0 0-2.5 2.5"/>'),
  flame: w('<path d="M12 3.5s5.5 4.2 5.5 9a5.5 5.5 0 0 1-11 0c0-1.8.8-3.4 1.8-4.8.3 1 .9 1.9 1.7 2.3 0-2.5.8-5 2-6.5Z"/>'),
};

// Tab 图标注入
export function initTabIcons() {
  const map = { home:'home', explore:'explore', me:'me' };
  document.querySelectorAll('#tabbar .tab').forEach(el => {
    const ic = el.querySelector('.tab-ic');
    if (ic && map[el.dataset.tab]) ic.innerHTML = icons[map[el.dataset.tab]];
  });
}
