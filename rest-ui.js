'use strict';
// Ideas from users, in the island:
//  - the resting island: Robo's eyes in the middle (like the camera in the Dynamic Island), and on the left and the right
//    whatever you pick: the time (12 or 24 hours), the battery, the processor (CPU) or the memory. Eyes off: only what you
//    picked. Settings → Island → Resting island (system-main.cjs measures the PC); since beta 55 also Wi-Fi and
//    Bluetooth, as their signs only (net-ui.js; never the network's name: people film their island);
//  - your own apps (Settings → Apps → Your own apps, links-main.cjs) next to the tabs on every page, and big on the Apps page.
(function rest() {
  const api = window.twocode;
  // (while you try things in Settings the island already shows your draft)
  const view = () => window.__twocodeViewPrefs?.() || window.__twocodePrefs?.() || {};
  const ITEMS = ['time', 'battery', 'cpu', 'ram', 'wifi', 'bluetooth'];
  const SIGN = item => item === 'wifi' || item === 'bluetooth'; // drawn by net-ui.js
  const pick = key => (ITEMS.includes(view()[key]) ? view()[key] : null);
  // an earlier beta had one choice (restFace): that one in the middle, without the eyes
  // an example (texture-ui.js) may show RAM and CPU here for a moment, whatever you picked
  let example = null;
  const showing = () => example && performance.now() < example.until;
  const left = () => showing() ? example.left : pick('restLeft'), right = () => showing() ? example.right : pick('restRight');
  const eyes = () => view().restEyes !== false || (!left() && !right());
  const FONT = '600 13px Inter, "Segoe UI", sans-serif', PAD = 14, EYES_HALF = 19, GAP = 12, REST = 116;

  // ---------- the resting island ----------
  let stats = null, asking = false, battery = null;
  setInterval(async () => { // (also for the Texture pack's Fire & ice, texture-ui.js)
    if (!([left(), right()].some(k => k === 'cpu' || k === 'ram') || window.__twocodeTexture?.wantsStats()) || asking || !api?.systemStats) return;
    asking = true; try { stats = await api.systemStats(); } catch {} finally { asking = false; }
  }, 2000);
  const values = () => showing() && example.stats ? example.stats : stats;
  window.__twocodeSystemStats = () => stats;
  navigator.getBattery?.().then(b => { battery = b; }).catch(() => {});
  const text = item => item === 'time' ? (window.__twocodeTime?.(new Date(), true) || new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }))
    : item === 'battery' ? `${battery ? Math.round(battery.level * 100) : '–'}%`
    : item === 'cpu' ? `CPU ${values() ? values().cpu : '–'}%` : `RAM ${values() ? values().ram : '–'}%`;
  const GLYPH = 17, glyphGap = 5;
  function measure(item) {
    if (!item) return 0;
    if (SIGN(item)) return window.__twocodeNet?.width(item === 'wifi' ? 'wifi' : 'bt') || 14;
    ctx.save(); ctx.font = FONT; const w = ctx.measureText(text(item)).width; ctx.restore();
    return w + (item === 'battery' ? GLYPH + 2 + glyphGap : 0);
  }
  // a small battery, filled as far as it is charged: green while charging, red when nearly empty
  function glyph(x, cy) {
    const level = battery ? Math.max(0, Math.min(1, battery.level)) : 1, h = 8, y = cy - h / 2;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, GLYPH - 1, h - 1, 2.5); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + GLYPH + 0.5, cy - 1.5, 1.6, 3);
    ctx.fillStyle = battery?.charging ? '#34c759' : level <= 0.2 ? '#ff453a' : '#ffffff';
    ctx.beginPath(); ctx.roundRect(x + 2, y + 2, Math.max(1.5, (GLYPH - 4) * level), h - 4, 1.2); ctx.fill();
    ctx.restore();
  }
  function item(kind, x, cy, align) { // align: where x is (left edge, right edge or the middle)
    const w = measure(kind), x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
    let tx = x0;
    if (SIGN(kind)) { window.__twocodeNet?.glyph(kind === 'wifi' ? 'wifi' : 'bt', x0, cy); return; }
    if (kind === 'battery') { glyph(x0, cy); tx += GLYPH + 2 + glyphGap; }
    ctx.save(); ctx.font = FONT; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(text(kind), tx, cy + 0.5); ctx.restore();
  }
  // how wide the resting island is for what it shows. Both sides: Robo's eyes in the middle, both sides as wide as the
  // widest. One side: just that and the eyes, side by side, the pair in the middle (a user: with only the time on the
  // left, the eyes stayed in the middle and the right half was empty, "it is not centered").
  function width() {
    const L = left(), R = right();
    if (!L && !R) return REST;
    if (eyes() && L && R) return Math.max(REST, Math.ceil(2 * (PAD + Math.max(measure(L), measure(R)) + GAP + EYES_HALF)));
    if (eyes()) return Math.max(REST, Math.ceil(2 * PAD + measure(L || R) + GAP + 2 * EYES_HALF));
    if (L && R) return Math.ceil(measure(L) + measure(R) + 2 * PAD + 24);
    return Math.max(96, Math.ceil(measure(L || R) + 2 * PAD + 10));
  }
  window.__twocodeRestFace = {
    on: () => Boolean(left() || right()),
    eyes,                                   // true: Robo's own eyes are drawn too (ai-monitor-ui.js drawSmall)
    sides: () => ({ left: left(), right: right(), values: values() }), // texture-ui.js: every side its own heat
    demo(cfg) { example = cfg ? { left: cfg.left, right: cfg.right, stats: cfg.stats, until: performance.now() + (cfg.ms || 8000) } : null; },
    eyesX() { // where the eyes go: the middle, or next to the one thing that is shown (it is on the other side)
      const L = left(), R = right(), x0 = islandBounds.x, x1 = islandBounds.x + islandBounds.width;
      if (!(L || R) || (L && R)) return x0 + islandBounds.width / 2;
      return L ? x1 - PAD - EYES_HALF : x0 + PAD + EYES_HALF;
    },
    size() { // every frame while resting: the island grows or shrinks to fit (a smooth change, like the other sizes)
      const w = width();
      if (Math.abs(UI.REST_W - w) >= 0.5) UI.REST_W = w;
      // (also after a fold that was still on its way to the old width)
      const goal = window.__twocodeLux?.() ? modeTarget('rest').width : w; // (Lux, launch mode only: the resting island is 188 wide)
      if (mode === 'rest' && !transition && Math.abs(visual.width - goal) > 1) setMode('rest', false);
    },
    draw() {
      const L = left(), R = right(), cy = visual.height / 2, x0 = islandBounds.x, x1 = islandBounds.x + islandBounds.width;
      if (eyes() || (L && R)) { if (L) item(L, x0 + PAD, cy, 'left'); if (R) item(R, x1 - PAD, cy, 'right'); }
      else item(L || R, innerWidth / 2, cy, 'middle');
      if (!eyes()) hit.ghost = { x: innerWidth / 2 - 30, y: 0, width: 60, height: visual.height }; // Robo can still be grabbed there
    },
  };

  // ---------- your links on the Apps page ----------
  let links = [];
  api?.linksGet?.().then(v => { links = Array.isArray(v) ? v : []; }).catch(() => {});
  api?.onLinks?.(v => { links = Array.isArray(v) ? v : []; });
  const tint = s => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return `hsl(${h % 360} 62% 52%)`; };
  const pics = {}; // (beta 75) the site's own icon (links-main.cjs), drawn once it has loaded; until then the letter
  const pic = l => { if (!l.icon) return null; let p = pics[l.icon]; if (!p) { p = pics[l.icon] = new Image(); p.src = l.icon; } return p.complete && p.naturalWidth ? p : null; };
  window.__twocodeLinks = () => links;
  /** One row of icons with their name under them, like the apps above it (their tile is as big: 44). */
  window.__twocodeLinksRow = (x, y, w, cols) => {
    for (let i = 0; i < 8; i++) delete hit['link_' + i];
    const s = 44, colW = w / cols;
    links.slice(0, cols).forEach((l, i) => {
      const cx = x + colW * i + colW / 2, cy = y + s / 2 + 8, b = { x: cx - s / 2 - 10, y: cy - s / 2 - 6, width: s + 20, height: s + 34 }, over = inside(pointer.x, pointer.y, b), r = 13;
      ctx.save(); ctx.beginPath(); ctx.roundRect(cx - s / 2, cy - s / 2, s, s, s * 0.22); ctx.fillStyle = over ? '#2c2c2e' : '#1c1c1e'; ctx.fill(); ctx.restore();
      const p = pic(l);
      if (p) { ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(p, cx - r, cy - r, r * 2, r * 2); ctx.restore(); }
      else {
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = tint(l.url || l.path); ctx.fill();
        ctx.font = '700 14px Inter, "Segoe UI", sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((l.name[0] || '?').toUpperCase(), cx, cy + 1); ctx.restore();
      }
      text(l.name, cx, cy + s / 2 + 16, 11, '#ffffff', 500, 'center', colW - 8);
      hit['link_' + i] = b;
    });
  };
  /** How wide your apps are next to the tabs: the tabs make room for them. */
  window.__twocodeLinksDockWidth = () => { if (currentView === 'apps') return 0; const n = Math.min(links.length, 4), count = n + (links.length < 4 ? 1 : 0); return count ? count * 24 + 8 : 0; };
  /** Your apps next to the tabs: small icons in a soft capsule, like the tab you are on, and a + while there is room. Returns what you point at, for its name. */
  window.__twocodeLinksDock = (x, cy, w) => {
    if (currentView === 'apps') return null; // (that page has them big)
    for (let i = 0; i < 8; i++) delete hit['link_' + i];
    delete hit.linkAdd;
    const step = 24, pad = 4, room = Math.max(0, Math.floor((w - pad * 2) / step)), n = Math.min(links.length, 4, room), plus = links.length < 4 && room > n, count = n + (plus ? 1 : 0);
    if (!count) return null;
    let named = null;
    if (n) { ctx.save(); ctx.beginPath(); ctx.roundRect(x, cy - 14, count * step + pad * 2, 28, 14); ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fill(); ctx.restore(); }
    const at = i => x + pad + step * i + step / 2, spot = cx => ({ x: cx - step / 2, y: cy - 14, width: step, height: 28 });
    links.slice(0, n).forEach((l, i) => {
      const cx = at(i), b = spot(cx), r = 8, p = pic(l), over = inside(pointer.x, pointer.y, b);
      if (over) { named = { x: cx, label: l.name }; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.beginPath(); ctx.roundRect(cx - r, cy - r, r * 2, r * 2, 4); ctx.clip();
      if (p) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(p, cx - r, cy - r, r * 2, r * 2); }
      else { ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2); ctx.font = '700 10px Inter, "Segoe UI", sans-serif'; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText((l.name[0] || '?').toUpperCase(), cx, cy + 1); }
      ctx.restore();
      hit['link_' + i] = b;
    });
    if (plus) {
      const cx = at(n), b = spot(cx), over = inside(pointer.x, pointer.y, b);
      if (over) { named = { x: cx, label: window.__twocodePrefs?.().lang === 'en' ? 'Add your own app' : 'Eigen app toevoegen' }; ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,.1)'; ctx.fill(); ctx.restore(); }
      ctx.save(); ctx.strokeStyle = over ? '#ffffff' : 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - 5.5, cy); ctx.lineTo(cx + 5.5, cy); ctx.moveTo(cx, cy - 5.5); ctx.lineTo(cx, cy + 5.5); ctx.stroke(); ctx.restore();
      hit.linkAdd = b;
    }
    return named;
  };
  canvas.addEventListener('click', e => { // one of your apps: open it; the +: Settings → Apps
    if (mode !== 'expanded') return;
    if (inside(e.clientX, e.clientY, hit.linkAdd)) { e.preventDefault(); e.stopImmediatePropagation(); window.__twocodeChime?.('pop'); api?.settingsOpen?.('apps'); return; }
    const i = links.findIndex((_, k) => inside(e.clientX, e.clientY, hit['link_' + k]));
    if (i < 0) return;
    e.preventDefault(); e.stopImmediatePropagation();
    window.__twocodeChime?.('pop'); api?.linksOpen?.(links[i].url || links[i].path);
  }, true);
})();
