'use strict';
// One icon style everywhere: white lines with black inside (like the home icon).
// Also: the header's sound button opens a volume bar, with a tiny Twenty-One as the knob.
(function iconsAndVolume() {
  const LINE = '#e8eee4';
  // Icons are drawn on a 24×24 grid.
  const ICONS = {
    home(c) { c.beginPath(); c.moveTo(4, 11); c.lineTo(12, 4); c.lineTo(20, 11); c.lineTo(20, 20); c.lineTo(4, 20); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(10, 14, 4, 6, 1); c.stroke(); },
    chat(c) { c.beginPath(); c.roundRect(3.5, 5, 17, 12, 5); c.fill(); c.stroke(); c.beginPath(); c.moveTo(8, 17); c.lineTo(7, 20.5); c.lineTo(11.5, 17); c.stroke(); }, // Robo's chat
    moon(c) { const p = new Path2D('M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z'); c.fill(p); c.stroke(p); },
    robo(c) { c.beginPath(); c.roundRect(3, 5.5, 18, 13.5, 5.5); c.fill(); c.stroke(); c.fillStyle = c.strokeStyle; c.beginPath(); c.roundRect(8, 9.5, 2.4, 5.5, 1.2); c.roundRect(13.6, 9.5, 2.4, 5.5, 1.2); c.fill(); },
    plus(c) { c.beginPath(); c.roundRect(4, 4, 16, 16, 5); c.fill(); c.stroke(); c.beginPath(); c.moveTo(12, 8.5); c.lineTo(12, 15.5); c.moveTo(8.5, 12); c.lineTo(15.5, 12); c.stroke(); },
    gear(c) {
      c.beginPath();
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? 7 : 9; c.lineTo(12 + Math.cos(a) * r, 12 + Math.sin(a) * r); }
      c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.arc(12, 12, 3, 0, Math.PI * 2); c.stroke();
    },
    speaker(c, level = 1) {
      c.beginPath(); c.moveTo(4, 9.5); c.lineTo(8, 9.5); c.lineTo(12.5, 5.5); c.lineTo(12.5, 18.5); c.lineTo(8, 14.5); c.lineTo(4, 14.5); c.closePath(); c.fill(); c.stroke();
      if (level <= 0) { c.beginPath(); c.moveTo(16, 9.5); c.lineTo(21, 14.5); c.moveTo(21, 9.5); c.lineTo(16, 14.5); c.stroke(); return; }
      c.beginPath(); c.arc(13, 12, 4, -0.9, 0.9); c.stroke();
      if (level > 0.5) { c.beginPath(); c.arc(13, 12, 7.5, -0.9, 0.9); c.stroke(); }
    },
    music(c) { c.beginPath(); c.moveTo(9, 17); c.lineTo(9, 6); c.lineTo(19, 4); c.lineTo(19, 15); c.stroke();
      c.beginPath(); c.ellipse(6.5, 17, 3, 2.4, 0, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.ellipse(16.5, 15, 3, 2.4, 0, 0, Math.PI * 2); c.fill(); c.stroke(); },
    terminal(c) { c.beginPath(); c.roundRect(3, 5, 18, 14, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(7, 10); c.lineTo(10, 12.5); c.lineTo(7, 15); c.moveTo(12, 15); c.lineTo(16, 15); c.stroke(); },
    timer(c) { c.beginPath(); c.arc(12, 13, 7.5, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(12, 13); c.lineTo(12, 9); c.moveTo(12, 13); c.lineTo(15, 14.5); c.moveTo(10, 3.5); c.lineTo(14, 3.5); c.stroke(); },
    copy(c) { c.beginPath(); c.roundRect(8, 7, 11, 13, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(15, 4.5); c.lineTo(7.5, 4.5); c.quadraticCurveTo(5, 4.5, 5, 7); c.lineTo(5, 16); c.stroke(); },
    mail(c) { c.beginPath(); c.roundRect(3.5, 6, 17, 13, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(4.5, 8); c.lineTo(12, 13.5); c.lineTo(19.5, 8); c.stroke(); },
    agenda(c) { c.beginPath(); c.roundRect(4.5, 6, 15, 14, 3); c.fill(); c.stroke(); c.beginPath(); c.moveTo(4.5, 10.5); c.lineTo(19.5, 10.5); c.moveTo(9, 3.8); c.lineTo(9, 7.5); c.moveTo(15, 3.8); c.lineTo(15, 7.5); c.stroke(); },
    note(c) { c.beginPath(); c.moveTo(6, 4); c.lineTo(15, 4); c.lineTo(19, 8); c.lineTo(19, 20); c.lineTo(6, 20); c.closePath(); c.fill(); c.stroke(); c.beginPath(); c.moveTo(9, 11); c.lineTo(16, 11); c.moveTo(9, 15); c.lineTo(14, 15); c.stroke(); },
    clock(c) { c.beginPath(); c.arc(12, 12, 8.5, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(12, 7.5); c.lineTo(12, 12); c.lineTo(15, 14); c.stroke(); },
    collapse(c) { c.beginPath(); c.arc(12, 12, 8.5, 0, Math.PI * 2); c.fill(); c.stroke(); c.beginPath(); c.moveTo(8, 13.5); c.lineTo(12, 9.5); c.lineTo(16, 13.5); c.stroke(); },
    tray(c) { c.beginPath(); c.moveTo(4, 13); c.lineTo(7, 5); c.lineTo(17, 5); c.lineTo(20, 13); c.lineTo(20, 19); c.lineTo(4, 19); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(4, 13); c.lineTo(9, 13); c.lineTo(10, 15); c.lineTo(14, 15); c.lineTo(15, 13); c.lineTo(20, 13); c.stroke(); }
  };
  // Old glyphs used by pill(...) calls → icon names.
  const GLYPHS = { '♫': 'music', '›_': 'terminal', '◔': 'timer', '📥': 'tray', '⚙': 'gear', '⌂': 'home', '+': 'plus' };
  function icon(name, x, y, size = 18, colour = LINE, arg, fill = '#000') {
    const draw = ICONS[name]; if (!draw) return false;
    ctx.save(); ctx.translate(x - size / 2, y - size / 2); ctx.scale(size / 24, size / 24);
    ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = colour; ctx.fillStyle = fill;
    draw(ctx, arg); ctx.restore(); return true;
  }
  window.__twocodeIcon = icon;

  // ---- pills: same box, but a line icon instead of a text glyph ----
  pill = function (x, y, width, glyph, label, key) {
    const bounds = { x, y, width, height: 34 }, over = inside(pointer.x, pointer.y, bounds);
    box(x, y, width, 34, 17, over ? '#1d221d' : '#121512');
    ctx.save(); ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, width - 1, 33, 16.5); ctx.strokeStyle = over ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
    if (!icon(GLYPHS[glyph] || glyph, x + 19, y + 17, 17)) text(glyph, x + 19, y + 22, 12, LINE, 600, 'center');
    text(label, x + 36, y + 21, 11, '#e8eee4', 600, 'left', width - 44);
    hit[key] = bounds;
  };

  // ---- volume: 0 = silent, 1 = loud (replaces the on/off sound toggle) ----
  const read = () => { try { const v = Number(localStorage.getItem('twocode:volume')); return Number.isFinite(v) && localStorage.getItem('twocode:volume') !== null ? v : soundEnabled ? 0.7 : 0; } catch { return 0.7; } };
  let volume = read();
  const setVolume = v => {
    volume = Math.max(0, Math.min(1, Math.round(v * 20) / 20));
    soundEnabled = volume > 0;
    try { localStorage.setItem('twocode:volume', String(volume)); localStorage.setItem('twocode:sound', soundEnabled ? 'on' : 'off'); } catch {}
  };
  setVolume(volume);
  window.__twocodeVolume = () => volume;
  // how loud Twenty-One's own sounds are: Settings → General (prefs.soundLevel, 0-100)
  setInterval(() => { const p = window.__twocodePrefs?.(); if (!p) return; if (p.soundLevel == null) p.soundLevel = Math.round(volume * 100); else if (p.soundLevel / 100 !== volume) setVolume(p.soundLevel / 100); }, 400);
  // Never two open/close sounds on top of each other (that sounded like a glitch).
  const baseSound = sound;
  let lastUiSound = 0;
  sound = function (name) {
    if (name === 'open' || name === 'close') {
      const t = performance.now(); if (t - lastUiSound < 450) return; lastUiSound = t;
    }
    return baseSound(name);
  };
  const baseTone = tone;
  tone = function (from, to, duration, vol = 0.018, delay = 0) { if (volume <= 0) return; return baseTone(from, to, duration, vol * volume * 1.4, delay); };

  // ---- The frame of the big island, compact like a notch app: the page name left, Robo's eyes + date and time in the
  // middle, ⋯ right. ‹ › on the sides go to the page before / after. At the bottom: Robo's chat left, the speaker right
  // (point at it and it becomes a volume slider) and dots in the middle that turn into a row of tabs when you point at them. ----
  const TITLES = { chat: ['Robo', 'Robo'], spotify: ['Muziek', 'Music'], monitor: ['Claude', 'Claude'], assistant: ['Claude', 'Claude'], focus: ['Focus', 'Focus'],
    tray: ['Lade', 'Tray'], clips: ['Klembord', 'Clipboard'], note: ['Notitie', 'Note'], agenda: ['Agenda', 'Calendar'], modes: ['Modes', 'Modes'], apps: ['Apps', 'Apps'], shortcuts: ['Home aanpassen', 'Customize Home'],
    settings: ['Instellingen', 'Settings'], mirror: ['Spiegel', 'Mirror'] };
  const en = () => window.__twocodePrefs?.().lang === 'en';
  const round = (x, y, r, fill) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); };
  const press = { key: null, at: 0 }; // what is pressed right now (it dims instantly, on pointer-down)
  const pressed = key => press.key === key && performance.now() - press.at < 600;
  let menuOpen = false, menuAt = 0, quitArmed = false, dragging = false;
  const MENU = [['apps', 'grid', ['Alle apps', 'All apps']], ['home-edit', 'edit', ['Aanpassen', 'Customize']], ['settings', 'gear', ['Instellingen', 'Settings']], ['check', 'refresh', ['Updates', 'Updates']], ['collapse', 'collapse', ['Inklappen', 'Fold in']], ['quit', 'power', ['Afsluiten', 'Quit']]];
  // a new version from twocode.nl is downloaded and checked (auto-update.cjs): a green dot on ⋯, "Install update" on top of
  // its menu, and once a short message in the small island
  let update = null;
  const menuItems = () => update?.ready ? [['update', 'download', ['Installeren', 'Install']], ...MENU.filter(m => m[0] !== 'check')] : MENU;
  const pretty = x => String(x || '').replace(/-beta\.(\d+)$/, ' beta $1'); // 1.2.0-beta.9 → 1.2.0 beta 9
  const readyText = x => en() ? `An update is ready for you · ${pretty(x)}` : `Er staat een update voor je klaar · ${pretty(x)}`;
  const seeUpdate = s => {
    const fresh = !!s?.ready && s.ready !== update?.ready; update = s || null;
    if (fresh) window.__twocodeNotice('update', { title: en() ? `Twenty-One ${pretty(s.ready)} is ready` : `Twenty-One ${pretty(s.ready)} staat klaar`, body: en() ? 'Restart Twenty-One to install it. It only takes a few seconds.' : 'Herstart Twenty-One om hem te installeren. Dat duurt maar een paar seconden.',
      btns: [{ label: en() ? 'Install' : 'Installeer', primary: true, run: () => window.twocode?.updateInstall?.() }] });
    if (menuOpen) renderMenu();
  };
  window.twocode?.updateState?.().then(seeUpdate).catch(() => {});
  window.twocode?.onUpdateState?.(seeUpdate);
  window.__twocodePageTint = () => '#ffffff';
  // the pages in a row (the tabs and ‹ ›); only the page you are on wears a colour
  const codexTab = () => window.__twocodeAiNow === 'codex';
  const askAi = () => window.twocode?.buddyAi?.().then(v => { if (v?.current) window.__twocodeAiNow = v.current; }).catch(() => {});
  askAi(); setInterval(askAi, 10000);
  const ALL_PAGES = [
    { view: 'home', icon: 'home', tint: '#ffffff', nl: 'Home', en: 'Home' },
    // the AI tab follows the AI you use (Robo Chat's Claude/Codex switch; a user with only Codex saw "Claude" there)
    { view: 'monitor', get icon() { return codexTab() ? 'terminal' : 'claude'; }, get tint() { return codexTab() ? '#3b82f6' : '#d97757'; },
      get nl() { return codexTab() ? 'Codex' : 'Claude'; }, get en() { return codexTab() ? 'Codex' : 'Claude'; } },
    { view: 'spotify', icon: 'music', tint: () => window.__twocodeAlbumColour || '#ff375f', nl: 'Muziek', en: 'Music' },
    { view: 'chat', icon: 'robo', tint: '#30d158', nl: 'Robo', en: 'Robo' },
    { view: 'focus', icon: 'timer', tint: '#bf5af2', nl: 'Focus', en: 'Focus' },
    { view: 'modes', icon: 'moon', tint: '#bf5af2', nl: 'Modes', en: 'Modes' },
    { view: 'tray', icon: 'tray', tint: '#ffd60a', nl: 'Lade', en: 'Tray' },
    { view: 'clips', icon: 'copy', tint: '#64d2ff', nl: 'Klembord', en: 'Clips' },
    { view: 'note', icon: 'note', tint: '#ffd60a', nl: 'Notitie', en: 'Note' },
    { view: 'agenda', icon: 'agenda', tint: '#ff453a', nl: 'Agenda', en: 'Agenda' },
    { view: 'mail', icon: 'mail', tint: '#ea4335', nl: 'Mail', en: 'Mail' }
  ];
  // Apps you turned off (Settings → Apps) are not in the bar either (a user still saw Focus and Note after turning them off)
  const PAGE_APP = { spotify: 'spotify', focus: 'focus', modes: 'focus', tray: 'tray', clips: 'clips', note: 'note', agenda: 'agenda', mail: 'mail' };
  const pages = () => { const off = window.__twocodeAppsOff?.() || new Set(); return ALL_PAGES.filter(pg => !off.has(PAGE_APP[pg.view]) && (pg.view !== 'mail' || window.__twocodeGoogle?.available)); };
  const pageIndex = () => pages().findIndex(pg => pg.view === (currentView === 'assistant' ? 'monitor' : currentView === 'shortcuts' ? 'home' : currentView));
  function go(view) {
    const from = pageIndex(), to = pages().findIndex(pg => pg.view === view);
    window.__twocodeNavDir = from < 0 || to < 0 || from === to ? 0 : to > from ? 1 : -1; // the new page slides in from that side
    if (view === 'monitor') { window.__twocodeMonitor?.open?.(codexTab() ? 'codex' : 'claudecode', codexTab()); return; }
    setView(view); setMode('expanded');
  }
  window.__twocodeGo = go;
  const ease = (from, to, k) => from + (to - from) * k;
  const claudeGlyph = (x, y, c, size) => { ctx.save(); ctx.strokeStyle = c; ctx.lineWidth = size * 0.13; ctx.lineCap = 'round'; const r = size * 0.42;
    for (let i = 0; i < 4; i++) { const an = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(x - Math.cos(an) * r, y - Math.sin(an) * r); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.stroke(); } ctx.restore(); };
  const pageIcon = (pg, x, y, size, colour) => pg.icon === 'claude' ? claudeGlyph(x, y, colour, size) : icon(pg.icon, x, y, size, colour, null, 'rgba(0,0,0,0)');
  const nav = { vol: 0, sliding: false, lastSet: 0, widths: null };
  window.__twocodeNavGeometry = () => ({ top: 36, bottom: 44, side: 18 }); // contentRect (mascot.html) keeps out of this frame
  // a small label above a tab you point at (HTML, so it lies above the pages)
  const tip = document.createElement('div'); tip.id = 'twocode-tip'; document.body.appendChild(tip);
  const tipStyle = document.createElement('style'); tipStyle.textContent = `#twocode-tip{position:absolute;z-index:95;pointer-events:none;padding:3px 8px;border-radius:7px;background:#2c2c2e;color:#fff;font:600 11px Inter,"Segoe UI",sans-serif;white-space:nowrap;transform:translate(-50%,-100%);opacity:0;transition:opacity .12s}#twocode-tip.on{opacity:1}`;
  document.head.appendChild(tipStyle);
  // the label goes when the island folds: the bar is not drawn then, so a mouse that left over a tab kept "Note" floating
  // on the desktop under the small island (seen while recording part 19)
  setInterval(() => { if (mode !== 'expanded' && tip.classList.contains('on')) tip.classList.remove('on'); }, 150);
  // V3: the date and the temperature left, Robo's small eyes in the middle, the time and ⋯ right, the tabs at the bottom.
  // A page outside the tab row (Apps, Settings) shows its name instead of the date.
  drawHeader = function (alpha) {
    const left = islandBounds.x, right = left + islandBounds.width, H = islandBounds.height, cy = 20, mid = (left + right) / 2;
    ctx.save(); ctx.globalAlpha = alpha;
    hit.back = null; hit.navMusic = null; hit.navClear = null; hit.headEyes = null;
    const inTabs = pageIndex() >= 0, t = TITLES[currentView], d = new Date(), loc = en() ? 'en-GB' : 'nl-NL';
    const part = o => d.toLocaleDateString(loc, o).replace('.', '').toUpperCase().slice(0, 3);
    const day = `${part({ weekday: 'short' })} ${String(d.getDate()).padStart(2, '0')} ${part({ month: 'short' })}`;
    const temp = /-?\d+°/.exec(window.__twocodeHomeWeather?.() || '')?.[0], from = Math.max(left + 18, (window.__twocodeNetRight?.() || 0) + 8);
    const lux = window.__twocodeLux?.() === true; // (Lux, launch mode only: the date written out in quiet grey, the time in Inter)
    if (inTabs && lux) { const long = d.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' }).replace(',', ''); text(temp ? `${long} · ${temp}` : long, from, cy + 4.5, 12, '#8e8e93', 500); }
    else if (inTabs) monoText(temp ? `${day} / ${temp}` : day, from, cy + 4, 11, 'rgba(255,255,255,.65)', 500, 'left', .45);
    else if (t) text(en() ? t[1] : t[0], left + 18, cy + 4.5, 13, '#ffffff', 700);
    // (no little eyes while Robo stands big on the page himself; the little ones can be grabbed and dragged out too)
    if (!window.__twocodeRoboBig?.() && !window.__twocodeMonitorEyes?.()) { window.__twocodeIslandEyes?.(mid, cy, 0.85); hit.headEyes = { x: mid - 18, y: 2, width: 36, height: 34 }; }
    window.__twocodeHeadMid = { left: mid - 18, right: mid + 18 }; // what stays free in the middle (drop-ui.js, paywall-ui.js)
    const mx = right - 26, overM = inside(pointer.x, pointer.y, { x: mx - 16, y: 4, width: 32, height: 30 });
    if (menuOpen || pressed('more') || overM) round(mx, cy, 12, 'rgba(255,255,255,.14)');
    for (const dx of [-5, 0, 5]) round(mx + dx, cy, 1.8, '#ffffff');
    if (update?.ready) { round(mx + 9, cy - 8, 4.5, '#000000'); round(mx + 9, cy - 8, 3.2, '#30d158'); } // an update is ready
    hit.more = { x: mx - 18, y: 0, width: 36, height: 38 };
    hit.headTime = null;
    if (!window.__twocodeHomeNoTime?.()) { // (the Clock style on Home has the time big on the page)
      const time = d.toLocaleTimeString(...window.__twocodeTimeArgs());
      if (lux) text(time, mx - 18, cy + 4.5, 13, '#ffffff', 600, 'right'); else monoText(time, mx - 18, cy + 4.5, 12, '#ffffff', 500, 'right');
      ctx.save(); ctx.font = `500 12px ${MONO}`; const tw = ctx.measureText(time).width; ctx.restore();
      hit.headTime = { x: mx - 18 - tw, y: 8, width: tw, height: 24 };
    }
    hit.navPrev = null; hit.navNext = null; hit.navChat = null;
    const i = pageIndex(), by = H - 25;
    if (window.__twocodeHomeBare?.() || window.__twocodeDragging?.()) { // All apps has every app on the page, and while you drag a file the page is the zones: no tab row
      hit.navVol = null; for (let j = 0; j < 14; j++) hit['navTab' + j] = null;
      // your own apps: in the header when there is no tab row to stand next to
      const named = window.__twocodeLinksDock?.(mid + 26, cy, window.__twocodeDragging?.() ? 0 : (hit.headTime?.x ?? right - 60) - mid - 34);
      if (named) { tip.textContent = named.label; tip.style.left = `${named.x}px`; tip.style.top = `${cy + 46}px`; tip.classList.add('on'); } else tip.classList.remove('on');
      ctx.restore(); drawMenu(right); return;
    }
    // bottom right: the speaker; point at it and it slides open into a volume slider
    const sys = window.__twocodeSysVolume || { level: 50, muted: false }, level = sys.muted ? 0 : sys.level / 100;
    const volZone = { x: right - 132, y: by - 15, width: 124, height: 30 };
    nav.vol += ((nav.sliding || inside(pointer.x, pointer.y, nav.vol > 0.5 ? volZone : { x: right - 42, y: by - 15, width: 32, height: 30 }) ? 1 : 0) - nav.vol) * 0.25;
    icon('speaker', right - 27, by, 16, nav.vol > 0.1 ? '#ffffff' : 'rgba(255,255,255,.6)', level, 'rgba(0,0,0,0)');
    hit.navVol = null;
    if (nav.vol > 0.02) {
      const tw2 = 76 * nav.vol, tx = right - 42 - tw2, a = Math.min(1, nav.vol * 1.4);
      ctx.save(); ctx.globalAlpha *= a; box(tx, by - 2, tw2, 4, 2, 'rgba(255,255,255,.2)'); box(tx, by - 2, Math.max(4, tw2 * level), 4, 2, '#ffffff');
      if (nav.vol > 0.6) round(tx + tw2 * level, by, 5, '#ffffff'); ctx.restore();
      hit.navVol = { x: tx - 6, y: by - 12, width: tw2 + 12, height: 24, track: { x: tx, width: tw2 } };
    }
    // bottom middle: the pages as icons, always visible; the page you are on shows its name in a soft capsule
    const PAGES = pages(), n = PAGES.length, label = pg => (en() ? pg.en : pg.nl).toUpperCase();
    ctx.save(); ctx.font = `500 10.5px ${MONO}`; ctx.letterSpacing = '.84px';
    const want = PAGES.map((pg, j) => 30 + (j === i ? ctx.measureText(label(pg)).width + 10 : 0)); ctx.restore();
    if (!nav.widths || nav.widths.length !== n) nav.widths = want.slice();
    nav.widths = nav.widths.map((w, j) => w + (want[j] - w) * 0.25); // the capsule glides to the new page
    const rowW = nav.widths.reduce((sum, w) => sum + w, 0);
    const dockW = window.__twocodeLinksDockWidth?.() || 0; // left of the tabs: your own apps; a long tab name never pushes one out
    let x = Math.max(mid - rowW / 2, left + 14 + dockW + 8), tipAt = window.__twocodeLinksDock?.(left + 14, by, x - left - 22) || null;
    PAGES.forEach((pg, j) => {
      const w = nav.widths[j], b = { x, y: by - 14, width: w, height: 28 }, over = inside(pointer.x, pointer.y, b), on = j === i, ix = x + 15;
      if (on) box(x, by - 14, w, 28, 14, 'rgba(255,255,255,.12)');
      else if (over) round(ix, by, 13, 'rgba(255,255,255,.1)');
      pageIcon(pg, ix, by, 16, on || over ? '#ffffff' : 'rgba(255,255,255,.6)');
      if (on && w > 40) { ctx.save(); ctx.globalAlpha *= Math.min(1, (w - 40) / 20); monoText(label(pg), x + 28, by + 3.8, 10.5, '#ffffff', 500, 'left', .84); ctx.restore(); }
      if (over && !on) tipAt = { x: ix, label: en() ? pg.en : pg.nl };
      hit['navTab' + j] = b; x += w;
    });
    for (let j = n; j < 14; j++) hit['navTab' + j] = null;
    // the label above the tab you point at (where you will go)
    if (tipAt && mode === 'expanded') { tip.textContent = tipAt.label; tip.style.left = `${tipAt.x}px`; tip.style.top = `${by - 18}px`; tip.classList.add('on'); }
    else tip.classList.remove('on');
    ['home', 'chat', 'apps', 'sound', 'settings', 'collapse', 'power'].forEach(key => { hit[key] = null; }); // the old toolbar is gone
    ctx.restore();
    drawMenu(right);
  };
  // the volume slider: press and slide (the island's own volume message stays quiet meanwhile)
  const setSys = clientX => {
    const b = hit.navVol; if (!b) return;
    const level = Math.round(Math.max(0, Math.min(1, (clientX - b.track.x) / b.track.width)) * 100);
    window.__twocodeVolumeQuietUntil = performance.now() + 1500;
    window.__twocodeSysVolume = { level, muted: false };
    const now = performance.now(); if (now - nav.lastSet > 50) { nav.lastSet = now; window.twocode?.volumeSet?.(level)?.catch?.(() => {}); }
  };
  canvas.addEventListener('pointerdown', e => {
    if (mode !== 'expanded' || !inside(e.clientX, e.clientY, hit.navVol)) return;
    e.preventDefault(); e.stopImmediatePropagation(); nav.sliding = true; canvas.setPointerCapture?.(e.pointerId); setSys(e.clientX);
  }, true);
  canvas.addEventListener('pointermove', e => { if (nav.sliding) setSys(e.clientX); });
  const endSlide = e => { if (!nav.sliding) return; nav.sliding = false; setSys(e.clientX); const lv = window.__twocodeSysVolume?.level; if (lv != null) window.twocode?.volumeSet?.(lv)?.catch?.(() => {}); };
  canvas.addEventListener('pointerup', endSlide); canvas.addEventListener('pointercancel', endSlide);
  // the frame's buttons
  canvas.addEventListener('click', e => {
    if (mode !== 'expanded') return;
    const at = b => inside(e.clientX, e.clientY, b), stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    const PAGES = pages(), i = pageIndex(), n = PAGES.length;
    if (at(hit.navVol)) { stop(); return; }
    for (let j = 0; j < n; j++) if (at(hit['navTab' + j])) { stop(); sound('click'); go(PAGES[j].view); return; }
    if (at(hit.navMusic)) { stop(); sound('click'); go('spotify'); return; }
    if (at(hit.navClear)) { stop(); sound('click'); window.__twocodeTrayClear?.(); return; }
  }, true);
  // The ⋯ menu (HTML, so it lies above every page): it grows out of its button (Apple: anchor to the source),
  // Twenty-One's sound on top, then the rows; Quit asks once more in the row itself.
  const menu = document.createElement('div'); menu.id = 'twocode-menu'; document.body.appendChild(menu);
  const menuStyle = document.createElement('style'); menuStyle.textContent = `
#twocode-menu{position:absolute;z-index:90;width:272px;padding:8px;box-sizing:border-box;border-radius:24px;background:#141416;border:1px solid rgba(255,255,255,.1);box-shadow:0 18px 44px rgba(0,0,0,.7);
  font:600 11.5px Inter,"Segoe UI",sans-serif;color:#fff;transform-origin:calc(100% - 6px) -8px;opacity:0;transform:scale(.6);pointer-events:none;
  transition:opacity .16s ease-out,transform .22s cubic-bezier(.2,.9,.3,1)}
#twocode-menu.open{opacity:1;transform:none;pointer-events:auto}
#twocode-menu .mn-vol{position:relative;height:42px;border-radius:14px;background:#2c2c31;overflow:hidden}
#twocode-menu .mn-track{position:absolute;inset:0;cursor:pointer}
#twocode-menu .mn-track i{position:absolute;left:0;top:0;bottom:0;background:#fff}
#twocode-menu .mn-vol svg{position:absolute;left:13px;top:12px;color:#fff;mix-blend-mode:difference;pointer-events:none}
#twocode-menu .mn-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-rows:74px;gap:8px;margin-top:8px}
#twocode-menu button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;border:0;border-radius:15px;background:#232327;color:#fff;font:inherit;cursor:pointer}
#twocode-menu button:hover{background:#2c2c31}
#twocode-menu button:active{transform:scale(.97);transition:transform .1s ease-out}
#twocode-menu button.red{color:#ff6b6e}
#twocode-menu button.green{color:#59e08a}
#twocode-menu svg{flex:none}`;
  document.head.appendChild(menuStyle);
  const SVG = {
    speaker: '<path d="M4 9.5h4l4.5-4v13L8 14.5H4z" fill="currentColor"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/>',
    edit: '<path d="M4 20h4L19.5 8.5l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>',
    gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
    collapse: '<path d="m6 15 6-6 6 6"/>',
    power: '<path d="M7.5 6.5a7 7 0 1 0 9 0"/><path d="M12 3v8"/>',
    download: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>' };
  const svg = (name, colour = 'currentColor') => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${colour}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${SVG[name]}</svg>`;
  const sysLevel = () => { const s = window.__twocodeSysVolume; return !s ? 50 : s.muted ? 0 : s.level; };
  function renderMenu() {
    const words = (nl, en2) => en() ? en2 : nl;
    menu.innerHTML = `<div class="mn-vol"><div class="mn-track" role="slider" aria-label="${words('Volume van je pc', 'PC volume')}"><i style="width:${sysLevel()}%"></i></div>${svg('speaker')}</div><div class="mn-grid">`
      + menuItems().map(([key, g, label]) => `<button type="button" data-menu="${key}" class="${key === 'quit' ? 'red' : key === 'update' ? 'green' : ''}">${svg(g)}${key === 'quit' && quitArmed ? words('Zeker?', 'Sure?') : (en() ? label[1] : label[0])}</button>`).join('') + '</div>';
  }
  function openMenu(on) {
    menuOpen = on; quitArmed = false;
    if (on) { renderMenu(); menuAt = performance.now(); }
    menu.classList.toggle('open', on);
  }
  // the menu only belongs to the big island: when it folds in (by itself, or because you moved away), the menu goes too
  // (drawMenu below only runs while the big island is drawn, so it never saw the island fold in)
  setInterval(() => { if (menuOpen && mode !== 'expanded') openMenu(false); }, 80);
  function drawMenu(right) {
    if (menuOpen && mode !== 'expanded') openMenu(false);
    menu.style.left = `${right - 8 - 272}px`; menu.style.top = '34px';
    if (menuOpen && !dragging) { const bar = menu.querySelector('.mn-track i'), w = `${sysLevel()}%`; if (bar && bar.style.width !== w) bar.style.width = w; } // (the volume keys move it too)
  }
  // The bar in the menu is your PC's volume (it was only Twenty-One's own sounds; a user: "the music stays loud"). Those moved to Settings → General.
  let menuSetAt = 0;
  const setFromTrack = clientX => {
    const t = menu.querySelector('.mn-track'); if (!t) return;
    const r = t.getBoundingClientRect(), level = Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * 100), now = performance.now();
    window.__twocodeVolumeQuietUntil = now + 1500; window.__twocodeSysVolume = { level, muted: false };
    menu.querySelector('.mn-track i').style.width = `${level}%`;
    if (now - menuSetAt > 50) { menuSetAt = now; window.twocode?.volumeSet?.(level)?.catch?.(() => {}); }
  };
  menu.addEventListener('pointerdown', e => {
    if (!e.target.closest('.mn-track')) return;
    dragging = true; setFromTrack(e.clientX); menu.setPointerCapture?.(e.pointerId);
  });
  menu.addEventListener('pointermove', e => { if (dragging) setFromTrack(e.clientX); });
  menu.addEventListener('pointerup', () => { if (dragging) { dragging = false; window.twocode?.volumeSet?.(sysLevel())?.catch?.(() => {}); } });
  menu.addEventListener('click', e => {
    const b = e.target.closest('[data-menu]'); if (!b) return;
    const choice = b.dataset.menu;
    if (choice === 'quit') { if (quitArmed) { openMenu(false); sound('click'); window.twocode?.close?.(); } else { quitArmed = true; renderMenu(); sound('click'); } return; }
    openMenu(false);
    if (choice === 'update') { sound('click'); window.twocode?.updateInstall?.(); return; }
    if (choice === 'check') { // ask twocode.nl now (no restart): you have the newest version, or an update is ready for you
      // the answer is a message in the small island, so the island folds in first (like Fold in)
      sound('click'); window.__twocodeMonitor?.small?.(); window.__twocodeHoldClosed?.(); setMode('rest');
      const wasReady = update?.ready;
      window.__twocodeNotice('updateCheck', { title: en() ? 'Checking for updates…' : 'Zoeken naar updates…' });
      window.twocode?.updateCheck?.().then(s => {
        if (!s || s.failed) throw new Error('check failed');
        if (s.ready && s.ready === update?.ready && !wasReady) return; // (just found one: the big message about it is showing)
        window.__twocodeNotice('updateCheck', { title: s.ready ? readyText(s.ready)
          : s.full ? (en() ? `${pretty(s.full)} is out · get it on twocode.nl` : `${pretty(s.full)} is uit · download hem op twocode.nl`)
          : (en() ? `You have the newest version · ${pretty(s.current)}` : `Je hebt de nieuwste versie · ${pretty(s.current)}`) });
      }).catch(() => window.__twocodeNotice('updateCheck', { title: en() ? 'Could not reach twocode.nl · try again in a minute' : 'twocode.nl niet bereikt · probeer het zo nog eens' }));
      return;
    }
    if (choice === 'apps') { setView('apps'); sound('click'); }
    else if (choice === 'home-edit') window.__twocodeEditHome?.();
    else if (choice === 'settings') { setView('settings'); sound('click'); }
    else if (choice === 'collapse') { window.__twocodeMonitor?.small?.(); window.__twocodeHoldClosed?.(); setMode('rest'); }
  });
  // a press anywhere else closes it
  document.addEventListener('pointerdown', e => { if (menuOpen && !menu.contains(e.target) && !inside(e.clientX, e.clientY, hit.more)) openMenu(false); }, true);
  // feedback on pointer-down (instant), the action on click
  canvas.addEventListener('pointerdown', e => {
    for (const key of ['back', 'more']) if (inside(e.clientX, e.clientY, hit[key])) { press.key = key; press.at = performance.now(); }
  }, true);
  canvas.addEventListener('pointerup', () => { press.key = null; });
  canvas.addEventListener('click', e => {
    const at = b => inside(e.clientX, e.clientY, b), stop = () => { e.preventDefault(); e.stopImmediatePropagation(); };
    if (mode !== 'expanded') return;
    if (at(hit.more)) { stop(); openMenu(!menuOpen); sound('click'); return; }
    if (at(hit.back)) {
      stop(); if (currentView === 'monitor') window.__twocodeMonitor?.small?.();
      setView('home'); setMode('expanded'); return;
    }
  }, true);
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && menuOpen) { openMenu(false); e.stopImmediatePropagation(); } }, true);
  window.__twocodeMenuOpen = () => menuOpen;
  // (beta 84) The menu hangs below the island. Now the mouse on it counts as on the island (mascot.html): before, the island folded in and
  // clicks on the lower rows went through to the app underneath, so a customer could not reach Quit. The rows are lower too: all of them fit in the window.
  window.__twocodeOverMenu = (x, y) => { if (!menuOpen) return false; const r = menu.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
})();
