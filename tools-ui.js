'use strict';
// Small tools in the island: clipboard history ("Klembord"), one quick note ("Notitie"), the agenda with the weather,
// plus the keyboard shortcuts to them (shortcuts-main.cjs). Layout comes from pages-ui.js (same as every page).
(function toolsPages() {
  const api = window.twocode;
  if (!api?.clipsGet) return;
  const root = document.createElement('section'); root.id = 'twocode-tools'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#twocode-tools{position:absolute;z-index:60;display:none;color:#f4f7ef;font:12px/1.4 Inter, "Segoe UI",sans-serif;pointer-events:auto}
#twocode-tools *{box-sizing:border-box}
#twocode-tools{font-family:Inter,"Segoe UI",sans-serif;color:#fff}
#twocode-tools button{border:0;background:transparent;color:#fff;font:inherit;padding:0;cursor:pointer}
/* clipboard: a list with thin lines; what kind it is in small capitals */
#twocode-tools .tl-list{height:100%;overflow:auto;scrollbar-width:none}
#twocode-tools .tl-row{display:flex;align-items:center;gap:10px;width:100%;height:44px;text-align:left;border-top:1px solid rgba(255,255,255,.13)}
#twocode-tools .tl-row:first-child{border-top:0}
#twocode-tools .tl-row:hover .tl-b{color:#fff;opacity:.72}
#twocode-tools .tl-row:active{transform:scale(.995);transition:transform .1s ease-out}
#twocode-tools .tl-k{flex:none;width:60px;font:400 10.5px "JetBrains Mono",Consolas,monospace;letter-spacing:.09em;color:rgba(255,255,255,.72)}
#twocode-tools .tl-b{flex:1;min-width:0;font-size:14px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-tools .tl-b.mono{font:400 13px "JetBrains Mono",Consolas,monospace}
#twocode-tools .tl-sw{flex:none;width:16px;height:16px;border-radius:5px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
#twocode-tools .tl-w{flex:none;font:400 11px "JetBrains Mono",Consolas,monospace;color:rgba(255,255,255,.65)}
#twocode-tools .tl-w.ok{color:#8df0ae}
#twocode-tools .tl-clear{display:block;height:34px;font-size:12px;font-weight:600;color:#ff6b6e}
#twocode-tools .tl-empty{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;text-align:center}
#twocode-tools .tl-empty b{font-size:17px;font-weight:600}
#twocode-tools .tl-empty span{font-size:13px;color:#8e8e93}
/* note: how far you are, big on the left; the lines on the right */
#twocode-tools .tl-paper{position:relative;height:100%;cursor:text}
#twocode-tools .tl-side{position:absolute;left:6px;top:6px;width:190px;height:170px}
#twocode-tools .tl-name{font:400 10.5px "JetBrains Mono",Consolas,monospace;letter-spacing:.09em;color:rgba(255,255,255,.72);text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-tools .tl-count{margin-top:12px;font:500 88px/88px "JetBrains Mono",Consolas,monospace;letter-spacing:-.07em;white-space:nowrap}
#twocode-tools .tl-big{margin-top:12px;font-size:30px;line-height:35px;font-weight:700;letter-spacing:-.03em;overflow-wrap:anywhere;max-height:105px;overflow:hidden}
#twocode-tools .tl-bars{display:flex;gap:5px;margin-top:14px}
#twocode-tools .tl-bars i{flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.28)}
#twocode-tools .tl-bars i.on{background:#fff}
#twocode-tools .tl-rule{position:absolute;left:214px;top:4px;width:1px;height:176px;background:rgba(255,255,255,.13)}
#twocode-tools .tl-lines{position:absolute;left:234px;right:0;top:0;height:188px;overflow:auto;scrollbar-width:none;display:flex;flex-direction:column;justify-content:safe center}
#twocode-tools .tl-line{display:flex;align-items:center;gap:11px;min-height:40px;flex:none;font-size:16px;line-height:22px;font-weight:500}
#twocode-tools .tl-check{flex:none;width:19px;height:19px;border-radius:50%;border:1.600px solid rgba(255,255,255,.45);display:grid;place-items:center}
#twocode-tools .tl-check:hover{border-color:#fff}
#twocode-tools .tl-line.ok .tl-check{background:#fff;border-color:#fff}
#twocode-tools .tl-line.ok span{color:rgba(255,255,255,.6);text-decoration:line-through}
#twocode-tools .tl-dot{flex:none;width:5px;height:5px;border-radius:50%;background:#fff;margin:0 7px}
#twocode-tools .tl-hint{color:rgba(255,255,255,.6);font-weight:500}
#twocode-tools .tl-small{font-size:12.5px;line-height:17px;font-weight:500;color:rgba(255,255,255,.6);margin-top:10px}
#twocode-tools textarea{width:100%;height:100%;resize:none;border:0;background:transparent;color:#fff;padding:0;font:15px/26px Inter,"Segoe UI",sans-serif;outline:none;caret-color:#fff}
#twocode-tools .tl-empty b{font-size:14px}
#twocode-tools .tl-empty span{font-size:11px}
#twocode-tools textarea::placeholder{color:#8e8e93}
/* agenda: the day on a line, the month, adding something */
#twocode-tools .ag{position:relative;height:100%}
#twocode-tools .ag-side{position:absolute;right:0;top:0;display:flex;align-items:center;gap:8px;z-index:2}
#twocode-tools .ag-seg{display:inline-flex;height:30px;padding:2px;border-radius:10px;background:rgba(255,255,255,.12)}
#twocode-tools .ag-seg button{padding:0 11px;border-radius:8px;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.8)}
#twocode-tools .ag-seg button.on{background:#fff;color:#000}
#twocode-tools .ag-plus{width:30px;height:30px;border-radius:50%;background:#fff!important;color:#000!important;display:grid;place-items:center}
#twocode-tools .ag-lab{font:400 10.5px "JetBrains Mono",Consolas,monospace;letter-spacing:.09em;color:#fff;line-height:30px}
#twocode-tools .ag-title{position:absolute;left:0;top:30px;right:150px;font-size:30px;line-height:36px;font-weight:700;letter-spacing:-.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-tools .ag-time{position:absolute;right:0;top:34px;font:500 36px/36px "JetBrains Mono",Consolas,monospace;letter-spacing:-.04em}
#twocode-tools .ag-del{position:absolute;right:0;top:74px;font-size:12px;font-weight:600;color:#ff6b6e}
#twocode-tools .ag-ruler{position:absolute;left:0;right:0;top:92px;height:64px;touch-action:none}
#twocode-tools .ag-ruler::before{content:"";position:absolute;left:0;right:-1px;top:26px;height:10px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.45) 0 1px,transparent 1px calc(100% / 12))}
#twocode-tools .ag-h{position:absolute;top:40px;font:400 10.5px "JetBrains Mono",Consolas,monospace;color:rgba(255,255,255,.75);transform:translateX(-50%)}
#twocode-tools .ag-h:first-of-type{transform:none}
#twocode-tools .ag-h.last{transform:translateX(-100%)}
#twocode-tools .ag-e{position:absolute;top:8px;height:28px;min-width:6px;border-radius:7px;background:rgba(255,255,255,.34)}
#twocode-tools .ag-e:hover{background:rgba(255,255,255,.5)}
#twocode-tools .ag-e.on{background:#fff}
#twocode-tools .ag-now{position:absolute;top:2px;width:3px;height:38px;margin-left:-1px;background:#fff;box-shadow:0 0 10px #fff;pointer-events:none}
#twocode-tools .ag-more{position:absolute;left:0;bottom:0;color:rgba(255,255,255,.6);font-size:11.5px;font-weight:500}
#twocode-tools .ag-more:hover{color:#fff}
#twocode-tools .ag-who{position:absolute;left:0;bottom:0;font:400 10.5px "JetBrains Mono",Consolas,monospace;letter-spacing:.04em;color:rgba(255,255,255,.6)}
#twocode-tools .ag-gold{position:absolute;left:0;bottom:-6px;display:flex;align-items:center;gap:12px}
#twocode-tools .ag-gold .ag-more{position:static}
#twocode-tools .ag-gbtn{display:inline-flex;align-items:center;gap:10px;height:30px;padding:0 12px;border-radius:15px;background:#131314!important;border:1px solid #8E918F;color:#E3E3E3!important;font:500 12.5px Roboto,Inter,"Segoe UI",sans-serif}
/* mail: three tiles with only a number; asking you to sign in; mailing a file */
#twocode-tools .ml-tiles{height:100%;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
#twocode-tools .ml-t{position:relative;display:flex;flex-direction:column;justify-content:space-between;text-align:left;padding:13px 16px 12px;border-radius:22px;border:1px solid rgba(255,255,255,.1)!important;background:radial-gradient(130% 92% at 50% 118%,rgba(255,255,255,.2) 0,rgba(255,255,255,.05) 46%,transparent 74%),#0a0a0b!important;transition:transform .1s ease-out,filter .15s}
#twocode-tools .ml-t.red{background:radial-gradient(130% 92% at 50% 118%,#c0322a 0,rgba(192,50,42,.34) 46%,transparent 74%),#0a0a0b!important}
#twocode-tools .ml-t:hover{filter:brightness(1.14)}
#twocode-tools .ml-t:active{transform:scale(.98)}
#twocode-tools .ml-lab{font:400 10.5px "JetBrains Mono",Consolas,monospace;letter-spacing:.09em;color:#fff}
#twocode-tools .ml-t .ml-lab{display:flex;align-items:center;justify-content:space-between;gap:8px}
#twocode-tools .ml-t .ml-lab svg{flex:none;opacity:.5;transition:opacity .15s}
#twocode-tools .ml-t:hover .ml-lab svg{opacity:1}
#twocode-tools .ml-sub{display:block;margin-top:3px;font-size:12.5px;line-height:16px;font-weight:500;color:rgba(255,255,255,.62)}
#twocode-tools .ml-retry{margin-top:6px;height:32px;padding:0 16px!important;border-radius:16px;background:rgba(255,255,255,.14)!important;font-size:12.5px;font-weight:600}
#twocode-tools .ml-n{display:block;font-size:44px;line-height:46px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
#twocode-tools .ml-in{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center}
#twocode-tools .ml-in b{font-size:46px;line-height:48px;font-weight:700;filter:blur(7px);opacity:.75}
#twocode-tools .ml-in span{font-size:13.5px;font-weight:500;color:rgba(255,255,255,.88)}
#twocode-tools .ml-in .ag-gbtn{height:38px;padding:0 14px;border-radius:19px;font-size:13.5px;margin-top:2px}
#twocode-tools .ml-new{height:100%;display:flex;flex-direction:column;gap:8px}
#twocode-tools .ml-new .ml-lab{height:18px;line-height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-tools .ml-row{display:flex;gap:8px}
#twocode-tools .ml-new input{flex:1;min-width:0;height:40px;padding:0 14px;border-radius:13px;background:#101012;border:1px solid rgba(255,255,255,.16);color:#fff;font:500 14px Inter,"Segoe UI",sans-serif;outline:none}
#twocode-tools .ml-new input:focus{border-color:rgba(255,255,255,.5)}
#twocode-tools .ml-new button{height:40px;padding:0 16px;border-radius:13px;font-size:13.5px;font-weight:600;background:rgba(255,255,255,.13);flex:none;transition:transform .1s ease-out,background .15s}
#twocode-tools .ml-new button:hover{background:rgba(255,255,255,.2)}
#twocode-tools .ml-new button:active{transform:scale(.97)}
#twocode-tools .ml-new button.w{background:#fff;color:#000;font-weight:700;padding:0 22px}
#twocode-tools .ml-new button:disabled{opacity:.45;cursor:default}
#twocode-tools .ml-foot{display:flex;align-items:center;gap:8px;margin-top:auto}
#twocode-tools .ml-err{flex:1;min-width:0;font-size:12.5px;font-weight:500;color:#ff8a80}
#twocode-tools .ag-mtitle{position:absolute;left:0;top:0;height:30px;display:flex;align-items:center;gap:8px;font-size:18px;font-weight:700;letter-spacing:-.02em}
#twocode-tools .ag-mtitle button{width:24px;height:24px;border-radius:7px;color:rgba(255,255,255,.7);font-size:15px;font-weight:700}
#twocode-tools .ag-mtitle button:hover{background:rgba(255,255,255,.12);color:#fff}
#twocode-tools .ag-grid{position:absolute;left:0;right:0;top:32px;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-auto-rows:21px}
#twocode-tools .ag-wk{font:400 10px/21px "JetBrains Mono",Consolas,monospace;color:rgba(255,255,255,.65);text-align:center}
#twocode-tools .ag-d{display:flex;align-items:center;justify-content:center}
#twocode-tools .ag-d span{display:flex;flex-direction:column;align-items:center;justify-content:center;width:40px;height:20px;border-radius:7px;font-size:12px;line-height:13px;font-weight:500;font-variant-numeric:tabular-nums}
#twocode-tools .ag-d:hover span{background:rgba(255,255,255,.12)}
#twocode-tools .ag-d.out{color:rgba(255,255,255,.34)}
#twocode-tools .ag-d.today span{background:#fff;color:#000;font-weight:700}
#twocode-tools .ag-dots{display:flex;gap:2px;height:3px}
#twocode-tools .ag-dots i{width:3px;height:3px;border-radius:50%;background:currentColor}
#twocode-tools .ag-add{position:absolute;left:0;right:0;top:10px;display:flex;gap:8px}
#twocode-tools .ag-add input{flex:1;min-width:0;height:44px;padding:0 14px;border-radius:14px;background:#101012;border:1px solid rgba(255,255,255,.16);color:#fff;font:500 14px Inter,"Segoe UI",sans-serif;outline:none}
#twocode-tools .ag-add button{height:44px;padding:0 18px;border-radius:14px;font-size:14px;font-weight:600;background:rgba(255,255,255,.13)}
#twocode-tools .ag-add button.w{background:#fff;color:#000;font-weight:700;padding:0 22px}
#twocode-tools .ag-add button:disabled{opacity:.4;cursor:default}
#twocode-tools .ag-when{position:absolute;left:0;right:0;top:72px;display:flex;align-items:center;justify-content:space-between;font-size:13px;font-weight:600}
#twocode-tools .ag-when button{width:22px;height:22px;border-radius:7px;font-size:14px;font-weight:700;color:rgba(255,255,255,.7)}
#twocode-tools .ag-when button:hover{background:rgba(255,255,255,.12);color:#fff}
#twocode-tools .ag-when b{font:500 12.5px "JetBrains Mono",Consolas,monospace}
#twocode-tools .ag-new .ag-ruler{top:94px;cursor:pointer}
#twocode-tools .ag-sel{position:absolute;top:6px;height:32px;border-radius:8px;background:rgba(255,255,255,.2);border:2px solid #fff;cursor:grab}
#twocode-tools .ag-sel i{position:absolute;right:3px;top:7px;width:3px;height:14px;border-radius:2px;background:#fff;cursor:ew-resize}
#twocode-tools .ag-sel i::before{content:"";position:absolute;inset:-7px -6px}
#twocode-tools .tl-form{display:flex;flex-direction:column;justify-content:center;gap:7px;height:100%}
#twocode-tools .tl-form label{font-size:13px;font-weight:600}
#twocode-tools .tl-form small{font-size:11px;line-height:15px;color:#8e8e93}
#twocode-tools .tl-form small.bad{color:#ff6961}
#twocode-tools .tl-form small.ok{color:#30d158}
#twocode-tools .tl-link{color:#8e8e93;font-size:11px;margin-top:6px;display:block}
#twocode-tools .tl-link:hover{color:#fff}
#twocode-tools .tl-form input{width:100%;height:30px;border:0;border-radius:9px;background:#1c1c1e;color:#fff;padding:0 10px;font:13px Inter,"Segoe UI",sans-serif;outline:none}
#twocode-tools .tl-form .row{display:flex;gap:6px;align-items:center}
#twocode-tools .tl-form .row input{flex:1;min-width:0}
#twocode-tools .tl-form button{height:28px;padding:0 14px;border-radius:14px;background:#fff;color:#000;font-weight:600}
#twocode-tools .tl-form button.no{background:transparent;color:#8e8e93;padding:0 6px}`;
  document.head.appendChild(style);
  const esc = s => String(s).replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));

  // ---- clipboard ----
  let clips = [], copied = -1, lastRender = '';
  const loadClips = () => api.clipsGet().then(r => { if (r.ok) { clips = r.clips; render(true); } }).catch(() => {});
  api.onClips?.(r => { clips = r.clips || []; render(true); linkFromClipboard(); });
  // ---- note ----
  let note = null, savedAt = 0, saveTimer = null;
  api.noteGet().then(r => { note = r.ok ? r.text : ''; render(true); }).catch(() => { note = ''; });
  // ---- agenda (beta 80): your coming events, and linking your Google Calendar right here. Only that: a customer does not want the weather in it ----
  let agenda = null, linking = false, agendaError = '', googleUntil = 0;
  const tAg = (nl, en) => window.__twocodePrefs?.().lang === 'en' ? en : nl;
  const loadAgenda = () => api.agendaGet?.().then(r => { if (r?.ok) agenda = r; if (currentView === 'agenda') render(true); }).catch(() => {});
  setInterval(() => { if (currentView === 'agenda' && mode === 'expanded') loadAgenda(); }, 5 * 60000);
  api.onGoogle?.(() => { linking = false; loadAgenda(); });
  // Google's own button: the G, the words and the colours are theirs and may not change
  const G_LOGO = '<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.5 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.7 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.2 5.5-4.8 7.2l7.7 6c4.5-4.2 7.1-10.3 7.1-17.7z"/><path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-8-6.2C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.9-6.2z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.2-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z"/></svg>';
  const googleButton = () => `<button type="button" class="ag-gbtn" data-gsign="1">${G_LOGO}Sign in with Google</button>`;
  // ---- mail: only how many (Google lets an app see that without reading any mail). Dropping a file on the island: mail it with your own Gmail ----
  let google = null, mailCounts = null, lastPrimary = null, mailDraft = null, mailFailed = false;
  const setGoogle = s => { google = s; window.__twocodeGoogle = s; if (!s?.on?.mail) { mailCounts = null; lastPrimary = null; mailFailed = false; } if (currentView === 'mail') { pollMail(); render(true); } };
  api.googleStatus?.().then(setGoogle).catch(() => {});
  api.onGoogle?.(setGoogle);
  function pollMail() {
    if (!google?.on?.mail) return;
    api.googleMail?.().then(c => {
      mailFailed = !c; if (!c) { if (currentView === 'mail') render(true); return; }
      mailCounts = c;
      if (lastPrimary != null && c.primary > lastPrimary) { const n = c.primary - lastPrimary; window.__twocodeNotice('newMail', { title: tAg(n === 1 ? '1 nieuwe mail' : `${n} nieuwe mails`, n === 1 ? '1 new email' : `${n} new emails`), body: tAg('Klik om Gmail te openen.', 'Click to open Gmail.'), open: () => api.googleOpenMail?.('primary'), seen: currentView === 'mail' && mode === 'expanded' }); }
      lastPrimary = c.primary;
      if (currentView === 'mail') render(true);
    }).catch(() => {});
  }
  setInterval(pollMail, 120000); setTimeout(pollMail, 8000);
  window.__twocodeMailFiles = paths => { mailDraft = { paths, to: '', subject: paths.length === 1 ? paths[0].split(/[\\/]/).pop() : tAg(`${paths.length} bestanden`, `${paths.length} files`), error: '', busy: false }; setView('mail'); setMode('expanded'); lastRender = ''; setTimeout(() => { render(true); root.querySelector('#ml-to')?.focus(); }, 60); };
  function mailView() {
    if (mailDraft) {
      const d = mailDraft, names = d.paths.map(p => p.split(/[\\/]/).pop()).join(', ');
      return `<form class="ml-new" data-form="mail-send"><div class="ml-lab">${esc(tAg('MAIL', 'MAIL'))} · ${esc(names)}</div>
        <div class="ml-row"><input id="ml-to" placeholder="${esc(tAg('Naar wie?', 'Who to?'))}" maxlength="200" spellcheck="false" autocomplete="off" value="${esc(d.to)}">${google?.email ? `<button type="button" data-mailme="1">${tAg('Naar mezelf', 'To myself')}</button>` : ''}</div>
        <div class="ml-row"><input id="ml-subject" placeholder="${esc(tAg('Onderwerp', 'Subject'))}" maxlength="200" value="${esc(d.subject)}"></div>
        <div class="ml-foot"><span class="ml-err">${esc(d.error)}</span><button type="button" data-mailcancel="1">${tAg('Annuleer', 'Cancel')}</button><button type="submit" class="w"${d.busy ? ' disabled' : ''}>${d.busy ? tAg('Versturen…', 'Sending…') : tAg('Verstuur', 'Send')}</button></div></form>`;
    }
    if (!google?.signedIn) return `<div class="ml-in"><b aria-hidden="true">12</b><span>${esc(tAg('Twenty-One ziet alleen hoeveel. Niet van wie en niet wat.', 'Twenty-One only sees how many. Not who, and not what.'))}</span>${googleButton()}</div>`;
    if (!google.on?.mail) return `<div class="tl-empty"><b>${esc(tAg('Nieuwe mail staat uit', 'New mail is off'))}</b><span>${esc(tAg('Zet hem aan bij Instellingen → Connections.', 'Switch it on in Settings → Connections.'))}</span></div>`;
    // (beta 104) Gmail gave no answer: say so, with a button, instead of "Loading…" for ever
    if (!mailCounts) return mailFailed ? `<div class="tl-empty"><b>${esc(tAg('Mail ophalen lukt nu niet', 'Can\'t get your mail right now'))}</b><span>${esc(tAg('Check je internet, of log opnieuw in bij Instellingen → Connections.', 'Check your internet, or sign in again in Settings → Connections.'))}</span><button type="button" class="ml-retry" data-mailretry="1">${esc(tAg('Opnieuw', 'Try again'))}</button></div>`
      : `<div class="tl-empty"><span>${tAg('Even laden…', 'Loading…')}</span></div>`;
    // Gmail's own tab names; 18.204 instead of 18204; red only when something new is waiting
    const fmt = n => (Number(n) || 0).toLocaleString(tAg('nl-NL', 'en-US'));
    const OPEN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
    const tile = (id, label, n, red) => `<button type="button" class="ml-t${red ? ' red' : ''}" data-mailtab="${id}" title="${esc(tAg('Open Gmail', 'Open Gmail'))}"><span class="ml-lab">${esc(label)}${OPEN}</span><span><span class="ml-n" style="${fmt(n).length > 5 ? 'font-size:34px' : ''}">${esc(fmt(n))}</span><span class="ml-sub">${esc(tAg('ongelezen', 'unread'))}</span></span></button>`;
    return `<div class="ml-tiles">${tile('primary', tAg('PRIMAIR', 'PRIMARY'), mailCounts.primary, mailCounts.primary > 0)}${tile('updates', 'UPDATES', mailCounts.updates)}${tile('promotions', tAg('RECLAME', 'PROMOTIONS'), mailCounts.promotions)}</div>`;
  }
  root.addEventListener('click', e => {
    const q = n => e.target.closest('[' + n + ']'); let b;
    if ((b = q('data-mailtab'))) { sound('click'); api.googleOpenMail?.(b.dataset.mailtab); }
    else if (q('data-mailretry')) { sound('click'); mailFailed = false; render(true); pollMail(); }
    else if (q('data-mailme')) { const to = root.querySelector('#ml-to'); if (to) to.value = google?.email || ''; root.querySelector('#ml-subject')?.focus(); }
    else if (q('data-mailcancel')) { document.activeElement?.blur?.(); mailDraft = null; sound('click'); render(true); }
  });
  root.addEventListener('submit', e => {
    if (e.target.dataset.form !== 'mail-send') return;
    e.preventDefault();
    const d = mailDraft; if (!d || d.busy) return;
    d.to = e.target.querySelector('#ml-to')?.value.trim() || ''; d.subject = e.target.querySelector('#ml-subject')?.value || '';
    if (!d.to) { e.target.querySelector('#ml-to')?.focus(); return; }
    document.activeElement?.blur?.(); d.busy = true; d.error = ''; render(true);
    api.googleSend?.({ to: d.to, subject: d.subject, text: '', paths: d.paths }).then(r => {
      d.busy = false;
      if (r?.ok) { mailDraft = null; window.__twocodeNotice('mailSent', { title: tAg(`Verstuurd naar ${d.to}`, `Sent to ${d.to}`) }); pollMail(); }
      else d.error = { address: tAg('Dit mailadres klopt niet.', "That address doesn't look right."), 'too-big': tAg('Te groot: samen maximaal 25 MB.', 'Too big: 25 MB together at most.'), file: tAg('Bestand niet gevonden.', 'File not found.') }[r?.error] || tAg('Versturen lukt niet. Probeer het zo nog eens.', "Couldn't send it. Try again in a moment.");
      render(true);
    }).catch(() => { d.busy = false; d.error = tAg('Versturen lukt niet. Probeer het zo nog eens.', "Couldn't send it. Try again in a moment."); render(true); });
  });
  const HOUR0 = 8, HOUR1 = 20, HOUR = 36e5;
  let agShow = 'day', agDay = null, agMonth = null, agPick = null, agNew = null;
  const startOf = ms => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const locale = () => tAg('nl-NL', 'en-GB');
  const hm = ms => new Date(ms).toLocaleTimeString(...window.__twocodeTimeArgs());
  const place = (ms, day) => Math.max(0, Math.min(100, ((ms - day) / HOUR - HOUR0) / (HOUR1 - HOUR0) * 100));
  const hours = () => [8, 12, 16, 20].map(h => `<span class="ag-h${h === 20 ? ' last' : ''}" style="left:${(h - 8) / 12 * 100}%">${String(h).padStart(2, '0')}:00</span>`).join('');
  const side = () => `<div class="ag-side"><span class="ag-seg"><button type="button" class="${agShow === 'day' ? 'on' : ''}" data-agshow="day">${tAg('Dag', 'Day')}</button><button type="button" class="${agShow === 'month' ? 'on' : ''}" data-agshow="month">${tAg('Maand', 'Month')}</button></span><button type="button" class="ag-plus" data-agnew="1" aria-label="${tAg('Toevoegen', 'Add')}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg></button></div>`;
  function dayView() {
    const today = startOf(Date.now()), day = agDay ?? today, now = Date.now(), all = agenda.events.filter(e => startOf(e.start) === day);
    const timed = all.filter(e => !e.allDay), chosen = agPick && timed.find(e => e.start === agPick) || null, next = chosen || timed.find(e => e.end > now) || all[0] || null;
    const wait = next && !next.allDay ? Math.round((next.start - now) / 60000) : 0;
    const label = chosen ? tAg('GEKOZEN', 'SELECTED') : day !== today ? new Date(day).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase()
      : !next ? tAg('VANDAAG', 'TODAY') : next.allDay ? tAg('HELE DAG', 'ALL DAY') : wait <= 0 ? tAg('NU', 'NOW') : wait < 60 ? tAg(`STRAKS · OVER ${wait} MIN`, `NEXT · IN ${wait} MIN`) : tAg(`STRAKS · OVER ${Math.round(wait / 60)} UUR`, `NEXT · IN ${Math.round(wait / 60)} H`);
    const blocks = timed.map(e => `<button type="button" class="ag-e${e === next ? ' on' : ''}" data-agpick="${e.start}" title="${esc(e.title || '')}" style="left:${place(e.start, day)}%;width:${Math.max(0.6, place(e.end, day) - place(e.start, day))}%"></button>`).join('');
    const nowLine = day === today && place(now, day) > 0 && place(now, day) < 100 ? `<i class="ag-now" style="left:${place(now, day)}%"></i>` : '';
    const empty = agenda.calendarFailed ? tAg('Agenda niet bereikbaar', 'Calendar not reachable') : tAg('Niks gepland', 'Nothing planned');
    return `<div class="ag"><div class="ag-lab">${esc(label)}</div>${side()}
      <div class="ag-title">${esc(next ? next.title || tAg('Afspraak', 'Event') : empty)}</div>${next && !next.allDay ? `<div class="ag-time">${esc(hm(next.start))}</div>` : ''}${chosen?.own ? `<button type="button" class="ag-del" data-agdel="${esc(chosen.id)}">${tAg('Verwijder', 'Delete')}</button>` : ''}
      <div class="ag-ruler">${blocks}${nowLine}${hours()}</div>
      ${agenda.google?.on ? `<span class="ag-who">${esc(agenda.google.email)}</span>` : agenda.google?.available ? `<div class="ag-gold">${googleButton()}<button class="ag-more" data-ag="link">${tAg('Andere agenda', 'Other calendar')}</button></div>` : `<button class="ag-more" data-ag="link">${agenda.linked ? tAg('Andere agenda koppelen', 'Link another calendar') : tAg('Koppel je Google Agenda', 'Link your Google Calendar')}</button>`}</div>`;
  }
  function monthView() {
    const now = new Date(), m = agMonth || { y: now.getFullYear(), m: now.getMonth() }, first = new Date(m.y, m.m, 1), from = new Date(m.y, m.m, 1 - (first.getDay() + 6) % 7);
    const counts = {}; for (const e of agenda.events) { const k = startOf(e.start); counts[k] = (counts[k] || 0) + 1; }
    const week = tAg(['M', 'D', 'W', 'D', 'V', 'Z', 'Z'], ['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    let cells = week.map(w => `<div class="ag-wk">${w}</div>`).join('');
    for (let i = 0; i < 42; i++) { const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i), k = d.getTime(), n = counts[k] || 0, out = d.getMonth() !== m.m;
      cells += `<button type="button" class="ag-d${out ? ' out' : ''}${k === startOf(Date.now()) ? ' today' : ''}" data-agday="${k}"><span>${d.getDate()}${n ? `<em class="ag-dots">${'<i></i>'.repeat(Math.min(3, n))}</em>` : ''}</span></button>`; }
    const name = first.toLocaleDateString(locale(), { month: 'long', year: 'numeric' }).replace(/^./, c => c.toUpperCase());
    return `<div class="ag"><div class="ag-mtitle">${esc(name)}<button type="button" data-agmove="-1" aria-label="${tAg('Vorige maand', 'Previous month')}">‹</button><button type="button" data-agmove="1" aria-label="${tAg('Volgende maand', 'Next month')}">›</button></div>${side()}<div class="ag-grid">${cells}</div></div>`;
  }
  function newView() {
    const a = agNew, day = startOf(a.start), others = agenda.events.filter(e => !e.allDay && startOf(e.start) === day);
    return `<form class="ag ag-new" data-form="agenda-add"><div class="ag-add"><input id="ag-title" placeholder="${esc(tAg('Wat ga je doen?', 'What is it?'))}" maxlength="120" spellcheck="false" value="${esc(a.title)}"><button type="button" data-agcancel="1">${tAg('Annuleer', 'Cancel')}</button><button type="submit" class="w">${tAg('Voeg toe', 'Add')}</button></div>
      <div class="ag-when"><span><button type="button" data-agshift="-1" aria-label="${tAg('Dag eerder', 'A day earlier')}">‹</button> ${esc(new Date(day).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' }))} <button type="button" data-agshift="1" aria-label="${tAg('Dag later', 'A day later')}">›</button></span><b id="ag-range"></b></div>
      <div class="ag-ruler" id="ag-rail">${others.map(e => `<i class="ag-e" style="left:${place(e.start, day)}%;width:${Math.max(0.6, place(e.end, day) - place(e.start, day))}%;pointer-events:none"></i>`).join('')}<div class="ag-sel" id="ag-sel"><i data-grip="1"></i></div>${hours()}</div></form>`;
  }
  function placeNew() {
    const a = agNew, day = startOf(a.start), sel = root.querySelector('#ag-sel'), range = root.querySelector('#ag-range'); if (!a || !sel) return;
    sel.style.left = place(a.start, day) + '%'; sel.style.width = Math.max(1, place(a.end, day) - place(a.start, day)) + '%';
    if (range) range.textContent = `${hm(a.start)} ${tAg('tot', 'to')} ${hm(a.end)}`;
  }
  // drag the block to move it, its right edge to make it longer; click on the line to put it there. In steps of 15 minutes.
  let agDrag = null;
  const QUARTER = 900000;
  root.addEventListener('pointerdown', e => {
    if (!agNew || !e.target.closest('#ag-rail')) return;
    const rail = root.querySelector('#ag-rail').getBoundingClientRect(), span = (HOUR1 - HOUR0) * HOUR, grip = Boolean(e.target.closest('[data-grip]')), onSel = Boolean(e.target.closest('#ag-sel'));
    if (!onSel) { const length = agNew.end - agNew.start, day = startOf(agNew.start), at = day + HOUR0 * HOUR + (e.clientX - rail.left) / rail.width * span; agNew.start = Math.round((at - length / 2) / QUARTER) * QUARTER; agNew.end = agNew.start + length; placeNew(); }
    agDrag = { x: e.clientX, start: agNew.start, end: agNew.end, grip, span, width: rail.width }; root.setPointerCapture?.(e.pointerId); e.preventDefault();
  });
  root.addEventListener('pointermove', e => {
    if (!agDrag) return;
    const d = Math.round((e.clientX - agDrag.x) / agDrag.width * agDrag.span / QUARTER) * QUARTER, day = startOf(agDrag.start), low = day + HOUR0 * HOUR, high = day + HOUR1 * HOUR;
    if (agDrag.grip) agNew.end = Math.max(agDrag.start + QUARTER, Math.min(high, agDrag.end + d));
    else { const length = agDrag.end - agDrag.start, s = Math.max(low, Math.min(high - length, agDrag.start + d)); agNew.start = s; agNew.end = s + length; }
    placeNew();
  });
  root.addEventListener('pointerup', () => { agDrag = null; });
  root.addEventListener('click', e => {
    const q = n => e.target.closest('[' + n + ']'); let b;
    if ((b = q('data-agshow'))) { agShow = b.dataset.agshow; agPick = null; if (agShow === 'day') agDay = null; sound('click'); render(true); }
    else if ((b = q('data-agnew'))) { const base = agDay ?? startOf(Date.now()), now = Date.now(), fromNow = base === startOf(now) ? Math.ceil(now / 18e5) * 18e5 : base + 10 * HOUR, start = Math.max(base + HOUR0 * HOUR, Math.min(base + (HOUR1 - 1) * HOUR, fromNow)); agNew = { title: '', start, end: start + HOUR }; sound('click'); render(true); setTimeout(() => root.querySelector('#ag-title')?.focus(), 30); }
    else if ((b = q('data-agcancel'))) { document.activeElement?.blur?.(); agNew = null; render(true); }
    else if ((b = q('data-agshift'))) { const d = Number(b.dataset.agshift) * 864e5; agNew.title = root.querySelector('#ag-title')?.value || ''; const dayOld = startOf(agNew.start), s = agNew.start - dayOld, l = agNew.end - agNew.start, day = startOf(dayOld + d + 2 * HOUR); agNew.start = day + s; agNew.end = agNew.start + l; document.activeElement?.blur?.(); render(true); }
    else if ((b = q('data-agday'))) { agDay = Number(b.dataset.agday); agShow = 'day'; agPick = null; sound('click'); render(true); }
    else if ((b = q('data-agmove'))) { const now = new Date(), m = agMonth || { y: now.getFullYear(), m: now.getMonth() }, d = new Date(m.y, m.m + Number(b.dataset.agmove), 1); agMonth = { y: d.getFullYear(), m: d.getMonth() }; sound('click'); render(true); }
    else if ((b = q('data-agpick'))) { const v = Number(b.dataset.agpick); agPick = agPick === v ? null : v; sound('click'); render(true); }
    else if ((b = q('data-agdel'))) { api.agendaRemove?.(b.dataset.agdel).then(() => { agPick = null; loadAgenda(); }); }
  });
  function agendaView() {
    if (!agenda) return `<div class="tl-empty"><span>${tAg('Even laden…', 'Loading…')}</span></div>`;
    if (linking) {
      const looking = Date.now() < googleUntil;
      return `<form class="tl-form" data-form="calendar"><label>${tAg('Koppel je Google Agenda', 'Link your Google Calendar')}</label>
        <small class="${looking ? 'ok' : ''}">${looking ? tAg('Kies links je agenda en kopieer "Geheim adres in iCal-indeling". Robo ziet de link en koppelt hem zelf.', 'Pick your calendar on the left and copy "Secret address in iCal format". Robo sees the link and links it by himself.') : tAg('Hij opent in je browser, daar kopieer je één link. Twenty-One kan je agenda alleen lezen.', 'It opens in your browser, where you copy one link. Twenty-One can only read your calendar.')}</small>
        <div class="row"><button type="button" data-google="1">${tAg('Open Google Agenda', 'Open Google Calendar')}</button><button type="button" class="no" data-ag="back">${tAg('Terug', 'Back')}</button></div>
        <div class="row"><input id="tl-ag-calendar" placeholder="${esc(tAg('Of plak hier een agenda-link (.ics)', 'Or paste a calendar link here (.ics)'))}" maxlength="2000" spellcheck="false"><button type="submit" class="no">${tAg('Opslaan', 'Save')}</button></div>
        ${agendaError ? `<small class="bad">${esc(agendaError)}</small>` : ''}</form>`;
    }
    return agNew ? newView() : agShow === 'month' ? monthView() : dayView();
  }
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-gsign]')) return;
    sound('click'); agendaError = ''; api.googleSignIn?.().then(r => { if (r?.ok) { window.__twocodeNotice('calLinked', { title: tAg('Google gekoppeld', 'Google linked'), body: tAg('Je agenda en nieuwe mail staan nu in Twenty-One.', 'Your calendar and new mail now show in Twenty-One.') }); loadAgenda(); } }).catch(() => {});
  });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-ag]'); if (!b) return;
    document.activeElement?.blur?.(); // (render leaves the page alone while you type)
    linking = b.dataset.ag === 'link'; agendaError = ''; render(true);
  });
  const calendarLinked = () => { linking = false; agendaError = ''; window.__twocodeRefreshInfo?.(); loadAgenda(); };
  // Your calendar's secret link on the clipboard, while you are linking Google: linked by itself. (Only then: copying is not looked at otherwise.)
  function linkFromClipboard() {
    if (Date.now() >= googleUntil) return;
    const url = String(clips[0]?.text || '').trim();
    if (!/^https:\/\/calendar\.google\.com\/calendar\/ical\/[^\s/]+\/private-[^\s/]+\/basic\.ics$/.test(url)) return;
    googleUntil = 0;
    api.extrasConfig?.({ calendarUrl: url }).then(r => {
      if (r?.ok === false) { agendaError = window.__twocodeTr?.(r.error) || r.error || ''; render(true); return; }
      calendarLinked(); window.__twocodeNotice('calLinked', { title: tAg('Google Agenda gekoppeld', 'Google Calendar linked'), body: tAg('Je afspraken staan nu in Twenty-One.', 'Your events now show in Twenty-One.') });
    }).catch(() => {});
  }
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-google]')) return;
    document.activeElement?.blur?.();
    googleUntil = Date.now() + 10 * 60000; agendaError = ''; api.agendaGoogle?.(); render(true);
  });
  root.addEventListener('submit', e => {
    if (e.target.dataset.form === 'agenda-add') {
      e.preventDefault();
      const title = e.target.querySelector('#ag-title')?.value.trim() || ''; if (!title) { e.target.querySelector('#ag-title')?.focus(); return; }
      const day = startOf(agNew.start); document.activeElement?.blur?.();
      api.agendaAdd?.({ title, start: agNew.start, end: agNew.end }).then(() => { agNew = null; agDay = day; agShow = 'day'; agPick = null; loadAgenda(); }).catch(() => {});
      return;
    }
    if (e.target.dataset.form !== 'calendar') return;
    e.preventDefault();
    const value = e.target.querySelector('input')?.value.trim() || '';
    if (!value) { e.target.querySelector('input')?.focus(); return; } // (Save with nothing typed is not "unlink")
    api.extrasConfig?.({ calendarUrl: value }).then(r => {
      document.activeElement?.blur?.();
      if (r?.ok === false) { agendaError = window.__twocodeTr?.(r.error) || r.error || tAg('Dat lukte niet.', "That didn't work."); render(true); return; }
      calendarLinked();
    }).catch(() => {});
  });
  root.addEventListener('focusin', e => { if (e.target.tagName === 'INPUT') { projectInputFocused = true; sendInteractive(true); } });
  root.addEventListener('focusout', e => { if (e.target.tagName === 'INPUT') projectInputFocused = false; });

  function render(force) {
    const view = currentView, key = view + ':' + clips.length + ':' + copied + ':' + (note === null);
    if (!force && key === lastRender) return; lastRender = key;
    if (view === 'clips') {
      const T = (nl, en) => window.__twocodePrefs?.().lang === 'en' ? en : nl;
      const ago = at => { if (!at) return ''; const m = Math.floor((Date.now() - at) / 60000); return m < 1 ? T('nu', 'now') : m < 60 ? m + ' min' : Math.floor(m / 60) + T(' uur', ' h'); };
      const WORDS = { text: T('TEKST', 'TEXT'), code: 'CODE', colour: T('KLEUR', 'COLOUR'), link: 'LINK', mail: 'MAIL' };
      const kindOf = text => { const t = text.trim();
        if (/^#?[0-9a-f]{6}$/i.test(t) || /^rgba?\(/i.test(t)) return 'colour';
        if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(t)) return 'mail';
        if (/^(https?:\/\/|www\.)\S+$/i.test(t) || /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return 'link';
        if (/[{};]\s*$|=>|^\s*(git|npm|npx|cd|const|let|function|import|def|class|SELECT|<\w+)\b|^\$ /m.test(t)) return 'code';
        return 'text'; };
      const row = (c, i) => { const kind = kindOf(c.text), t = c.text.trim(), hex = t.replace(/^(?=[0-9a-f]{6}$)/i, '#'), fresh = i === copied;
        return `<button class="tl-row" data-i="${i}"><span class="tl-k">${WORDS[kind]}</span>${kind === 'colour' ? `<span class="tl-sw" style="background:${esc(hex)}"></span>` : ''}<span class="tl-b${kind === 'code' || kind === 'colour' ? ' mono' : ''}">${esc(t.replace(/\s+/g, ' '))}</span><span class="tl-w${fresh ? ' ok' : ''}">${fresh ? T('GEKOPIEERD', 'COPIED') : esc(ago(c.at)).toUpperCase()}</span></button>`; };
      root.innerHTML = clips.length
        ? `<div class="tl-list">${clips.map(row).join('')}<button class="tl-clear" data-clear="1">${T('Wis geschiedenis', 'Clear history')}</button></div>`
        : `<div class="tl-empty"><b>${T('Nog niks gekopieerd', 'Nothing copied yet')}</b><span>${T('Kopieer iets (Ctrl + C), dan staat het hier.', 'Copy something (Ctrl + C) and it shows up here.')}</span></div>`;
    } else if (view === 'agenda') {
      if (document.activeElement?.tagName === 'INPUT' && root.contains(document.activeElement)) return; // don't rebuild while typing
      root.innerHTML = agendaView();
      if (agNew) placeNew();
    } else if (view === 'mail') {
      if (document.activeElement?.tagName === 'INPUT' && root.contains(document.activeElement)) return; // don't rebuild while typing
      root.innerHTML = mailView();
    } else if (view === 'note') {
      if (root.querySelector('textarea')) return; // don't rebuild while typing
      root.innerHTML = noteView();
    }
  }
  // The note as a page of Apple Notes: the first line is the title, "[ ]" / "[x]" lines get round check circles,
  // "- " lines get a dot. Click the page to type; it is saved by itself.
  function noteView() {
    const lines = String(note || '').split('\n'), title = lines[0] || '', rest = lines.slice(1);
    const T = (nl, en) => window.__twocodePrefs?.().lang === 'en' ? en : nl;
    let done = 0, total = 0;
    const body = rest.map((line, i) => {
      const box = /^\s*[-*]?\s*\[( |x|X)\]\s?(.*)$/.exec(line), dot = /^\s*[-•*]\s+(.*)$/.exec(line);
      if (box) { total++; if (box[1] !== ' ') done++; return `<div class="tl-line${box[1] !== ' ' ? ' ok' : ''}"><button type="button" class="tl-check" data-tick="${i + 1}">${box[1] !== ' ' ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3.400" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.500 4.500 4.500L19 7"/></svg>' : ''}</button><span>${esc(box[2])}</span></div>`; }
      if (dot) return `<div class="tl-line"><i class="tl-dot"></i><span>${esc(dot[1])}</span></div>`;
      return line.trim() ? `<div class="tl-line"><span>${esc(line)}</span></div>` : '';
    }).join('');
    // how far you are, big on the left (only a list has that; otherwise the title stands there big)
    const left = total
      ? `<div class="tl-name">${esc(title || T('Notitie', 'Note'))}</div><div class="tl-count">${done}/${total}</div><div class="tl-bars">${Array.from({ length: Math.min(total, 12) }, (_, i) => `<i class="${i < Math.round(done / total * Math.min(total, 12)) ? 'on' : ''}"></i>`).join('')}</div>`
      : `<div class="tl-name">${T('Notitie', 'Note')}</div><div class="tl-big">${title ? esc(title) : `<span class="tl-hint">${T('Klik om te typen', 'Click to type')}</span>`}</div>`;
    const right = body || `<div class="tl-small">${T('Begin een regel met [ ] en je krijgt een afvinkrondje. Alles wordt vanzelf bewaard.', 'Start a line with [ ] and you get a check circle. Everything saves by itself.')}</div>`;
    return `<div class="tl-paper" data-edit="1"><div class="tl-side">${left}</div><i class="tl-rule"></i><div class="tl-lines">${right}</div></div>`;
  }
  function editNote() {
    root.innerHTML = `<div class="tl-paper editing"><textarea id="tl-note" placeholder="${esc(window.__twocodePrefs?.().lang === 'en' ? 'Title, then your lines…' : 'Titel, en dan je regels…')}" maxlength="20000">${esc(note || '')}</textarea></div>`;
    const area = root.querySelector('textarea');
    area.addEventListener('focus', () => { projectInputFocused = true; sendInteractive(true); });
    area.addEventListener('blur', () => { projectInputFocused = false; setTimeout(() => { if (currentView === 'note' && !root.contains(document.activeElement)) { root.innerHTML = noteView(); } }, 0); });
    area.addEventListener('input', () => { note = area.value; clearTimeout(saveTimer); saveTimer = setTimeout(() => api.noteSet(note).then(() => { savedAt = Date.now(); }), 400); });
    area.focus(); area.setSelectionRange(area.value.length, area.value.length);
  }
  root.addEventListener('click', e => {
    const tick = e.target.closest('[data-tick]');
    if (tick) { // tick a line off (or on again)
      const lines = String(note || '').split('\n'), i = Number(tick.dataset.tick);
      lines[i] = lines[i].replace(/\[( |x|X)\]/, m => m === '[ ]' ? '[x]' : '[ ]'); note = lines.join('\n');
      api.noteSet(note).then(() => { savedAt = Date.now(); }); root.innerHTML = noteView(); sound('click'); return;
    }
    if (e.target.closest('[data-edit]')) { editNote(); return; }
    const clip = e.target.closest('[data-i]');
    if (clip) { api.clipsCopy(Number(clip.dataset.i)).then(r => { if (r.ok) { clips = r.clips; copied = 0; render(true); sound('click'); setTimeout(() => { copied = -1; render(true); }, 1400); } }); return; }
    if (e.target.closest('[data-clear]')) api.clipsClear().then(r => { if (r.ok) { clips = []; render(true); } });
  });

  // ---- placing the panel ----
  let shown = '';
  (function position() {
    const view = currentView, show = ['clips', 'note', 'agenda', 'mail'].includes(view) && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150);
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) {
      window.__twocodePage.place(root, contentRect());
      // the agenda has Google's blue rising from below; clips and note a soft white light
      const mailOut = view === 'mail' && !google?.signedIn; // (signed out: Gmail's red rises from below; signed in the tiles have the colour)
      window.__twocodeTintIsland = view === 'agenda' ? '#039be5' : mailOut ? '#c0322a' : '#ffffff'; window.__twocodeTintAt = performance.now(); window.__twocodeTintStrength = view === 'agenda' || mailOut ? 1 : view === 'mail' ? 0 : 0.28; window.__twocodeTintTall = view === 'agenda' || mailOut ? 0.95 : 0.8;
      if (shown !== view) { shown = view; lastRender = ''; root.innerHTML = ''; if (view === 'clips') loadClips(); if (view === 'agenda') { linking = false; agendaError = ''; loadAgenda(); } if (view === 'mail') pollMail(); render(true); }
    } else shown = '';
    requestAnimationFrame(position);
  })();

  // ---- keyboard shortcuts (shortcuts-main.cjs): the page opens and stays open 5 s (your mouse is not on it) ----
  api.onShortcut?.(view => {
    if (view === 'tuck') { window.__twocodeTuck?.toggle(); return; } // tuck-ui.js: away, or back
    window.__twocodeTuck?.set(false);                                // any other shortcut brings Robo back
    window.__twocodeGameMode?.openAnyway();                          // also during a game (Game mode)
    if (view === 'talk') { window.__twocodeChatTalk?.(); return; }   // talk to Robo (chat-ui.js)
    if (window.__twocodeAppsOff?.().has(view)) return;               // an app you turned off (Settings → Apps) does not open
    window.__twocodeStayOpenUntil = performance.now() + 5000;
    if (view === 'claude') { window.__twocodeMonitor?.open('claudecode'); return; }
    setView(view);
  });
  canvas.addEventListener('click', e => {
    if (mode !== 'expanded') return;
    for (const [key, view] of [['clipsApp', 'clips'], ['noteApp', 'note'], ['agendaApp', 'agenda'], ['mailApp', 'mail']]) if (inside(e.clientX, e.clientY, hit[key])) { e.preventDefault(); e.stopImmediatePropagation(); setView(view); return; }
  }, true);
  window.__twocodeTools = { open: view => setView(view), reloadNote: () => api.noteGet().then(r => { note = r.ok ? r.text : ''; render(true); }) };
})();
