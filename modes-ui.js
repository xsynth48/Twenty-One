'use strict';
// Focus modes (V3): a mode is a timer (twocode-fun.js) plus what should be quiet while it runs: the focus guard's sites,
// the notifications (window.__twocodeMode) and your music. Work, Study, Sleep and Game; you can change each of them.
(function modesPage() {
  const root = document.createElement('section'); root.id = 'twocode-modes'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#twocode-modes{position:absolute;z-index:60;display:none;color:#fff;font:14px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto;user-select:none}
#twocode-modes *{box-sizing:border-box}
#twocode-modes button{border:0;cursor:pointer;font-family:inherit;color:#fff;background:transparent;padding:0}
#twocode-modes .mo-list{position:absolute;left:-6px;top:0;width:138px}
#twocode-modes .mo-row{display:flex;align-items:center;gap:10px;width:100%;height:44px;padding:0 11px;border-radius:13px;font-size:14.5px;font-weight:500;color:rgba(255,255,255,.78);text-align:left}
#twocode-modes .mo-row:hover{background:rgba(255,255,255,.07)}
#twocode-modes .mo-row.on{background:rgba(255,255,255,.14);color:#fff;font-weight:700}
#twocode-modes .mo-row svg{flex:none}
#twocode-modes .mo-main{position:absolute;left:144px;right:0;top:-2px}
#twocode-modes .mo-top{display:flex;align-items:center;justify-content:space-between;height:38px}
#twocode-modes .mo-num{font:500 32px/36px "JetBrains Mono",Consolas,monospace;letter-spacing:-.04em}
#twocode-modes .mo-go{height:36px;padding:0 22px;border-radius:12px;background:#fff!important;color:#000!important;font-size:14.5px;font-weight:700}
#twocode-modes .mo-go:hover{background:#e5e5ea!important}
#twocode-modes .mo-go.end{background:rgba(255,255,255,.18)!important;color:#fff!important}
#twocode-modes .mo-go:active{transform:scale(.97);transition:transform .1s ease-out}
#twocode-modes .mo-opt{display:flex;align-items:center;gap:10px;width:100%;height:40px;border-top:1px solid rgba(255,255,255,.12);text-align:left;font-size:13.5px;font-weight:600}
#twocode-modes .mo-opt svg{flex:none;color:rgba(255,255,255,.8)}
#twocode-modes .mo-opt span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-modes .mo-opt:disabled{cursor:default;color:rgba(255,255,255,.55)}
#twocode-modes .mo-tog{position:relative;flex:none;width:36px;height:22px;border-radius:11px;background:#2c2c31;transition:background .15s}
#twocode-modes .mo-tog i{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#8e8e93;transition:transform .22s cubic-bezier(.2,.9,.3,1),background .15s}
#twocode-modes .mo-tog.on{background:#fff}
#twocode-modes .mo-tog.on i{transform:translateX(14px);background:#000}`;
  document.head.appendChild(style);

  const svg = d => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    work: '<rect x="3" y="7.5" width="18" height="12.5" rx="2.5"/><path d="M9 7.5V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5"/>',
    study: '<path d="M12 6.5C10 5 7 4.5 4 5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v14"/>',
    sleep: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    game: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4M16 12h.01M18 14h.01"/>',
    shield: '<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6z"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
  };
  const BASE = {
    work: { min: 50, block: true, quiet: true, music: true },
    study: { min: 25, block: true, quiet: true, music: true },
    sleep: { until: 7, block: false, quiet: true, music: false }, // until 7 in the morning
    game: { min: 120, block: false, quiet: true, music: true, hide: true },
  };
  const NAMES = { work: ['Werk', 'Work'], study: ['Studie', 'Study'], sleep: ['Slapen', 'Sleep'], game: ['Game', 'Game'] };
  const F = () => window.__twocodeFocus, prefs = () => window.__twocodePrefs?.() || {}, T = (nl, en) => prefs().lang === 'en' ? en : nl;
  const locked = () => Boolean(window.__twocodeLicense?.()?.locked?.includes('guard')); // the focus guard is a paid app (license-main.cjs)
  let saved = {}; try { saved = JSON.parse(localStorage.getItem('twocode:modes')) || {}; } catch {}
  const conf = saved.conf || {}, keep = () => { try { localStorage.setItem('twocode:modes', JSON.stringify({ conf, pick, running })); } catch {} };
  let pick = BASE[saved.pick] ? saved.pick : 'work', running = saved.running && BASE[saved.running.id] ? saved.running : null, lastKey = '';
  const modeOf = id => ({ ...BASE[id], ...conf[id] });
  const secondsOf = m => { if (m.until == null) return m.min * 60; const now = new Date(), end = new Date(now); end.setHours(m.until, 0, 0, 0); if (end <= now) end.setDate(end.getDate() + 1); return Math.round((end - now) / 1000); };
  const mmss = sec => { const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0'); };
  const SITES = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', twitter: 'X', x: 'X', reddit: 'Reddit', netflix: 'Netflix', facebook: 'Facebook', twitch: 'Twitch', steam: 'Steam', discord: 'Discord' };
  const sites = () => { const list = (prefs().guardSites || []).map(s => SITES[s] || s); return list.length ? list.slice(0, 3).join(', ') + (list.length > 3 ? ' +' + (list.length - 3) : '') : T('je afleiders', 'what distracts you'); };

  window.__twocodeMode = () => running ? { id: running.id, quiet: modeOf(running.id).quiet } : null; // the notifications ask this (only Claude gets through)

  function start() {
    const m = modeOf(pick); running = { id: pick, guard: Boolean(prefs().guardOn), blocked: Boolean(m.block && !locked()) };
    F()?.start(secondsOf(m));
    if (running.blocked) window.__twocodeSetPrefs?.({ guardOn: true });
    if (!m.music && spotifyState?.is_playing) window.twocode?.spotifyControl?.('pause');
    if (m.hide) window.__twocodeTuck?.set(true);
    keep(); lastKey = ''; render();
  }
  function finish() { // back to how it was
    if (running?.blocked) window.__twocodeSetPrefs?.({ guardOn: running.guard });
    running = null; keep(); lastKey = ''; render();
  }
  setInterval(() => { if (running && !F()?.active()) finish(); }, 1000);

  function render() {
    if (currentView !== 'modes') return;
    const shownId = running ? running.id : pick, m = modeOf(shownId), blockOff = locked();
    const key = [shownId, running ? 1 : 0, m.block, m.quiet, m.music, blockOff, sites(), prefs().lang].join('|');
    if (key === lastKey) return update();
    lastKey = key;
    const opt = (k, icon, label, on, off) => `<button type="button" class="mo-opt" data-opt="${k}"${off ? ' disabled' : ''}>${svg(ICON[icon])}<span>${label}</span><i class="mo-tog${on ? ' on' : ''}" role="switch" aria-checked="${on}"><i></i></i></button>`;
    root.innerHTML = `<div class="mo-list">${Object.keys(BASE).map(id => `<button type="button" class="mo-row${id === shownId ? ' on' : ''}" data-pick="${id}">${svg(ICON[id])}${T(...NAMES[id])}</button>`).join('')}</div>
      <div class="mo-main"><div class="mo-top"><span class="mo-num" id="mo-num"></span><button type="button" class="mo-go${running ? ' end' : ''}" data-go="1">${running ? T('Stop', 'End') : 'Start'}</button></div>
      ${opt('block', 'shield', blockOff ? T('Sites blokkeren: ontgrendel de Focusbewaker', 'Block sites: unlock the Focus guard') : T(`Blokkeer ${sites()}`, `Block ${sites()}`), m.block && !blockOff, blockOff || running)}
      ${opt('quiet', 'bell', T('Alleen Claude mag je storen', 'Only Claude can reach you'), m.quiet, running)}
      ${opt('music', 'music', T('Mijn muziek blijft aan', 'Keep my music on'), m.music, running)}</div>`;
    update();
  }
  function update() {
    const num = root.querySelector('#mo-num'), f = F(); if (!num || !f) return;
    num.textContent = running && f.active() ? mmss(Math.ceil(f.left() / 1000)) : mmss(secondsOf(modeOf(pick)));
    window.__twocodeTintIsland = '#7a4be0'; window.__twocodeTintAt = performance.now(); window.__twocodeTintStrength = running ? 1 : 0.9;
  }
  root.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pick) { if (running) return; pick = b.dataset.pick; keep(); }
    if (b.dataset.opt) { const m = modeOf(pick); (conf[pick] ||= {})[b.dataset.opt] = !m[b.dataset.opt]; keep(); }
    if (b.dataset.go) { if (running) { F()?.stop(); finish(); } else start(); return; }
    sound('click'); lastKey = ''; render();
  });
  root.addEventListener('wheel', e => { // scroll on the time: 5 minutes per notch, up or right is more (focus-ui.js)
    if (running || !e.target.closest('.mo-top')) return; const m = modeOf(pick); if (m.until != null) return;
    e.preventDefault(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY; if (!d) return;
    (conf[pick] ||= {}).min = Math.max(5, Math.min(600, m.min + (d > 0 ? 5 : -5))); keep(); update(); sound('click');
  }, { passive: false });

  const baseExpanded = drawExpanded;
  drawExpanded = function (alpha) { if (currentView !== 'modes') return baseExpanded(alpha); drawHeader(alpha); };
  let shown = false;
  (function position() {
    const show = currentView === 'modes' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__twocodePage.place(root, contentRect()); if (!shown) lastKey = ''; render(); }
    shown = show;
    requestAnimationFrame(position);
  })();
})();
