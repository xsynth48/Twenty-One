'use strict';
// Twenty-One Drop in the island (beta 56), like AirDrop for Windows: "Phone" at the top of the tray page turns the page into
// a QR code. Scan it with your phone's camera: what is in the tray is on your phone, and what you send from your phone
// lands in Downloads and in the tray (drop-main.cjs does the sending, end-to-end encrypted, through api.twocode.nl).
(function dropUi() {
  const api = window.twocode;
  if (!api?.dropStart || !window.__twocodeQR) return;
  const en = () => window.__twocodePrefs?.().lang === 'en';
  const T = (nl, e) => (en() ? e : nl);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]));
  const size = b => (!b ? '' : b < 1e6 ? Math.max(1, Math.round(b / 1e3)) + ' kB' : (b / 1e6).toFixed(b < 1e7 ? 1 : 0).replace('.', en() ? '.' : ',') + ' MB');
  let st = { on: false }, panel = false, fresh = false, drawnUrl = null, sideHtml = '';

  api.onDropStatus?.(v => { st = v || { on: false }; if (panel && currentView === 'tray') window.__twocodeTrayRender?.(); });
  api.onDropEvent?.(ev => {
    if (ev?.kind === 'received') {
      window.__twocodeTrayReload?.();
      window.__twocodeNotice('phoneFile', { title: T(`Ontvangen van je ${ev.phone || 'telefoon'}`, `Received from your ${ev.phone || 'phone'}`), body: T(`${ev.name} ligt in je lade`, `${ev.name} is in your tray`), open: () => window.__twocodeGo?.('tray') });
      window.__twocodeCheer?.(); window.__twocodeChime?.('pop');
    } else if (ev?.kind === 'phone') window.__twocodeChime?.('pop');
  });

  // the tray page is taller while it shows the code
  const baseHeight = targetHeight;
  targetHeight = function () { return baseHeight(); };
  async function show(on) {
    panel = on; fresh = on;
    if (on && !st.on) { st = { on: false, starting: true }; window.__twocodeTrayRender?.(); st = (await api.dropStart().catch(() => null)) || { on: false, error: 'offline' }; }
    if (!on && st.on) st = (await api.dropStop().catch(() => null)) || { on: false };
    if (mode === 'expanded') setMode('expanded', false); // grow or shrink to the new height
    window.__twocodeTrayRender?.();
  }
  window.__twocodeDrop = { open: () => panel, status: () => st, show };

  // ---------- the page: the code left, what is going on right ----------
  const style = document.createElement('style'); style.textContent = `
#twocode-extras .dr{display:flex;gap:18px;height:100%;align-items:center}
#twocode-extras .dr.new{animation:dr-in .28s cubic-bezier(.2,.9,.3,1) both}
#twocode-extras .dr-qr{position:relative;flex:none;width:156px;height:156px;border-radius:16px;background:#fff;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.45)}
/* while it waits for your phone, soft rings go out from the code (like a phone looking for another one); a green check once it is there */
#twocode-extras .dr-qr.radar::before,#twocode-extras .dr-qr.radar::after{content:'';position:absolute;inset:-2px;border-radius:18px;border:2px solid rgba(10,132,255,.6);animation:dr-ring 2.8s cubic-bezier(.15,.6,.3,1) infinite;pointer-events:none}
#twocode-extras .dr-qr.radar::after{animation-delay:1.4s}
#twocode-extras .dr-ok{position:absolute;right:-8px;top:-8px;width:26px;height:26px;border-radius:50%;background:#30d158 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/14px no-repeat;box-shadow:0 0 0 3px #000;transform:scale(0);transition:transform .4s cubic-bezier(.2,1.5,.35,1)}
#twocode-extras .dr-qr.ok .dr-ok{transform:scale(1)}
/* the tray's files, small, with a blue check once they are on the phone */
#twocode-extras .dr-files{display:flex;align-items:center;gap:7px;min-width:0;margin:1px 0}
#twocode-extras .dr-thumb{position:relative;flex:none;width:28px;height:28px;border-radius:8px;background:#2c2c2e;display:grid;place-items:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);transition:opacity .3s}
#twocode-extras .dr-thumb img{width:100%;height:100%;object-fit:cover;border-radius:8px}
#twocode-extras .dr-thumb b{font-size:7.5px;font-weight:700;color:#c7c7cc;letter-spacing:.02em}
#twocode-extras .dr-thumb.more b{font-size:10px;color:#fff}
#twocode-extras .dr-thumb.up{opacity:.5;animation:dr-pulse 1.4s ease-in-out infinite}
#twocode-extras .dr-thumb.done::after{content:'';position:absolute;right:-5px;bottom:-5px;width:15px;height:15px;border-radius:50%;background:#0a84ff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='3.4' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 12.5l4.5 4.5L19 7.5'/%3E%3C/svg%3E") center/9px no-repeat;box-shadow:0 0 0 2px #000}
#twocode-extras .dr-files span{margin-left:3px;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-extras .dr-qr.wait{background:#1c1c1e;box-shadow:none}
#twocode-extras .dr-qr canvas{position:static;inset:auto;display:block;image-rendering:pixelated;touch-action:auto}
#twocode-extras .dr-spin{width:22px;height:22px;border-radius:50%;border:2.5px solid #3a3a3c;border-top-color:#fff;animation:dr-spin .8s linear infinite}
#twocode-extras .dr-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:7px}
#twocode-extras .dr-title{font-size:19px;line-height:23px;font-weight:700;letter-spacing:-.01em}
#twocode-extras .dr-sub{font-size:12.5px;line-height:17px;color:#8e8e93;margin-top:-3px}
#twocode-extras .dr-line{display:flex;align-items:center;gap:8px;font-size:12.5px;line-height:17px;color:#fff;min-width:0}
#twocode-extras .dr-line span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-extras .dr-dot{flex:none;width:8px;height:8px;border-radius:50%;background:#636366}
#twocode-extras .dr-dot.wait{animation:dr-pulse 1.4s ease-in-out infinite}
#twocode-extras .dr-dot.on{background:#30d158;box-shadow:0 0 8px rgba(48,209,88,.6)}
#twocode-extras .dr-dot.blue{background:#0a84ff}
#twocode-extras .dr-dot.warn{background:#ff9f0a}
#twocode-extras .dr-bar{height:3px;border-radius:2px;background:#3a3a3c;overflow:hidden;margin:-2px 0 0 16px}
#twocode-extras .dr-bar i{display:block;height:100%;background:#0a84ff;transition:width .25s ease-out}
#twocode-extras .dr-foot{display:flex;align-items:center;gap:10px;margin-top:4px}
#twocode-extras .dr-lock{display:flex;align-items:center;gap:5px;font-size:11px;color:#8e8e93;margin-right:auto}
#twocode-extras .dr-btn{height:26px;padding:0 13px;border-radius:13px;background:#2c2c2e !important;font-size:12px;font-weight:600}
#twocode-extras .dr-btn:hover{background:#3a3a3c !important}
#twocode-extras .dr-btn.main{background:#fff !important;color:#000 !important}
#twocode-extras .dr-btn:active{transform:scale(.97)}
#twocode-extras .dr-link{color:#0a84ff !important;font-size:12.5px;font-weight:600}
@keyframes dr-in{0%{opacity:0;transform:scale(.97)}}
@keyframes dr-spin{to{transform:rotate(360deg)}}
@keyframes dr-pulse{50%{opacity:.35}}
@keyframes dr-ring{0%{transform:scale(1);opacity:.9}100%{transform:scale(1.24);opacity:0}}
@media (prefers-reduced-motion: reduce){#twocode-extras .dr-qr.radar::before,#twocode-extras .dr-qr.radar::after,#twocode-extras .dr-thumb.up{animation:none}}`;
  document.head.appendChild(style);
  const lock = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';

  function drawCode(c, text) {
    const q = window.__twocodeQR(text, 'M'), quiet = 2, n = q.size + quiet * 2, dpr = window.devicePixelRatio || 1;
    const px = Math.max(1, Math.floor(138 * dpr / n)), side = px * n;
    c.width = c.height = side; c.style.width = c.style.height = side / dpr + 'px';
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, side, side); g.fillStyle = '#000';
    for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.dark(x, y)) g.fillRect((x + quiet) * px, (y + quiet) * px, px, px);
  }

  /** extras-ui.js calls this for the tray page; true: the phone page is shown instead of the files. */
  window.__twocodeDropPanel = root => {
    if (!panel) return false;
    const files = window.__twocodeTrayCount?.() || 0, ph = st.phone, line = (dot, text, extra = '') => `<div class="dr-line"><i class="dr-dot ${dot}"></i><span>${text}</span>${extra}</div>`;
    let title, sub, lines = '', foot;
    if (st.error && !st.on) {
      title = T('twocode.nl niet bereikt', "Couldn't reach twocode.nl");
      sub = T('Je telefoon en je pc gaan via internet. Check je verbinding en probeer het nog eens.', 'Your phone and PC connect through the internet. Check your connection and try again.');
      foot = `<button type="button" class="dr-btn" data-dr="stop">${T('Terug', 'Back')}</button><button type="button" class="dr-btn main" data-dr="again">${T('Opnieuw', 'Try again')}</button>`;
    } else if (st.expired) {
      title = T('De code is verlopen', 'The code has expired'); sub = T('Een code werkt een uur. Maak een nieuwe.', 'A code works for an hour. Make a new one.');
      foot = `<button type="button" class="dr-btn" data-dr="stop">${T('Terug', 'Back')}</button><button type="button" class="dr-btn main" data-dr="again">${T('Nieuwe code', 'New code')}</button>`;
    } else {
      title = ph ? T(`${esc(ph)} is verbonden`, `${esc(ph)} is connected`) : T('Scan met je telefoon', 'Scan with your phone');
      sub = ph ? T('Tik op je telefoon op "Stuur naar pc". Wat in de lade staat, staat al op je telefoon.', 'Tap "Send to PC" on your phone. What is in the tray is on your phone already.')
        : T('Richt de camera van je telefoon op de code en tik op de link.', "Point your phone's camera at the code and tap the link.");
      lines += ph ? '' : st.on ? line('wait', st.phoneEver ? T('Je telefoon is weg · scan opnieuw om verder te gaan', 'Your phone left · scan again to go on') : T('Wacht op je telefoon…', 'Waiting for your phone…')) : line('wait', T('Code maken…', 'Making a code…'));
      const job = st.receiving ? { t: T(`Ontvangen: ${esc(st.receiving.name)}`, `Receiving ${esc(st.receiving.name)}`), p: st.receiving.pct } : st.sending ? { t: T(`Naar je telefoon: ${esc(st.sending.name)}`, `To your phone: ${esc(st.sending.name)}`), p: st.sending.pct } : null;
      if (job) lines += line('blue', `${job.t} · ${Math.round(job.p * 100)}%`) + `<div class="dr-bar"><i style="width:${Math.round(job.p * 100)}%"></i></div>`;
      else if (st.on && st.files?.length) {
        const more = st.files.length - 5, thumbs = st.files.slice(0, 5).map(f => { const img = window.__twocodeKindOf?.(f.name) === 'image', ext = (/\.([a-z0-9]{1,4})$/i.exec(f.name)?.[1] || '').toUpperCase();
          return `<i class="dr-thumb ${f.done ? 'done' : 'up'}" title="${esc(f.name)}">${img ? `<img src="${esc(window.__twocodeFileUrl(f.path))}" alt="">` : `<b>${esc(ext)}</b>`}</i>`; }).join('');
        lines += `<div class="dr-files">${thumbs}${more > 0 ? `<i class="dr-thumb more"><b>+${more}</b></i>` : ''}<span>${st.ready ? T('op je telefoon', 'on your phone') : T('klaarzetten…', 'getting ready…')}</span></div>`;
      } else if (st.on) lines += files ? line('blue', T('Bestanden uit de lade klaarzetten…', 'Getting the tray files ready…'))
        : line('', T('Sleep bestanden op het eiland om ze naar je telefoon te sturen', 'Drop files on the island to send them to your phone'));
      if (st.tooBig?.length) lines += line('warn', T(`Te groot voor je telefoon (max. 500 MB): ${esc(st.tooBig[0])}`, `Too big for your phone (max. 500 MB): ${esc(st.tooBig[0])}`));
      if (st.received?.length) lines += line('on', T(`Ontvangen: ${esc(st.received[0])}`, `Received ${esc(st.received[0])}`), ` <button type="button" class="dr-link" data-dr="show">${T('Toon', 'Show')}</button>`);
      if (st.error) lines += line('warn', T('Verbinding kwijt · probeert het opnieuw…', 'Connection lost · trying again…'));
      foot = `<button type="button" class="dr-btn" data-dr="stop">${T('Stop', 'Stop')}</button>`;
    }
    let wrap = root.querySelector(':scope > .dr');
    if (!wrap || fresh) { root.innerHTML = `<div class="dr${fresh ? ' new' : ''}"><div class="dr-qr"></div><div class="dr-side"></div></div>`; wrap = root.firstElementChild; drawnUrl = null; sideHtml = ''; }
    fresh = false;
    const qr = wrap.querySelector('.dr-qr'), waiting = st.on && !ph && !st.expired;
    qr.className = 'dr-qr' + (st.url ? '' : ' wait') + (waiting ? ' radar' : '') + (ph ? ' ok' : '');
    if ((st.url || '') !== drawnUrl) {
      qr.innerHTML = st.url ? '<canvas></canvas><i class="dr-ok"></i>' : '<i class="dr-spin"></i>';
      if (st.url) drawCode(qr.querySelector('canvas'), st.url);
      drawnUrl = st.url || '';
    }
    const html = `<b class="dr-title">${title}</b><p class="dr-sub">${sub}</p>${lines}
      <div class="dr-foot"><span class="dr-lock">${lock}${T('Versleuteld · weg na een uur', 'Encrypted · gone after an hour')}</span>${foot}</div>`;
    if (html === sideHtml) return true;
    sideHtml = html; wrap.querySelector('.dr-side').innerHTML = html;
    for (const b of wrap.querySelectorAll('[data-dr]')) b.addEventListener('click', async () => {
      sound('click');
      if (b.dataset.dr === 'stop') show(false);
      else if (b.dataset.dr === 'show') api.dropShow?.();
      else if (b.dataset.dr === 'again') { st = { on: false }; panel = false; show(true); }
    });
    return true;
  };
  // while the code is shown, the tray's own list is not: a file dropped on the island goes to the phone by itself
  setInterval(() => { if (panel && st.on && currentView === 'tray' && mode === 'expanded') api.dropStatus?.().then(v => { if (v) st = v; }).catch(() => {}); }, 4000);
})();
