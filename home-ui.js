'use strict';
// Home (V3): four ways to see what is going on, all with the same facts: Clock, Dials, Colours and All apps.
// You pick one in ⋯ → Customize (the "shortcuts" view) by browsing big previews; what is in the middle is what you have.
(function homePage() {
  const api = window.twocode;
  const root = document.createElement('section'); root.id = 'twocode-home'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#twocode-home{position:absolute;z-index:60;display:none;color:#fff;font:14px/1.4 Inter,"Segoe UI",sans-serif;pointer-events:none;user-select:none}
#twocode-home *{box-sizing:border-box}
#twocode-home button{font:inherit;color:inherit;background:none;border:0;padding:0}
#twocode-home [data-go],#twocode-home button,#twocode-home .pk-card{pointer-events:auto;cursor:pointer}
#twocode-home .pg{position:absolute;left:50%;top:0;width:600px;height:268px;margin-left:-300px}
#twocode-home .lab,#twocode-home .num,#twocode-home .mono{font-family:"JetBrains Mono",Consolas,monospace}
#twocode-home .lab{font-size:10.5px;letter-spacing:.09em;color:#fff;white-space:nowrap}
#twocode-home .num{font-weight:500;letter-spacing:-.04em;line-height:1;white-space:nowrap}
#twocode-home .t1,#twocode-home .t2,#twocode-home .sub{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-home .t1{font-size:13px;font-weight:700;letter-spacing:-.01em}
#twocode-home .t2{font-size:11.5px;font-weight:500;color:rgba(255,255,255,.75);margin-top:2px}
#twocode-home .sub{font-size:12px;font-weight:500;color:#fff}
#twocode-home .wbtn{display:flex;align-items:center;justify-content:center;flex:none;border-radius:50%;background:#fff;color:#000;transition:transform .1s ease-out,background .15s}
#twocode-home .wbtn:hover{background:#e5e5ea}
#twocode-home .wbtn:active{transform:scale(.92)}
#twocode-home .cov{display:block;flex:none;background:linear-gradient(160deg,#d81f49,#4a0a1a);background-size:cover;background-position:center}
#twocode-home .sq{display:inline-block;flex:none;width:7px;height:7px}
#twocode-home .press{transition:transform .1s ease-out,filter .15s}
#twocode-home .press:hover{filter:brightness(1.14)}
#twocode-home .press:active{transform:scale(.98)}
/* Clock */
#twocode-home .ck-time{position:absolute;left:90px;right:90px;top:28px;display:flex;justify-content:center;white-space:nowrap;font-size:108px;line-height:112px;font-weight:700;letter-spacing:.005em;font-kerning:none;font-variant-numeric:tabular-nums;font-feature-settings:"tnum";pointer-events:auto;cursor:pointer} /* (a user: "the seven is very close to the 1") */
#twocode-home .ck-time.small{top:26px;font-size:72px;line-height:76px}
#twocode-home .ck-cards{position:absolute;left:12px;right:12px;top:152px;display:grid;gap:8px}
#twocode-home .ck-row{display:grid;gap:8px}
#twocode-home .lk{height:64px;border-radius:18px;background:rgba(0,0,0,.45);border:1px solid rgba(255,255,255,.1);display:flex;align-items:center;gap:10px;padding:0 10px 0 13px;min-width:0}
#twocode-home .lk > div{flex:1;min-width:0}
/* More apps under music and Claude: everything gets smaller (a user's idea) */
#twocode-home .ck-cards.two{top:106px;gap:6px}
#twocode-home .ck-cards.two .ck-row{gap:6px}
#twocode-home .ck-cards.two .lk{height:53px;border-radius:15px;gap:8px;padding:0 8px 0 11px}
#twocode-home .ck-cards.two .t1{font-size:12px}
#twocode-home .ck-cards.two .t2{font-size:10.5px;margin-top:1px}
#twocode-home .ck-cards.two .num{font-size:15px!important}
#twocode-home .ck-cards.two .t2[style]{margin-top:2px!important}
#twocode-home .ck-cards.two .cov{width:28px!important;height:28px!important;border-radius:7px!important}
#twocode-home .ck-cards.two .wbtn{width:24px!important;height:24px!important}
#twocode-home .ck-row.five .wbtn{display:none} /* (five in a row: the song's title needs the room; the card still opens its app) */
/* Your own time: the font, how thick and which colour (like the iPhone's Font & Color), and which apps go under it */
#twocode-home .ce{position:absolute;left:12px;right:12px;top:146px;height:80px;display:none;flex-direction:column;gap:8px;pointer-events:auto}
#twocode-home .ce.apps{top:106px;height:123px} /* (every app is a choice now: two rows of them, the time makes way) */
#twocode-home .ce-row{display:flex;align-items:center;gap:7px;height:36px;min-width:0}
#twocode-home .ce-fonts-scroll{display:flex;align-items:center;gap:6px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent;padding:2px 0;flex:1;min-width:0}
#twocode-home .ce-fonts-scroll::-webkit-scrollbar{height:3px}
#twocode-home .ce-fonts-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.25);border-radius:2px}
#twocode-home .ce-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}
#twocode-home .ce-f{flex:none;width:50px;height:34px;border-radius:10px;background:rgba(255,255,255,.1);font-size:18px;line-height:34px;text-align:center;font-variant-numeric:tabular-nums;transition:transform .1s ease-out,background .15s}
#twocode-home .ce-f:hover{background:rgba(255,255,255,.18)}
#twocode-home .ce-f:active{transform:scale(.95)}
#twocode-home .ce-f.on{background:#fff;color:#000}
#twocode-home .ce-w{position:relative;flex:none;width:120px;height:36px;margin:0 8px;cursor:pointer;touch-action:none}
#twocode-home .ce-w i{position:absolute;left:0;right:0;top:16px;height:4px;border-radius:2px;background:rgba(255,255,255,.26)}
#twocode-home .ce-w b{position:absolute;top:8px;width:20px;height:20px;margin-left:-10px;border-radius:50%;background:#fff;box-shadow:0 1px 5px rgba(0,0,0,.5)}
#twocode-home .ce-c{flex:none;width:24px;height:24px;border-radius:50%;transition:transform .1s ease-out}
#twocode-home .ce-c:hover{transform:scale(1.1)}
#twocode-home .ce-c.on{box-shadow:0 0 0 2px #000,0 0 0 4px #fff}
#twocode-home .ce-gap{flex:1;min-width:0}
#twocode-home .ce-hint{flex:1;min-width:0;font-size:11.5px;line-height:15px;color:rgba(255,255,255,.75)}
#twocode-home .ce-tab,#twocode-home .ce-done{flex:none;height:30px;padding:0 14px;border-radius:15px;font-size:12.5px;font-weight:600;background:rgba(255,255,255,.14);transition:transform .1s ease-out,background .15s}
#twocode-home .ce-tab:hover{background:rgba(255,255,255,.22)}
#twocode-home .ce-done{background:#fff;color:#000}
#twocode-home .ce-done:hover{background:#e5e5ea}
#twocode-home .ce-tab:active,#twocode-home .ce-done:active{transform:scale(.96)}
#twocode-home .ce-chip{flex:1;min-width:0;display:flex;align-items:center;justify-content:center;gap:6px;height:36px;border-radius:12px;background:rgba(255,255,255,.1);font-size:12px;font-weight:600;white-space:nowrap;transition:transform .1s ease-out,background .15s}
#twocode-home .ce-chip:hover{background:rgba(255,255,255,.18)}
#twocode-home .ce-chip:active{transform:scale(.97)}
#twocode-home .ce-chip.on{background:#fff;color:#000}
#twocode-home .pk-edit{height:24px;padding:0 11px;border-radius:12px;background:rgba(255,255,255,.14);font-size:11.5px;font-weight:600;transition:background .15s}
#twocode-home .pk-edit:hover{background:rgba(255,255,255,.24)}
/* Dials */
#twocode-home .dial{position:absolute;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;border-radius:50%}
#twocode-home .dial svg.gauge{position:absolute;left:0;top:0;pointer-events:none}
#twocode-home .dial > div{max-width:78%}
#twocode-home .dial .wbtn{position:absolute;left:50%;bottom:-5px;margin-left:-14px}
#twocode-home .dial.live{animation:hm-breathe 2.4s ease-in-out infinite}
@keyframes hm-breathe{50%{filter:brightness(1.28)}}
@media (prefers-reduced-motion:reduce){#twocode-home .dial.live{animation:none}}
/* Colours */
#twocode-home .sl-all{position:absolute;left:12px;right:12px;top:36px;height:186px;border-radius:24px;overflow:hidden;display:flex;gap:3px}
#twocode-home .sl{position:relative;width:118px;flex:none;padding:13px;display:flex;flex-direction:column;justify-content:space-between;min-width:0}
#twocode-home .sl.wide{flex:1;width:auto}
#twocode-home .sl-song{position:relative;flex:1;min-width:0;overflow:hidden;background-size:cover;background-position:center}
#twocode-home .sl-song::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 35%,rgba(0,0,0,.72))}
#twocode-home .sl-song > div{position:absolute;left:16px;right:14px;bottom:14px;display:flex;align-items:flex-end;gap:10px}
#twocode-home .sl-song > div > div{flex:1;min-width:0}
#twocode-home .sl-title{font-size:33px;line-height:36px;font-weight:800;letter-spacing:-.035em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
/* All apps */
#twocode-home .al-all{position:absolute;left:12px;right:12px;top:36px;bottom:14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(2,minmax(0,1fr));gap:8px}
#twocode-home .tile{position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.09);background-origin:border-box;background-repeat:no-repeat;border-radius:20px;padding:11px 12px;min-width:0;display:flex;flex-direction:column;justify-content:space-between}
#twocode-home .tile .lab{display:flex;align-items:center;gap:6px}
#twocode-home .ic{width:14px;height:14px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
/* Choosing: the frame around the page you are looking at */
#twocode-home .pk{height:268px;overflow:hidden;border-radius:0 0 34px 34px}
#twocode-home .pk-card{position:absolute;left:0;top:0;width:600px;height:268px;transform-origin:0 0;border-radius:32px;overflow:hidden;background:#101012;opacity:.5;transition:transform .42s cubic-bezier(.2,.9,.3,1),opacity .3s,box-shadow .2s}
#twocode-home .pk-card *{pointer-events:none!important}
#twocode-home .pk-card.at0{transform:translate(131px,40px) scale(.562);opacity:1;box-shadow:0 0 0 3.6px #fff,0 18px 46px rgba(0,0,0,.7);z-index:2}
#twocode-home .pk-card.at1{transform:translate(484px,76px) scale(.317)}
#twocode-home .pk-card.at3{transform:translate(-74px,76px) scale(.317)}
#twocode-home .pk-card.at2{transform:translate(205px,80px) scale(.2);opacity:0;pointer-events:none}
#twocode-home .pk-card:not(.at0):hover{opacity:.72}
#twocode-home .pk-name{position:absolute;left:0;right:0;top:197px;display:flex;align-items:center;justify-content:center;gap:9px;font-size:14px;font-weight:700}
#twocode-home .pk-name .lab{color:rgba(255,255,255,.72)}
#twocode-home .mh{position:absolute;left:18px;right:16px;top:10px;height:22px;display:flex;align-items:center;justify-content:space-between;font:11px "JetBrains Mono",Consolas,monospace;letter-spacing:.04em;color:rgba(255,255,255,.65)}
#twocode-home .mh b{color:#fff;font-size:12px;font-weight:500;margin-right:30px}
#twocode-home .mh i{position:absolute;top:5px;width:7px;height:12px;border-radius:3.5px;background:#fff;box-shadow:0 0 8px rgba(255,255,255,.55)}
#twocode-home .mt{position:absolute;left:0;right:0;bottom:10px;height:30px;display:flex;align-items:center;justify-content:center;gap:14px;color:rgba(255,255,255,.6)}
#twocode-home .mt svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#twocode-home .mt span{display:flex;align-items:center;gap:6px;height:28px;padding:0 12px 0 10px;border-radius:14px;background:rgba(255,255,255,.12);color:#fff;font:500 10.5px "JetBrains Mono",Consolas,monospace;letter-spacing:.08em}
@media (prefers-reduced-motion:reduce){#twocode-home .pk-card{transition:opacity .2s}}`;
  // Lux (beta 130, launch mode only, lux-ui.js): one calm page on the black material, no cards. Left what plays (big cover
  // with its own coloured light, the time, three white controls), right three quiet rows each with a small lit dot
  style.textContent += `
#twocode-home .lx{position:absolute;left:0;top:0;width:600px;height:268px;overflow:hidden;font-family:Inter,"Segoe UI",sans-serif;font-variant-numeric:tabular-nums}
#twocode-home .lx-mat{position:absolute;left:0;top:0;width:600px;height:268px;pointer-events:none;overflow:hidden;border-radius:0 0 34px 34px}
#twocode-home .lx-b{position:absolute;border-radius:50%;opacity:.2;animation:lx-drift1 14s ease-in-out infinite}
#twocode-home .lx-b.b2{opacity:.15;animation-name:lx-drift2;animation-duration:16s}
@keyframes lx-drift1{0%,100%{transform:translate(0,0)}50%{transform:translate(60px,-14px)}}
@keyframes lx-drift2{0%,100%{transform:translate(0,0)}50%{transform:translate(-40px,-22px)}}
#twocode-home .lx-l{position:absolute;left:26px;top:46px;width:262px}
#twocode-home .lx-song{display:flex;gap:15px;align-items:center}
#twocode-home .lx-cov{width:84px;height:84px;border-radius:16px;flex:none;background:#1c1c1e center/cover;display:flex;align-items:center;justify-content:center;color:#8e8e93}
#twocode-home .lx-cov .ic{width:26px;height:26px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
#twocode-home .lx-np{font-size:12px;color:rgba(255,255,255,.6)}
#twocode-home .lx-title{font-size:18px;font-weight:700;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-home .lx-artist{font-size:13px;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-home .lx-prog{display:flex;align-items:center;gap:9px;margin-top:14px;font-size:11px;color:rgba(255,255,255,.55)}
#twocode-home .lx-bar{flex:1;height:4px;border-radius:2px;background:rgba(255,255,255,.16);overflow:hidden}
#twocode-home .lx-bar i{display:block;height:4px;background:#fff}
#twocode-home .lx-ctl{display:flex;justify-content:center;gap:34px;align-items:center;margin-top:8px}
#twocode-home .lx-ctl button{display:flex;padding:6px;color:#fff;border-radius:10px;transition:transform .1s ease-out,background .15s}
#twocode-home .lx-ctl button:hover{background:rgba(255,255,255,.08)}
#twocode-home .lx-ctl button:active{transform:scale(.92)}
#twocode-home .lx-r{position:absolute;left:322px;right:26px;top:50px;height:158px;display:flex;flex-direction:column;justify-content:space-between}
#twocode-home .lx-row{display:flex;gap:12px;align-items:flex-start;min-width:0;border-radius:12px;padding:4px 6px;margin:-4px -6px;transition:background .15s}
#twocode-home .lx-row:hover{background:rgba(255,255,255,.05)}
#twocode-home .lx-row > div{min-width:0;flex:1}
#twocode-home .lx-dot{display:block;flex:none;width:7px;height:7px;border-radius:4px;margin-top:6px}
#twocode-home .lx-val{font-size:14.5px;font-weight:600;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#twocode-home .lx-lbl{font-size:12px;color:#8e8e93;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
@media (prefers-reduced-motion:reduce){#twocode-home .lx-b{animation:none}}
`;
  document.head.appendChild(style);

  const STYLES = ['clock', 'dials', 'colours', 'all'], NAMES = { clock: ['Klok', 'Clock'], dials: ['Wijzers', 'Dials'], colours: ['Kleuren', 'Colours'], all: ['Alle apps', 'All apps'] };
  let chosen = 'clock'; try { const v = localStorage.getItem('twocode:home-style'); if (STYLES.includes(v)) chosen = v; } catch {}
  const choose = s => { chosen = s; try { localStorage.setItem('twocode:home-style', s); } catch {} };
  window.__twocodeHomeStyle = () => chosen;
  window.__twocodeHomeChoose = s => { if (!STYLES.includes(s)) return; choose(s); if (currentView === 'home' && root.style.display === 'block') render(); };
  // All apps has no tab row (every app is on the page), Clock has no second clock in the header
  window.__twocodeHomeBare = () => currentView === 'home' && chosen === 'all';
  window.__twocodeHomeNoTime = () => currentView === 'home' && chosen === 'clock' && !window.__twocodeLux?.(); // (Lux takes Clock's place: the time is in the header)

  const P = () => window.__twocodePrefs?.() || {};
  const T = (nl, en) => P().lang === 'en' ? en : nl;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const off = id => Boolean(window.__twocodeAppsOff?.().has(id));
  const rgbOf = c => { const hex = /^#([0-9a-f]{6})$/i.exec(c || ''); if (hex) return [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)).join(','); return /rgb\(([^)]+)\)/.exec(c || '')?.[1] || '224,31,76'; };
  const ICONS = {
    home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>', ai: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    robo: '<rect x="3" y="5.5" width="18" height="13.5" rx="5.5"/><rect x="8" y="9.5" width="2.4" height="5.5" rx="1.2" fill="currentColor" stroke="none"/><rect x="13.6" y="9.5" width="2.4" height="5.5" rx="1.2" fill="currentColor" stroke="none"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>', tray: '<path d="M3 13h5l1.5 3h5l1.5-3h5M5.5 5h13L21 13v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-5z"/>',
    clip: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>', note: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
    cal: '<rect x="4" y="5" width="16" height="16" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    cam: '<rect x="3" y="6.5" width="12.5" height="11" rx="2.5"/><path d="m15.5 10.5 5.5-3v9l-5.5-3z"/>',
  };
  const ic = id => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONS[id]}</svg>`;
  const PAUSE = w => `<svg width="${w}" height="${w}" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="2" y="1" width="3" height="10" rx="1"/><rect x="7" y="1" width="3" height="10" rx="1"/></svg>`;
  const PLAY = w => `<svg width="${w}" height="${w}" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><path d="M3 1.5v9l7-4.5z"/></svg>`;
  const round = (act, playing, s, label) => `<button type="button" class="wbtn" data-act="${act}" aria-label="${esc(label)}" style="width:${s}px;height:${s}px">${playing ? PAUSE(s * .36) : PLAY(s * .36)}</button>`;
  // A gauge like the rev counter in a car: lit ticks over 270 degrees, open at the bottom.
  const gauge = (size, part, colour, n) => { const c = size / 2; let s = ''; for (let k = 0; k <= n; k++) { const a = (135 + 270 * k / n) * Math.PI / 180, major = k % 6 === 0, r1 = c - 2, r2 = c - (major ? 12 : 8); s += `<line x1="${(c + r1 * Math.cos(a)).toFixed(1)}" y1="${(c + r1 * Math.sin(a)).toFixed(1)}" x2="${(c + r2 * Math.cos(a)).toFixed(1)}" y2="${(c + r2 * Math.sin(a)).toFixed(1)}" stroke="${k / n <= part && part > 0 ? colour : 'rgba(255,255,255,.22)'}" stroke-width="${major ? 2.2 : 1.5}" stroke-linecap="round"/>`; } return `<svg class="gauge" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true">${s}</svg>`; };

  // ---------- the facts ----------
  let clip = null, noteText = '', events = [];
  const loadLists = () => {
    api?.noteGet?.().then(r => { if (r?.ok) noteText = r.text || ''; }).catch(() => {});
    api?.clipsGet?.().then(r => { if (r?.ok) clip = r.clips?.[0] || null; }).catch(() => {});
    api?.agendaGet?.().then(r => { if (r?.ok) events = r.events || []; }).catch(() => {});
  };
  function facts() {
    const ai = window.__twocodeHomeAi?.() || { name: 'Claude', head: '', short: '', line: '', part: 0, colour: '#ef7b37' };
    const track = spotifyState?.track, playing = Boolean(spotifyConnected && spotifyState?.is_playing && track), cover = track && albumImage?.complete && albumImage.naturalWidth ? albumImage.src : '';
    const dur = spotifyState?.duration_ms, sung = dur ? Math.min(1, ((spotifyState.progress_ms || 0) + (playing ? performance.now() - spotifySyncAt : 0)) / dur) : 0;
    const song = { has: Boolean(track), playing, cover, part: sung, colour: window.__twocodeAlbumColour || '#e01f4c',
      title: track?.name || (spotifyConnected ? T('Er speelt niks', 'Nothing playing') : T('Koppel je muziek', 'Connect your music')), artist: track ? (playing ? track.artist || '' : T('Gepauzeerd', 'Paused')) : '' };
    const f = window.__twocodeFocus, on = Boolean(f?.active()), paused = Boolean(on && f.paused?.()), sec = f?.chosen?.() || 1500;
    const mins = on ? Math.max(1, Math.ceil(f.left() / 60000)) : 0;
    const focus = { on, paused, time: on ? f.label() : `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`, part: on ? 1 - f.left() / (f.length() || 1) : 0,
      said: paused ? T('Gepauzeerd', 'Paused') : on ? T(`nog ${mins} min`, `${mins} min left`) : T('Klaar om te starten', 'Ready to start'), short: paused ? T('Gepauzeerd', 'Paused') : on ? T('Bezig', 'Running') : T('Klaar', 'Ready') };
    return { ai, song, focus };
  }
  const now12 = () => new Date().toLocaleTimeString(...window.__twocodeTimeArgs()).replace(/\s?[ap]\.?m\.?/i, '');
  const agePhrase = at => { const min = Math.max(0, Math.round((Date.now() - at) / 60000)); return min < 1 ? T('Net gekopieerd', 'Just copied') : min < 60 ? T(`${min} min geleden`, `Copied ${min} min ago`) : T(`${Math.round(min / 60)} uur geleden`, `Copied ${Math.round(min / 60)} h ago`); };

  // ---------- the big clock: your own look (a user, with a photo of the iPhone's Font & Color) ----------
  const FONTS = [
    { id: 'sf-heavy', css: "-apple-system, BlinkMacSystemFont, 'Segoe UI Variable Display', 'Segoe UI', Inter, sans-serif", name: ['iOS 27 Bold', 'iOS 27 Bold'] },
    { id: 'tall', css: "Bahnschrift, 'Segoe UI Variable Display', 'Arial Narrow', sans-serif", stretch: '65%', spacing: '-0.02em', name: ['iOS 27 Condensed', 'iOS 27 Condensed'] },
    { id: 'serif', css: "'Palatino Linotype', 'Book Antiqua', Constantia, Georgia, Cambria, serif", name: ['iOS 27 Editorial', 'iOS 27 Editorial'] },
    { id: 'sf-rounded', css: "'Arial Rounded MT Bold', 'Comfortaa', 'Segoe UI', sans-serif", name: ['iOS 27 Rounded', 'iOS 27 Rounded'] },
    { id: 'sf-slab', css: "'Rockwell', 'Calisto MT', Georgia, serif", name: ['iOS 27 Slab', 'iOS 27 Slab'] },
    { id: 'sf-deco', css: "'Century Gothic', 'Tw Cen MT', 'Trebuchet MS', sans-serif", spacing: '-0.03em', name: ['iOS 27 Deco', 'iOS 27 Deco'] },
    { id: 'ios27-cyber', css: "'Cascadia Code', 'JetBrains Mono', Consolas, monospace", spacing: '0.06em', shadow: '0 0 16px rgba(127,220,255,0.7)', name: ['iOS 27 Cyber HUD', 'iOS 27 Cyber HUD'] },
    { id: 'ios27-neon', css: "'Segoe UI Variable Display', 'Segoe UI', sans-serif", shadow: '0 0 22px currentColor, 0 0 6px #ffffff', spacing: '0.04em', name: ['iOS 27 Neon Glow', 'iOS 27 Neon Glow'] },
    { id: 'ios27-digital', css: "'Lucida Console', 'Courier New', monospace", spacing: '0.05em', shadow: '0 0 10px rgba(126,232,162,0.6)', name: ['iOS 27 Matrix', 'iOS 27 Matrix'] },
    { id: 'sf-brutalist', css: "'Impact', 'Franklin Gothic Heavy', 'Arial Black', sans-serif", spacing: '0.02em', name: ['iOS 27 Brutalist', 'iOS 27 Brutalist'] },
    { id: 'hand', css: "'Segoe Print', 'Brush Script MT', 'Segoe UI', cursive", name: ['iOS 27 Script', 'iOS 27 Script'] },
    { id: 'mono', css: "'JetBrains Mono', Consolas, monospace", spacing: '-.04em', name: ['iOS 27 Mono', 'iOS 27 Mono'] },
  ];
  const COLOURS = ['#ffffff', '#ffc7dc', '#ff6b8a', '#ff5a36', '#ffb35c', '#ffe066', '#7ee8a2', '#00f0ff', '#7fdcff', '#9db8ff', '#c9a8ff', '#a355ff'];
  // the apps under the time: Claude, music and focus are there until you take them off (look.hidden), the rest you add
  // (look.extra). A user (Amir, 13 Nov) could not take the first three off, and missed the mirror.
  const BASE = [{ id: 'claude', icon: 'ai', name: ['Claude', 'Claude'] }, { id: 'spotify', icon: 'music', name: ['Muziek', 'Music'] }, { id: 'focus', icon: 'timer', name: ['Focus', 'Focus'] }];
  const EXTRA = [{ id: 'chat', icon: 'robo', name: ['Robo', 'Robo'] }, { id: 'tray', icon: 'tray', name: ['Lade', 'Tray'] }, { id: 'clips', icon: 'clip', name: ['Klembord', 'Clips'] }, { id: 'note', icon: 'note', name: ['Notitie', 'Note'] }, { id: 'agenda', icon: 'cal', name: ['Agenda', 'Agenda'] }, { id: 'mirror', icon: 'cam', name: ['Spiegel', 'Mirror'] }];
  let look = { font: 'inter', weight: 700, colour: '#ffffff', extra: [], hidden: [] };
  try { look = { ...look, ...JSON.parse(localStorage.getItem('twocode:clock-look') || '{}') }; } catch {}
  if (!Array.isArray(look.extra)) look.extra = [];
  if (!Array.isArray(look.hidden)) look.hidden = [];
  const shows = id => !off(id) && (BASE.some(x => x.id === id) ? !look.hidden.includes(id) : look.extra.includes(id));
  const appName = x => x.id === 'claude' && window.__twocodeAiNow === 'codex' ? 'Codex' : T(...x.name);
  const saveLook = () => { try { localStorage.setItem('twocode:clock-look', JSON.stringify(look)); } catch {} };
  const timeStyle = d => { const f = FONTS.find(x => x.id === look.font) || FONTS[0], colour = look.colour === 'song' ? (d.song.playing ? d.song.colour : '#ffffff') : look.colour; return `font-family:${f.css};font-weight:${look.weight};color:${colour}${f.stretch ? `;font-stretch:${f.stretch}` : ''}${f.spacing ? `;letter-spacing:${f.spacing}` : ''}${f.shadow ? `;text-shadow:${f.shadow}` : ''}`; };

  // ---------- the pages ----------
  const fitNum = (text, size, small) => String(text).length > 5 ? small : size;
  // what Tray, Clips, Note and Agenda have to say (All apps, and the extra cards on Clock)
  function sideFacts() {
    const trayN = window.__twocodeTrayCount?.() || 0;
    const lines = noteText.split('\n'), checks = lines.filter(l => /^\s*\[[ xX]\]/.test(l)), done = checks.filter(l => /^\s*\[[xX]\]/.test(l)).length, noteTitle = lines[0] && !/^\s*\[[ xX]\]/.test(lines[0]) ? lines[0] : T('Notitie', 'Note');
    const startOfDay = t => new Date(t).setHours(0, 0, 0, 0), nowMs = Date.now(), next = events.find(e => (e.end || e.start) > nowMs);
    const when = !next ? '' : next.allDay ? T('Hele dag', 'All day') : startOfDay(next.start) === startOfDay(nowMs) ? new Date(next.start).toLocaleTimeString(...window.__twocodeTimeArgs()).replace(/\s?[ap]\.?m\.?/i, '') : new Date(next.start).toLocaleDateString(T('nl-NL', 'en-GB'), { weekday: 'short' }).replace('.', '');
    return { trayN, checks, done, noteTitle, next, when, clipLine: clip?.text?.split('\n')[0] || '' };
  }
  function extraCard(id) {
    const s = sideFacts(), card = (big, small) => `<div class="lk press" data-go="${id}" role="button">${ic(EXTRA.find(x => x.id === id).icon)}<div><div class="t1">${esc(big)}</div><div class="t2">${esc(small)}</div></div></div>`;
    if (id === 'chat') return card(T('Vraag Robo', 'Ask Robo'), T('Sleep me waarheen je wilt', 'Drag me anywhere'));
    if (id === 'tray') return s.trayN ? card(T(s.trayN === 1 ? '1 bestand' : `${s.trayN} bestanden`, s.trayN === 1 ? '1 file' : `${s.trayN} files`), T('Klaar om te delen', 'Ready to share')) : card(T('Lade leeg', 'Tray empty'), T('Sleep er iets in', 'Drop something in'));
    if (id === 'clips') return clip ? card(s.clipLine, agePhrase(clip.at)) : card(T('Klembord leeg', 'No clips yet'), T('Kopieer iets', 'Copy something'));
    if (id === 'note') return s.checks.length ? card(s.noteTitle, `${s.done}/${s.checks.length}`) : card(s.noteTitle, T('Klik om te typen', 'Click to type'));
    if (id === 'mirror') return card(T('Spiegel', 'Mirror'), T('Even kijken', 'A quick look'));
    return s.next ? card(s.next.title || T('Afspraak', 'Event'), s.when) : card(T('Niks gepland', 'Nothing planned'), T('Agenda', 'Agenda'));
  }
  function clockPage(d, editing) {
    const cards = [];
    if (shows('claude')) cards.push(`<div class="lk press" data-go="monitor" role="button"><span class="sq" style="background:${d.ai.working || d.ai.asking ? '#ff8a4d' : 'rgba(255,255,255,.4)'}"></span><div><div class="num" style="font-size:18px">${esc(d.ai.head)}</div><div class="t2" style="margin-top:4px">${esc(d.ai.line)}</div></div></div>`);
    if (shows('spotify')) cards.push(`<div class="lk press" data-go="spotify" role="button"><span class="cov" style="width:36px;height:36px;border-radius:9px;${d.song.cover ? `background-image:url('${esc(d.song.cover)}')` : ''}"></span><div><div class="t1">${esc(d.song.title)}</div><div class="t2">${esc(d.song.artist)}</div></div>${d.song.has ? round('music', d.song.playing, 28, T('Pauze', 'Pause')) : ''}</div>`);
    if (shows('focus')) cards.push(`<div class="lk press" data-go="focus" role="button"><div><div class="num" style="font-size:18px">${esc(d.focus.time)}</div><div class="t2" style="margin-top:4px">${esc(T('Focus', 'Focus') + ', ' + d.focus.short.toLowerCase())}</div></div>${round('focus', d.focus.on && !d.focus.paused, 28, 'Focus')}</div>`);
    for (const x of EXTRA) if (shows(x.id)) cards.push(extraCard(x.id));
    const two = cards.length > 3, half = Math.ceil(cards.length / 2), rows = two ? [cards.slice(0, half), cards.slice(half)] : [cards];
    const time = `<div class="ck-time${editing ? (editTab === 'apps' ? ' small' : '') : two ? ' small' : ''}" data-edit="1" role="button" title="${esc(T('Lettertype en kleur', 'Font and colour'))}" style="${timeStyle(d)}">${esc(now12())}</div>`;
    if (editing || !cards.length) return time; // (the card row makes way for the choices, see drawEdit)
    return `${time}<div class="ck-cards${two ? ' two' : ''}">${rows.map(r => `<div class="ck-row${r.length > 4 ? ' five' : ''}" style="grid-template-columns:repeat(${Math.max(1, r.length)},minmax(0,1fr))">${r.join('')}</div>`).join('')}</div>`;
  }
  function dialsPage(d) {
    const glow = (c, a) => `background:radial-gradient(closest-side,rgba(${rgbOf(c)},${a}),transparent)`, out = [];
    if (!off('spotify')) out.push(`<div class="dial press${d.song.playing ? ' live' : ''}" data-go="spotify" role="button" style="left:24px;top:54px;width:150px;height:150px;${glow(d.song.colour, .62)}">${gauge(150, d.song.part, '#ffffff', 40)}<span class="cov" style="width:36px;height:36px;border-radius:9px;${d.song.cover ? `background-image:url('${esc(d.song.cover)}')` : ''}"></span><div class="t1" style="margin-top:7px;font-size:12.5px">${esc(d.song.title)}</div><div class="t2" style="font-size:11px">${esc(d.song.artist)}</div>${d.song.has ? round('music', d.song.playing, 28, T('Pauze', 'Pause')) : ''}</div>`);
    if (!off('claude')) out.push(`<div class="dial press${d.ai.working ? ' live' : ''}" data-go="monitor" role="button" style="left:207px;top:32px;width:186px;height:186px;${glow(d.ai.colour, .68)}">${gauge(186, d.ai.part, d.ai.codex ? '#a8c8ff' : '#ffb07a', 54)}<div class="lab">${esc(d.ai.name.toUpperCase())}</div><div class="num" style="font-size:${fitNum(d.ai.head, 46, 26)}px;margin:9px 0 8px">${esc(d.ai.head)}</div><div class="t2" style="margin:0">${esc(d.ai.line)}</div></div>`);
    if (!off('focus')) out.push(`<div class="dial press${d.focus.on && !d.focus.paused ? ' live' : ''}" data-go="focus" role="button" style="right:24px;top:54px;width:150px;height:150px;${glow('#7a4be0', .68)}">${gauge(150, d.focus.part, '#c9a8ff', 40)}<div class="lab">FOCUS</div><div class="num" style="font-size:${fitNum(d.focus.time, 34, 25)}px;margin:8px 0 7px">${esc(d.focus.time)}</div><div class="t2" style="margin:0;font-size:11px">${esc(d.focus.said)}</div>${round('focus', d.focus.on && !d.focus.paused, 28, 'Focus')}</div>`);
    return out.join('');
  }
  function coloursPage(d) {
    const song = !off('spotify'), bgAi = d.ai.codex ? '#0a1830 0,#2a6bd0 100%' : '#25120a 0,#c8602a 100%', out = [];
    if (!off('claude')) out.push(`<div class="sl press${song ? '' : ' wide'}" data-go="monitor" role="button" style="background:linear-gradient(180deg,${bgAi})"><div class="lab">${esc(d.ai.name.toUpperCase())}</div><div><div class="num" style="font-size:${fitNum(d.ai.head, 27, 18)}px">${esc(d.ai.head)}</div><div class="sub" style="margin-top:6px">${esc(d.ai.short)}</div></div></div>`);
    if (song) out.push(`<div class="sl-song press" data-go="spotify" role="button" style="${d.song.cover ? `background-image:url('${esc(d.song.cover)}')` : `background:linear-gradient(160deg,rgb(${rgbOf(d.song.colour)}),#3a0814)`}"><div><div><div class="sl-title">${esc(d.song.title)}</div><div class="sub" style="margin-top:2px;font-size:13.5px;color:rgba(255,255,255,.88)">${esc(d.song.artist)}</div></div>${d.song.has ? round('music', d.song.playing, 40, T('Pauze', 'Pause')) : ''}</div></div>`);
    if (!off('focus')) out.push(`<div class="sl press${song ? '' : ' wide'}" data-go="focus" role="button" style="background:linear-gradient(180deg,#161034 0,#5b3bb0 100%)"><div class="lab">FOCUS</div><div><div class="num" style="font-size:${fitNum(d.focus.time, 27, 20)}px">${esc(d.focus.time)}</div><div style="display:flex;align-items:center;justify-content:space-between;margin-top:3px"><span class="sub">${esc(d.focus.short)}</span>${round('focus', d.focus.on && !d.focus.paused, 26, 'Focus')}</div></div></div>`);
    return `<div class="sl-all">${out.join('')}</div>`;
  }
  function allPage(d) {
    const up = c => `background:radial-gradient(130% 92% at 50% 118%,rgb(${rgbOf(c)}) 0,rgba(${rgbOf(c)},.34) 44%,transparent 74%),#0a0a0b`, plain = 'background:#0d0d0f';
    const tile = (id, go, look, icon, label, head) => off(id) ? '' : `<div class="tile press" data-go="${go}" role="button" style="${look}"><div class="lab">${ic(icon)}${esc(label)}</div>${head}</div>`;
    const num = (big, small) => `<div><div class="num" style="font-size:${fitNum(big, 27, 18)}px">${esc(big)}</div><div class="t2" style="margin-top:4px">${esc(small)}</div></div>`;
    const words = (big, small) => `<div><div class="t1" style="font-size:14px">${esc(big)}</div><div class="t2">${esc(small)}</div></div>`;
    const { trayN, checks, done, noteTitle, next, when, clipLine } = sideFacts();
    const list = [
      tile('claude', 'monitor', up(d.ai.colour), 'ai', d.ai.name.toUpperCase(), num(d.ai.head, d.ai.short)),
      tile('spotify', 'spotify', up(d.song.colour), 'music', T('MUZIEK', 'MUSIC'), `${d.song.cover ? `<span class="cov" style="position:absolute;right:10px;top:9px;width:30px;height:30px;border-radius:7px;background-image:url('${esc(d.song.cover)}')"></span>` : ''}${words(d.song.title, d.song.artist)}`),
      tile('focus', 'focus', up('#7a4be0'), 'timer', 'FOCUS', num(d.focus.time, d.focus.short)),
      tile('chat', 'chat', plain, 'robo', 'ROBO', words(T('Vraag Robo', 'Ask Robo'), T('Sleep me waarheen je wilt', 'Drag me anywhere'))),
      tile('tray', 'tray', plain, 'tray', T('LADE', 'TRAY'), trayN ? num(String(trayN), T(trayN === 1 ? 'bestand klaar' : 'bestanden klaar', trayN === 1 ? 'file ready' : 'files ready')) : words(T('Leeg', 'Empty'), T('Sleep er iets in', 'Drop something in'))),
      tile('clips', 'clips', plain, 'clip', T('KLEMBORD', 'CLIPS'), clip ? `<div><div class="mono t1" style="font-size:12.5px;font-weight:400">${esc(clipLine)}</div><div class="t2" style="margin-top:4px">${esc(agePhrase(clip.at))}</div></div>` : words(T('Nog niks', 'Nothing yet'), T('Kopieer iets', 'Copy something'))),
      tile('note', 'note', plain, 'note', T('NOTITIE', 'NOTE'), checks.length ? num(`${done}/${checks.length}`, noteTitle) : words(noteTitle, T('Klik om te typen', 'Click to type'))),
      tile('agenda', 'agenda', plain, 'cal', 'AGENDA', next ? num(when, next.title || T('Afspraak', 'Event')) : words(T('Niks gepland', 'Nothing planned'), '')),
    ];
    return `<div class="al-all">${list.join('')}</div>`;
  }
  // ---------- Lux Home (launch mode only) ----------
  const mmss = ms => { const t = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
  const NEXT = w => `<svg width="${w}" height="${w * 0.875}" viewBox="0 0 16 14" fill="#fff" aria-hidden="true"><path d="M9 1l6 6-6 6V1ZM1 1l6 6-6 6V1Z"/></svg>`;
  const PREV = w => `<svg width="${w}" height="${w * 0.875}" viewBox="0 0 16 14" fill="#fff" aria-hidden="true"><path d="M7 1 1 7l6 6V1Zm8 0-6 6 6 6V1Z"/></svg>`;
  function luxPage(d) {
    const col = rgbOf(d.song.colour), dur = spotifyState?.duration_ms || 0, at = dur ? d.song.part * dur : 0, s = sideFacts();
    const lit = (c, on) => `background:${c};${on ? `box-shadow:0 0 10px ${c}` : ''}`;
    const ai = d.ai, aiDone = Boolean(window.__twocodeIslandState?.()?.done), aiColour = ai.asking ? '#ffb547' : ai.working ? '#e8865f' : aiDone ? '#5aaeff' : 'rgba(255,255,255,.32)';
    const cover = d.song.cover ? `background-image:url('${esc(d.song.cover)}');box-shadow:0 14px 34px rgba(${col},.42),0 0 0 .5px rgba(255,255,255,.14)` : '';
    const label = d.song.playing ? T('Speelt nu', 'Now playing') : d.song.has ? T('Gepauzeerd', 'Paused') : T('Muziek', 'Music');
    const left = `<div class="lx-l"><div class="lx-song"><div class="lx-cov" style="${cover}">${d.song.cover ? '' : ic('music')}</div><div style="min-width:0;flex:1"><div class="lx-np">${esc(label)}</div><div class="lx-title">${esc(d.song.title)}</div><div class="lx-artist">${esc(d.song.has ? (spotifyState?.track?.artist || '') : '')}</div></div></div>`
      + (d.song.has && dur ? '<div class="lx-prog"><span class="lx-at"></span><div class="lx-bar"><i class="lx-fill"></i></div><span class="lx-rem"></span></div>' : '')
      + (d.song.has ? `<div class="lx-ctl"><button type="button" data-act="prev" aria-label="${esc(T('Vorige', 'Previous'))}">${PREV(20)}</button><button type="button" data-act="music" aria-label="${esc(d.song.playing ? T('Pauze', 'Pause') : T('Speel', 'Play'))}">${d.song.playing ? PAUSE(20) : PLAY(20)}</button><button type="button" data-act="next" aria-label="${esc(T('Volgende', 'Next'))}">${NEXT(20)}</button></div>` : '') + '</div>';
    const row = (go, dot, val, lbl) => `<div class="lx-row press" data-go="${go}" role="button"><span class="lx-dot" style="${dot}" aria-hidden="true"></span><div><div class="lx-val">${esc(val)}</div><div class="lx-lbl">${esc(lbl)}</div></div></div>`;
    const rows = [];
    if (!off('claude')) rows.push(row('monitor', lit(aiColour, ai.working || ai.asking || aiDone), ai.line || ai.short || ai.name, [ai.name, ai.head].filter(Boolean).join(' · ')));
    if (!off('agenda')) rows.push(row('agenda', lit('#5aaeff', Boolean(s.next)), s.next ? s.next.title || T('Afspraak', 'Event') : T('Niks gepland', 'Nothing planned'), s.next ? `${s.when} · ${T('Agenda', 'Calendar')}` : T('Agenda', 'Calendar')));
    if (!off('focus')) rows.push(row('focus', lit('#b18cff', d.focus.on), d.focus.on ? T('nog  ', '  left') : ' ', `Focus · ${d.focus.said}`).replace('class="lx-val">', 'class="lx-val lx-ft">'));
    return `<div class="lx">${left}<div class="lx-r">${rows.join('')}</div></div>`;
  }
  const lux = () => window.__twocodeLux?.() === true;
  let luxMat = null;
  function luxLive(d) {
    if (!lux()) { if (luxMat) luxMat.style.display = 'none'; return; }
    if (!luxMat) { luxMat = document.createElement('div'); luxMat.className = 'lx-mat'; luxMat.setAttribute('aria-hidden', 'true'); luxMat.innerHTML = '<span class="lx-b"></span><span class="lx-b b2"></span>'; root.prepend(luxMat); }
    const col = rgbOf(d.song.colour), show = lux() && currentView === 'home' && chosen === 'clock' && d.song.playing;
    luxMat.style.display = show ? 'block' : 'none';
    if (show && luxMat.dataset.col !== col) {
      luxMat.dataset.col = col; const [a, b] = luxMat.children;
      a.style.cssText = `left:-60px;top:40px;width:300px;height:220px;background:radial-gradient(closest-side,rgb(${col}),transparent)`;
      b.style.cssText = 'left:80px;top:90px;width:240px;height:200px;background:radial-gradient(closest-side,#8a4dff,transparent)';
    }
    if (!lux() || currentView !== 'home') return;
    const dur = spotifyState?.duration_ms || 0, at = dur ? d.song.part * dur : 0, put = (sel, v) => { const el = host.querySelector(sel); if (el && el.textContent !== v) el.textContent = v; };
    put('.lx-at', mmss(at)); put('.lx-rem', '-' + mmss(dur - at));
    const fill = host.querySelector('.lx-fill'); if (fill) fill.style.width = (d.song.part * 100).toFixed(2) + '%';
    if (d.focus.on) put('.lx-ft', T(`nog ${d.focus.time}`, `${d.focus.time} left`)); else put('.lx-ft', d.focus.time);
  }
  const PAGE = { clock: clockPage, dials: dialsPage, colours: coloursPage, all: allPage, lux: luxPage };

  // the frame around a preview: the same header and tab row as the real island
  function miniFrame(s) {
    const d = new Date(), loc = T('nl-NL', 'en-GB'), part = o => d.toLocaleDateString(loc, o).replace('.', '').toUpperCase().slice(0, 3);
    const temp = /-?\d+°/.exec(window.__twocodeHomeWeather?.() || '')?.[0], day = `${part({ weekday: 'short' })} ${String(d.getDate()).padStart(2, '0')} ${part({ month: 'short' })}`;
    const svgs = ['ai', 'music', 'robo', 'timer', 'tray', 'clip', 'note'].map(id => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[id]}</svg>`).join('');
    return `<div class="mh"><span>${esc(temp ? `${day} / ${temp}` : day)}</span><i style="left:calc(50% - 10px)"></i><i style="left:calc(50% + 3px)"></i>${s === 'clock' ? '' : `<b>${esc(now12())}</b>`}</div>${s === 'all' ? '' : `<div class="mt"><span><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS.home}</svg>HOME</span>${svgs}</div>`}`;
  }

  // for the welcome tour: the four pages with an example of a busy day in them, and how they look
  window.__twocodeHomePreview = lang => {
    const p = P(), was = p.lang, nl = lang === 'nl', w = (a, b) => nl ? a : b;
    const d = { ai: { name: 'Claude', head: '1:12', line: w('Aanpassen checkout.ts', 'Editing checkout.ts'), short: w('Aanpassen', 'Editing'), part: 0.42, colour: '#ef7b37', working: true },
      song: { has: true, playing: true, cover: '', part: 0.24, colour: '#e01f4c', title: 'Golden Hour', artist: 'Nova Lane' },
      focus: { on: false, paused: false, time: '25:00', part: 0, said: w('Klaar om te starten', 'Ready to start'), short: w('Klaar', 'Ready') } };
    p.lang = lang; // (the language you just chose in the tour; nothing is saved here)
    try { return { css: style.textContent, order: STYLES, now: chosen, names: Object.fromEntries(STYLES.map(s => [s, NAMES[s][nl ? 0 : 1]])), pages: Object.fromEntries(STYLES.map(s => [s, PAGE[s](d) + miniFrame(s)])) }; } finally { p.lang = was; }
  };

  // ---------- what you can press ----------
  function act(what) {
    if (what === 'music') {
      const next = spotifyState.is_playing ? 'pause' : 'play';
      spotifyState.is_playing = next === 'play'; spotifySyncAt = performance.now();
      api?.spotifyControl?.(next).catch(() => {}); setTimeout(() => refreshSpotify(), 400); sound('click');
    } else if (what === 'prev' || what === 'next') {
      api?.spotifyControl?.(what === 'next' ? 'next' : 'previous').catch(() => {}); setTimeout(() => refreshSpotify(), 400); sound('click');
    } else if (what === 'focus') {
      const f = window.__twocodeFocus; if (!f) return;
      if (!f.active()) f.start(); else if (f.paused()) f.resume(); else f.pause();
      sound('click');
    }
    lastHtml = ''; render();
  }
  function browse(step) { choose(STYLES[(STYLES.indexOf(chosen) + step + STYLES.length) % STYLES.length]); sound('click'); render(); }
  // ---------- choosing your own time (click the time, or ⋯ → Customize) ----------
  let editing = false, editTab = 'time', draggingWeight = false;
  const host = document.createElement('div'), editEl = document.createElement('div'); editEl.className = 'ce'; root.append(host, editEl);
  function drawEdit() {
    const open = editing && chosen === 'clock' && currentView === 'home', knob = (look.weight - 100) / 8;
    const bottom = other => `<button type="button" class="ce-tab" data-ct="${other === 'apps' ? 'apps' : 'time'}">${esc(other === 'apps' ? T('Apps', 'Apps') : T('Tijd', 'Time'))}</button><button type="button" class="ce-done" data-cd="1">${esc(T('Klaar', 'Done'))}</button>`;
    const html = !open ? '' : editTab === 'apps'
      ? `<div class="ce-grid">${[...BASE, ...EXTRA].filter(x => !off(x.id)).map(x => `<button type="button" class="ce-chip${shows(x.id) ? ' on' : ''}" data-ce="${x.id}" aria-pressed="${shows(x.id)}">${ic(x.icon)}${esc(appName(x))}</button>`).join('')}</div><div class="ce-row"><span class="ce-hint">${esc(T('Kies wat er onder de tijd staat. Hoe meer apps, hoe kleiner alles wordt.', 'Choose what goes under the time. The more apps, the smaller everything gets.'))}</span>${bottom('time')}</div>`
      : `<div class="ce-row"><div class="ce-fonts-scroll">${FONTS.map(f => `<button type="button" class="ce-f${look.font === f.id ? ' on' : ''}" data-cf="${f.id}" aria-label="${esc(T(...f.name))}" title="${esc(T(...f.name))}" style="font-family:${f.css};font-weight:${look.weight}${f.stretch ? `;font-stretch:${f.stretch}` : ''}${f.shadow ? `;text-shadow:${f.shadow}` : ''}">12</button>`).join('')}</div><div class="ce-w" role="slider" aria-label="${esc(T('Dikte', 'Thickness'))}" aria-valuemin="100" aria-valuemax="900" aria-valuenow="${look.weight}"><i></i><b style="left:${knob}%"></b></div></div>`
        + `<div class="ce-row">${COLOURS.map(c => `<button type="button" class="ce-c${look.colour === c ? ' on' : ''}" data-cc="${c}" aria-label="${c}" style="background:${c}"></button>`).join('')}<button type="button" class="ce-c${look.colour === 'song' ? ' on' : ''}" data-cc="song" aria-label="${esc(T('Kleur van je muziek', 'The colour of your music'))}" title="${esc(T('Kleur van je muziek', 'The colour of your music'))}" style="background:conic-gradient(#ef7b37,#e01f4c,#7a4be0,#0a84ff,#ef7b37)"></button><span class="ce-gap"></span>${bottom('apps')}</div>`;
    if (editEl.dataset.html !== html) { editEl.innerHTML = html; editEl.dataset.html = html; }
    editEl.style.display = open ? 'flex' : 'none';
    editEl.classList.toggle('apps', editTab === 'apps');
  }
  function setEditing(on) { editing = on; if (!on) editTab = 'time'; lastHtml = ''; render(); }
  const redraw = () => { saveLook(); lastHtml = ''; render(); };
  const setWeight = clientX => { const b = editEl.querySelector('.ce-w'); if (!b) return; const r = b.getBoundingClientRect(), v = 100 + Math.round(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * 8) * 100; if (v !== look.weight) { look.weight = v; redraw(); } };
  editEl.addEventListener('pointerdown', e => { if (!e.target.closest('.ce-w')) return; draggingWeight = true; editEl.setPointerCapture?.(e.pointerId); setWeight(e.clientX); });
  editEl.addEventListener('pointermove', e => { if (draggingWeight) setWeight(e.clientX); });
  const endWeight = () => { if (draggingWeight) { draggingWeight = false; sound('click'); } };
  editEl.addEventListener('pointerup', endWeight); editEl.addEventListener('pointercancel', endWeight);
  editEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    sound('click');
    if (b.dataset.cf) { look.font = b.dataset.cf; redraw(); }
    else if (b.dataset.cc) { look.colour = b.dataset.cc; redraw(); }
    else if (b.dataset.ce) { const id = b.dataset.ce, list = BASE.some(x => x.id === id) ? 'hidden' : 'extra'; look[list] = look[list].includes(id) ? look[list].filter(x => x !== id) : [...look[list], id]; redraw(); }
    else if (b.dataset.ct) { editTab = b.dataset.ct; lastHtml = ''; render(); } // (the time gets smaller on Apps)
    else if (b.dataset.cd) setEditing(false);
  });
  root.addEventListener('click', e => {
    if (e.target.closest('[data-edit]')) { sound('click'); if (currentView !== 'home') { editing = true; setView('home'); lastHtml = ''; } else setEditing(!editing); return; }
    const card = e.target.closest('.pk-card');
    if (card) {
      if (card.classList.contains('at1')) browse(1); else if (card.classList.contains('at3')) browse(-1);
      else if (card.classList.contains('at0')) { setView('home'); sound('click'); }
      return;
    }
    const a = e.target.closest('[data-act]'); if (a) { act(a.dataset.act); return; }
    const go = e.target.closest('[data-go]'); if (go) { sound('click'); window.__twocodeGo?.(go.dataset.go); }
  });
  root.addEventListener('wheel', e => {
    if (currentView !== 'shortcuts') return;
    e.preventDefault(); const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY; if (!d) return; // (sideways on a touchpad too)
    const now = performance.now(); if (now - wheelAt < 260) return; wheelAt = now; browse(d > 0 ? 1 : -1);
  }, { passive: false });
  let wheelAt = 0;

  // ---------- on screen ----------
  let lastHtml = '', pickerBuilt = false, shownView = null;
  function render() {
    const d = facts();
    drawEdit();
    if (currentView === 'shortcuts') {
      if (!pickerBuilt) {
        host.innerHTML = `<div class="pg pk">${STYLES.map(s => `<div class="pk-card" data-s="${s}" role="button" aria-label="${esc(T(...NAMES[s]))}"><div class="pk-in"></div></div>`).join('')}<div class="pk-name"></div></div>`;
        pickerBuilt = true; lastHtml = '';
      }
      const at = STYLES.indexOf(chosen);
      for (const card of root.querySelectorAll('.pk-card')) {
        const s = card.dataset.s, html = (lux() && s === 'clock' ? luxPage(d) : PAGE[s](d)) + miniFrame(s), inner = card.firstElementChild, pos = (STYLES.indexOf(s) - at + 4) % 4;
        if (inner.dataset.html !== html) { inner.innerHTML = html; inner.dataset.html = html; }
        const cls = 'at' + pos; if (!card.classList.contains(cls)) card.className = 'pk-card ' + cls;
      }
      const name = `${esc(lux() && chosen === 'clock' ? 'Lux' : T(...NAMES[chosen]))}<span class="lab">${at + 1} / 4</span>${chosen === 'clock' && !lux() ? `<button type="button" class="pk-edit" data-edit="1">${esc(T('Lettertype en apps', 'Font and apps'))}</button>` : ''}`, tag = root.querySelector('.pk-name'); if (tag.dataset.html !== name) { tag.innerHTML = name; tag.dataset.html = name; }
      return;
    }
    pickerBuilt = false;
    // (Lux, launch mode only: the calm Lux page takes the place of Clock, the first and default Home; the other styles stay)
    const html = `<div class="pg">${lux() && chosen === 'clock' ? luxPage(d) : PAGE[chosen](d, editing)}</div>`;
    if (html !== lastHtml) { host.innerHTML = html; lastHtml = html; }
    luxLive(d);
  }
  // the page's glow on Clock comes from what is going on (your song, Claude at work, your focus); Twenty-One's red when nothing is
  function glow(t) {
    if (chosen !== 'clock' || currentView !== 'home' || lux()) return;
    const d = facts(), c = d.song.playing ? d.song.colour : d.ai.working ? d.ai.colour : d.focus.on ? '#7a4be0' : null;
    window.__twocodeTintIsland = c || '#e01f4c'; window.__twocodeTintAt = t; window.__twocodeTintTall = 0.95;
  }
  drawHome = function () {
    for (const key of ['hmPrev', 'hmNext', 'homePlay', 'focusQuick', 'hmVol', 'focusApp', 'spotifyApp', 'ghost', 'chatApp', 'trayApp', 'clipsApp', 'noteApp', 'agendaApp', 'mirrorApp', 'settingsApp', 'allApps']) delete hit[key];
    for (const key of Object.keys(hit)) if (key.startsWith('monitor_')) delete hit[key];
    glow(performance.now());
  };
  let visible = false;
  (function position() {
    const show = ['home', 'shortcuts'].includes(currentView) && mode === 'expanded' && visual.width > 500 && visual.height > Math.min(targetHeight() - 30, 150) && !window.__twocodePaywallOn?.();
    const display = show ? 'block' : 'none'; if (root.style.display !== display) root.style.display = display;
    if (show) {
      window.__twocodePage.place(root, { x: islandBounds.x, y: 0, width: islandBounds.width, height: islandBounds.height });
      if (!visible || shownView !== currentView) { lastHtml = ''; shownView = currentView; loadLists(); render(); }
    } else if (editing) setEditing(false); // (the island folded in: next time you see your page again)
    visible = show;
    requestAnimationFrame(position);
  })();
  setInterval(() => { if (visible) render(); }, 500);
  setInterval(() => { if (visible) loadLists(); }, 5000);
  setTimeout(loadLists, 1500);
})();
