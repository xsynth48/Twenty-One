'use strict';
// Focus page (V3): big numbers left, the buttons right, under them a scale with a needle. Drag on the scale or scroll to set the time.
// Timer logic lives in twocode-fun.js (window.__twocodeFocus); layout comes from pages-ui.js.
(function focusPage() {
  const root = document.createElement('section'); root.id = 'twocode-focus'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#twocode-focus{position:absolute;z-index:60;display:none;color:#fff;font:15px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:auto;user-select:none}
#twocode-focus *{box-sizing:border-box}
#twocode-focus button{border:0;cursor:pointer;font-family:inherit;color:#fff;background:transparent;padding:0}
#twocode-focus .fo-now{position:absolute;left:0;top:2px;font:500 72px/72px "JetBrains Mono",Consolas,monospace;letter-spacing:-.04em}
#twocode-focus .fo-end{position:absolute;left:3px;top:80px;font-size:12.5px;font-weight:500;color:rgba(255,255,255,.75)}
#twocode-focus .fo-btns{position:absolute;right:0;top:14px;display:flex;gap:7px}
#twocode-focus .fo-b{height:46px;padding:0 20px;border-radius:14px;font-size:15px;font-weight:700;background:rgba(255,255,255,.13)}
#twocode-focus .fo-b:hover{background:rgba(255,255,255,.2)}
#twocode-focus .fo-b.w{background:#fff;color:#000;padding:0 26px}
#twocode-focus .fo-b.w:hover{background:#e5e5ea}
#twocode-focus .fo-b:active{transform:scale(.97);transition:transform .1s ease-out}
#twocode-focus .fo-b:disabled{opacity:.4;cursor:default}
#twocode-focus .fo-scale{position:absolute;left:0;right:0;top:114px;height:48px;touch-action:none}
#twocode-focus .fo-scale.can{cursor:ew-resize}
#twocode-focus .fo-t{position:relative;height:26px}
#twocode-focus .fo-t::before{content:"";position:absolute;left:0;right:0;bottom:0;height:9px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.45) 0 1px,transparent 1px calc(100% / 60))}
#twocode-focus .fo-t::after{content:"";position:absolute;left:0;right:0;bottom:0;height:18px;background:repeating-linear-gradient(90deg,#fff 0 1px,transparent 1px calc(100% / 6))}
#twocode-focus .fo-needle{position:absolute;bottom:0;width:3px;height:26px;margin-left:-1px;background:#fff;box-shadow:0 0 10px #c9a8ff;z-index:1}
#twocode-focus .fo-l{position:relative;height:14px;margin-top:6px;font:400 10.5px "JetBrains Mono",Consolas,monospace;color:rgba(255,255,255,.72)}
#twocode-focus .fo-l span{position:absolute;transform:translateX(-50%)}
#twocode-focus .fo-l span:first-child{transform:none}
#twocode-focus .fo-l span:last-child{transform:translateX(-100%)}`;
  document.head.appendChild(style);

  const F = () => window.__twocodeFocus;
  const EN = () => window.__twocodePrefs?.().lang === 'en', T = (nl, en) => EN() ? en : nl;
  const SCALE = 60; // minutes on the scale; scrolling goes further, then the needle waits at the end
  let lastKey = '';
  const at = ms => new Date(ms).toLocaleTimeString(...window.__twocodeTimeArgs());
  const mmss = sec => { const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0'); };
  function render() {
    const f = F(); if (!f) return;
    const running = f.active(), paused = running && f.paused?.();
    const key = running ? (paused ? 'paused' : 'run') : 'idle';
    if (key === lastKey) return update(); // only rebuild when something changed
    lastKey = key;
    const buttons = running
      ? `<button type="button" class="fo-b" data-plus="300">+5 min</button><button type="button" class="fo-b" data-stop="1">${T('Stop', 'Stop')}</button><button type="button" class="fo-b w" data-pause="1">${paused ? T('Verder', 'Resume') : T('Pauze', 'Pause')}</button>`
      : `<button type="button" class="fo-b w" data-start="1">Start</button>`;
    root.innerHTML = `<div class="fo-now" id="fo-left"></div><div class="fo-end" id="fo-end"></div><div class="fo-btns">${buttons}</div>
      <div class="fo-scale${running ? '' : ' can'}" id="fo-scale"><div class="fo-t"><i class="fo-needle" id="fo-needle"></i></div><div class="fo-l">${[0, 10, 20, 30, 40, 50, 60].map(n => `<span style="left:${n / SCALE * 100}%">${n}</span>`).join('')}</div></div>`;
    update();
  }
  function update() {
    const f = F(); if (!f) return;
    const left = root.querySelector('#fo-left'), end = root.querySelector('#fo-end'), needle = root.querySelector('#fo-needle'), running = f.active();
    const sec = running ? Math.ceil(f.left() / 1000) : f.chosen();
    if (left) left.textContent = running ? f.label() : mmss(sec);
    if (needle) needle.style.left = Math.min(100, sec / 60 / SCALE * 100).toFixed(2) + '%';
    if (end) end.textContent = running && f.paused?.() ? T('Op pauze', 'Paused') : T('Klaar om ', 'Done at ') + at(Date.now() + (running ? f.left() : f.chosen() * 1000));
    window.__twocodeTintIsland = '#7a4be0'; window.__twocodeTintAt = performance.now(); window.__twocodeTintStrength = running ? 1 : 0.9; // always purple; stronger while the timer runs
  }
  const setMinutes = (m, tick) => { const f = F(), now = f.chosen(); f.choose(Math.max(1, Math.min(24 * 60 - 1, m)) * 60); update(); if (tick && f.chosen() !== now) sound('click'); };
  let sliding = false;
  const fromX = x => { const r = root.querySelector('#fo-scale')?.getBoundingClientRect(); if (r) setMinutes(Math.round((x - r.left) / r.width * SCALE), true); };
  root.addEventListener('pointerdown', e => { if (!e.target.closest('#fo-scale') || F()?.active()) return; sliding = true; root.setPointerCapture?.(e.pointerId); fromX(e.clientX); });
  root.addEventListener('pointermove', e => { if (sliding) fromX(e.clientX); });
  root.addEventListener('pointerup', () => { sliding = false; });
  root.addEventListener('click', e => {
    const b = e.target.closest('button'), f = F(); if (!b || !f) return;
    if (b.dataset.start) f.start();
    if (b.dataset.plus) f.add(Number(b.dataset.plus));
    if (b.dataset.stop) f.stop();
    if (b.dataset.pause) { if (f.paused?.()) f.resume?.(); else f.pause?.(); }
    sound('click'); lastKey = ''; render();
  });
  // Scroll to set the time, one minute per notch (a customer: no click where nothing changes). Up or right is more: a touchpad
  // also scrolls sideways, and that only ever added minutes (a customer's timer ran up to 4 hours, even scrolling back).
  root.addEventListener('wheel', e => { const f = F(); if (!f || f.active()) return; e.preventDefault(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : -e.deltaY; if (d) setMinutes(Math.round(f.chosen() / 60) + (d > 0 ? 1 : -1), true); }, { passive: false });

  const baseExpanded = drawExpanded;
  drawExpanded = function (alpha) { if (currentView !== 'focus') return baseExpanded(alpha); drawHeader(alpha); };
  let shown = false;
  (function position() {
    const show = currentView === 'focus' && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) { window.__twocodePage.place(root, contentRect()); if (!shown) lastKey = ''; render(); }
    shown = show;
    requestAnimationFrame(position);
  })();
})();
