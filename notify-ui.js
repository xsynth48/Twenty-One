'use strict';
// Twenty-One's own notifications (V3). Every message goes through window.__twocodeNotice(id, { title, body, ... }) and you decide
// per message how it shows (Settings → Notifications): in the island (big or small), as a card, as a Windows one, or not at all.
// notice-main.cjs is the other half: the card's window, Windows' own notifications, and messages from the main process.
(function notices() {
  const api = window.twocode, P = () => window.__twocodePrefs?.() || {};
  const T = (nl, en) => P().lang === 'en' ? en : nl;
  const ORA = '239,123,55', AMB = '214,160,10', BLU = '10,132,255', RED = '226,44,62', VIO = '122,75,224', ALB = '224,31,76', GRN = '34,170,90', GRY = '110,110,128', GLD = '200,150,40';
  // critical: gets through Do not disturb and focus. instant: the answer to something you just did, never held back.
  // oldSmall: its small form is what the small island already shows by itself (Claude's states).
  const G = { other: ['Mail en andere apps', 'Mail and other apps'], ai: ['Claude en AI', 'Claude and AI'], focus: ['Focus', 'Focus'], music: ['Muziek en geluid', 'Music and sound'], life: ['Telefoon, agenda en batterij', 'Phone, calendar, battery'], robo: ['Robo en Twenty-One', 'Robo and Twenty-One'], buy: ['Proefperiode en kopen', 'Trial and buying'] };
  const LIST = [
    { id: 'newMail', g: 'other', ic: 'mail', c: '234,67,53', sound: 'pop', stay: 5, nl: 'Nieuwe mail', en: 'New mail', when: ['Er komt mail binnen in je Gmail. Alleen hoeveel: niet van wie en niet wat', 'New mail in your Gmail. Only how many: not who, and not what'], s: [['2 nieuwe mails', '2 new emails'], ['Klik om Gmail te openen.', 'Click to open Gmail.']] },
    { id: 'mailSent', g: 'other', ic: 'mail', c: GRN, sound: 'pop', stay: 3, instant: true, small: true, nl: 'Mail verstuurd', en: 'Mail sent', when: ['Je mailde een bestand', 'You mailed a file'], s: [['Verstuurd naar sam@example.com', 'Sent to sam@example.com'], ''] },
    // show: off until you switch it on (it reads what other apps tell you). stack: each one is its own, they wait their turn.
    { id: 'otherApps', g: 'other', ic: 'bell', c: GRY, sound: 'pop', stay: 6, show: 'off', stack: true, nl: 'Meldingen van andere apps', en: "Other apps' notifications", when: ['Discord, WhatsApp, Outlook en andere apps in de island, in plaats van de Windows-melding. Blijft op je pc, Twenty-One bewaart niks', 'Discord, WhatsApp, Outlook and other apps in the island, instead of the Windows pop-up. Stays on your PC, Twenty-One keeps nothing'], s: ['Ari', ['Ben je er al?', 'Are you there yet?']] },
    { id: 'claudeAsk', g: 'ai', ic: 'ask', c: AMB, sound: 'question', stay: 8, critical: true, oldSmall: true, nl: 'Claude vraagt toestemming', en: 'Claude asks for permission', when: ['Claude wil iets uitvoeren en wacht op jou', 'Claude wants to run something and waits for you'], s: [['Claude Code wil toestemming', 'Claude Code asks for permission'], 'checkout: npm test', [['Weiger', 'Deny'], ['Sta toe', 'Allow']]] },
    { id: 'claudeQuestion', g: 'ai', ic: 'ask', c: AMB, sound: 'question', stay: 8, critical: true, oldSmall: true, nl: 'Claude heeft een vraag', en: 'Claude has a question', when: ['Claude kan niet verder zonder antwoord', "Claude can't go on without an answer"], s: [['Claude Code heeft een vraag', 'Claude Code has a question'], ['checkout: Welk bestand moet ik aanpassen?', 'checkout: Which file should I change?']] },
    { id: 'claudeDone', g: 'ai', ic: 'check', c: BLU, sound: 'done', stay: 5, oldSmall: true, nl: 'Claude is klaar', en: 'Claude is done', when: ['Een taak is af', 'A task is finished'], s: [['Claude Code is klaar', 'Claude Code is done'], ['checkout: Het totaal is gerepareerd', 'checkout: Fixed the checkout total']] },
    { id: 'claudeError', g: 'ai', ic: 'warn', c: RED, sound: 'error', stay: 6, oldSmall: true, nl: 'Claude: fout', en: 'Claude: error', when: ['Een taak is mislukt', 'A task failed'], s: [['Claude Code: fout', 'Claude Code: error'], ['checkout: npm test is mislukt', 'checkout: npm test failed']] },
    { id: 'browserAi', g: 'ai', ic: 'check', c: BLU, sound: 'done', stay: 5, nl: 'ChatGPT of Claude in je browser', en: 'ChatGPT or Claude in your browser', when: ['Een antwoord staat klaar of er is een vraag', 'An answer is ready, or there is a question'], s: [['ChatGPT is klaar', 'ChatGPT is done'], ['Het antwoord staat klaar. Klik om het te zien.', 'The answer is ready. Click to see it.']] },
    { id: 'limit', g: 'ai', ic: 'warn', c: AMB, sound: 'warn', stay: 6, nl: 'Claude-limiet bijna vol', en: 'Claude limit almost full', when: ['Bij de grens die je koos van je 5-uurslimiet', 'At the level you chose of your 5-hour limit'], s: [['Je hebt 80% van je Claude-limiet gebruikt', 'You have used 80% of your Claude limit'], ['Om 14:30 is hij weer vol.', 'It is full again at 14:30.']] },
    { id: 'focusDone', g: 'focus', ic: 'timer', c: VIO, sound: 'party', stay: 6, nl: 'Focus klaar', en: 'Focus done', when: ['Je timer is afgelopen', 'Your timer has ended'], s: [['Focus klaar!', 'Focus done!'], ['25:00 gefocust. Neem even pauze.', '25:00 focused. Take a break.']] },
    { id: 'guardBack', g: 'focus', ic: 'shield', c: VIO, sound: 'pop', stay: 3, instant: true, nl: 'Terug aan het werk', en: 'Back to work', when: ['Je ging terug in plaats van verder', 'You went back instead of opening it'], s: [['Goed zo. Weer aan de slag', 'Nice. Back to it'], ['Je ging terug in plaats van YouTube te openen.', 'You went back instead of opening YouTube.']] },
    { id: 'nextSong', g: 'music', ic: 'skip', c: ALB, sound: 'none', stay: 1, instant: true, small: true, nl: 'Volgend of vorig nummer', en: 'Next or previous song', when: ['Je veegt over de island', 'You swipe over the island'], s: [['Volgend nummer', 'Next song'], 'Golden Hour, Nova Lane'] },
    { id: 'soundMoved', g: 'music', ic: 'speaker', c: GRY, sound: 'pop', stay: 2, instant: true, small: true, nl: 'Geluid gaat naar iets anders', en: 'Sound moved', when: ['Je kiest een ander apparaat', 'You pick another device'], s: [['Woonkamer-speaker', 'Living room speaker'], ['Speelt nu op Woonkamer-speaker', 'Now playing on Living room speaker']] },
    { id: 'seekFail', g: 'music', ic: 'hint', c: GRY, sound: 'none', stay: 3, instant: true, small: true, nl: 'Spoelen lukt niet', en: "Can't jump in this song", when: ['Je muziek-app staat het niet toe', "Your music app doesn't allow it"], s: [['Deze app laat niet spoelen', "This app doesn't allow jumping"], ['Spoel in de app zelf.', 'Try jumping in the app itself.']] },
    { id: 'volume', g: 'music', ic: 'speaker', c: GRY, sound: 'none', stay: 1.4, instant: true, small: true, nl: 'Volume', en: 'Volume', when: ['Je drukt op de volumeknoppen', 'You press the volume keys'], s: ['Volume', '62%'] },
    { id: 'phoneFile', g: 'life', ic: 'phone', c: GRY, sound: 'pop', stay: 4, nl: 'Ontvangen van je telefoon', en: 'Received from your phone', when: ['Je stuurt een bestand naar je PC', 'You send a file to your PC'], s: [['Ontvangen van je telefoon', 'Received from your phone'], ['photo.jpg ligt in je lade', 'photo.jpg is in your tray']] },
    { id: 'calendar', g: 'life', ic: 'cal', c: GRY, sound: 'question', stay: 8, nl: 'Agenda: over 10 minuten', en: 'Calendar: in 10 minutes', when: ['10 minuten voor een afspraak', '10 minutes before an event'], s: [['Over 10 minuten', 'In 10 minutes'], ['Tandarts', 'Dentist']] },
    { id: 'calLinked', g: 'life', ic: 'cal', c: GRN, sound: 'pop', stay: 4, instant: true, nl: 'Agenda gekoppeld', en: 'Calendar linked', when: ['Na het koppelen', 'After linking'], s: [['Google Agenda gekoppeld', 'Google Calendar linked'], ['Je afspraken staan nu in Twenty-One.', 'Your events now show in Twenty-One.']] },
    { id: 'battery', g: 'life', ic: 'bat', c: RED, sound: 'warn', stay: 6, nl: 'Laptop-batterij laag', en: 'Battery low', when: ['Bij 20 en 10 procent', 'At 20 and 10 percent'], s: [['Nog 20% batterij', 'Only 20% battery left'], ['Sluit je lader aan!', 'Plug in your charger!']] },
    { id: 'headphones', g: 'life', ic: 'head', c: AMB, sound: 'warn', stay: 6, nl: 'Koptelefoon bijna leeg', en: 'Headphones almost empty', when: ['Een Bluetooth-apparaat raakt leeg', 'A Bluetooth device runs low'], s: [['Koptelefoon is bijna leeg', 'Headphones are almost empty'], ['Nog 12% batterij.', '12% battery left.']] },
    { id: 'outfit', g: 'robo', ic: 'shirt', c: GLD, sound: 'party', stay: 6, nl: 'Nieuwe outfit verdiend', en: 'New outfit earned', when: ['Na 5, 15 of 30 taken', 'After 5, 15 or 30 tasks'], s: [['Twenty-One heeft iets nieuws!', 'Twenty-One has something new!'], ['5 taken klaar: je hebt een feesthoedje verdiend.', '5 tasks done: you earned a party hat.']] },
    { id: 'badge', g: 'robo', ic: 'medal', c: GLD, sound: 'badge', stay: 6, nl: 'Prestatie gehaald', en: 'Badge earned', when: ['Bijvoorbeeld tien taken klaar', 'For example ten tasks done'], s: [['Prestatie: Tien taken', 'Badge: Ten tasks'], ['10 taken klaar', '10 tasks done']] },
    { id: 'update', g: 'robo', ic: 'down', c: GRN, sound: 'pop', stay: 10, nl: 'Update staat klaar', en: 'Update ready', when: ['Een nieuwe versie is gedownload', 'A new version has been downloaded'], s: [['Er staat een update klaar', 'An update is ready'], ['Herstart Twenty-One om hem te installeren.', 'Restart Twenty-One to install it.'], [['Installeer', 'Install']]] },
    { id: 'updateCheck', g: 'robo', ic: 'search', c: GRY, sound: 'none', stay: 5, instant: true, small: true, nl: 'Zoeken naar updates', en: 'Checking for updates', when: ['Je klikt op Updates in het menu', 'You click Updates in the menu'], s: [['Zoeken naar updates…', 'Checking for updates…'], ''] },
    { id: 'keysTaken', g: 'robo', ic: 'key', c: AMB, sound: 'warn', stay: 10, nl: 'Sneltoets is bezet', en: 'Shortcut is taken', when: ['Een andere app gebruikt je toetsen', 'Another app uses your keys'], s: [['Ctrl+Alt+T is al in gebruik', 'Ctrl+Alt+T is already in use'], ['Een ander programma gebruikt deze toetsen.', 'Another app uses these keys.']] },
    { id: 'tucked', g: 'robo', ic: 'tuck', c: GRY, sound: 'none', stay: 6, instant: true, nl: 'Robo is weggeschoven', en: 'Robo is tucked away', when: ['De eerste keer dat je hem wegklapt', 'The first time you tuck him away'], s: [['Robo is weggeschoven', 'Robo is tucked away'], ['Ga met je muis op het dunne lijntje bovenaan om hem terug te halen.', 'Point at the thin line at the top of your screen to bring him back.']] },
    { id: 'hint', g: 'robo', ic: 'hint', c: GRY, sound: 'none', stay: 4, instant: true, small: true, nl: 'Kleine hints', en: 'Small hints', when: ['Bijvoorbeeld als iets ontgrendeld moet worden', 'For example when something needs unlocking'], s: [['Focusbewaker: ontgrendel hem in Instellingen', 'Focus guard: unlock it in Settings'], ''] },
    { id: 'trial', g: 'buy', ic: 'timer', c: GRY, sound: 'none', stay: 6, nl: 'Proefdag loopt', en: 'Free day is running', when: ['Bij het opstarten tijdens je gratis dag', 'At start during your free day'], s: [['Gratis tot 14:30', 'Free until 14:30'], ['Probeer alles in Twenty-One.', 'Try everything in Twenty-One.']] },
    { id: 'offer', g: 'buy', ic: 'tag', c: GRN, sound: 'none', stay: 6, nl: 'Korting', en: 'Discount', when: ['Eén keer, als er een aanbieding is', 'Once, when there is an offer'], s: [['Koop vandaag: 30% korting', 'Buy today: 30% off'], ['Houd Twenty-One voor altijd.', 'Keep Twenty-One for good.']] },
    { id: 'lastDay', g: 'buy', ic: 'timer', c: AMB, sound: 'none', stay: 6, nl: 'Laatste gratis dag', en: 'Last free day', when: ['Op je laatste dag', 'On your last day'], s: [['Vandaag is je laatste gratis dag', 'Today is your last free day'], ['Houd Twenty-One voor altijd.', 'Keep Twenty-One for good.']] },
    { id: 'comeback', g: 'buy', ic: 'heart', c: ALB, sound: 'none', stay: 7, nl: 'Robo mist je', en: 'Robo misses you', when: ['Je proefperiode is voorbij en je kwam terug', 'Your trial ended and you came back'], s: [['Robo mist je', 'Robo misses you'], ['30% korting als je vandaag terugkomt.', '30% off if you come back today.']] },
    { id: 'founder', g: 'buy', ic: 'star', c: GLD, sound: 'party', stay: 7, nl: 'Founder', en: 'Founder', when: ['Eén keer, als je founder bent', 'Once, when you are a founder'], s: ['Founder', ['Voor jou altijd gratis.', 'Free for you, forever.']] },
    { id: 'buyFail', g: 'buy', ic: 'warn', c: RED, sound: 'error', stay: 4, instant: true, nl: 'Kopen lukt niet', en: "Buying doesn't work", when: ['Als de betaalpagina niet opent', "When the payment page doesn't open"], s: [['Kopen kan nog niet', 'Buying is not open yet'], ['Probeer het straks opnieuw.', 'Try again later.']] },
  ];
  const BY = Object.fromEntries(LIST.map(x => [x.id, x]));
  const pair = v => Array.isArray(v) ? T(v[0], v[1]) : v;

  // What you chose for a message, on top of its defaults (the big one, in the island).
  const conf = (id, prefs = P()) => { const b = BY[id]; return { show: b.show || 'island', size: b.small ? 'small' : 'big', stay: b.stay, sound: b.sound, colour: 'auto', place: 'top', text: true, focus: Boolean(b.critical), games: false, ...(b.stack ? { hideWin: true } : {}), ...(prefs.notices?.[id] || {}) }; };
  const rgbOf = c => { const hex = /^#([0-9a-f]{6})$/i.exec(c || ''); if (hex) return [0, 2, 4].map(i => parseInt(hex[1].slice(i, i + 2), 16)).join(','); return /rgb\(([^)]+)\)/.exec(c || '')?.[1] || null; };

  function heldBack(b, c) {
    if (b.instant) return false;
    if (P().noticeDnd && !b.critical) return true;
    const running = window.__twocodeMode?.();
    if (window.__twocodeFocus?.active() && !c.focus && (!running || running.quiet)) return true;
    return Boolean(window.__twocodeGameMode?.active() && !c.games);
  }
  const chime = c => { if (c.sound && c.sound !== 'none') window.__twocodeChime?.(c.sound); };

  // ---------- on screen ----------
  const root = document.createElement('section'); root.id = 'twocode-notice'; document.body.appendChild(root);
  const style = document.createElement('style'); style.textContent = `
#twocode-notice{position:absolute;z-index:88;display:none;pointer-events:none;color:#fff;font:14px/1.4 Inter,"Segoe UI",sans-serif;user-select:none}
#twocode-notice *{box-sizing:border-box}
#twocode-notice .nt{position:absolute;left:50%;top:0;transform:translateX(-50%);pointer-events:auto;cursor:pointer;transition:opacity .16s ease-out}
#twocode-notice .nt svg{fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none}
#twocode-notice .big{width:372px;padding:14px 16px;display:flex;gap:12px;align-items:flex-start}
#twocode-notice .sq{width:36px;height:36px;display:flex;align-items:center;justify-content:center;flex:none}
#twocode-notice .sq svg{stroke-width:2;filter:drop-shadow(0 0 7px rgba(var(--ic),.55))}
#twocode-notice .tx{flex:1;min-width:0}
#twocode-notice .h1{display:flex;justify-content:space-between;gap:8px;font-size:15px;line-height:19px;font-weight:700;letter-spacing:-.01em}
#twocode-notice .h1 span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#twocode-notice .hr{font:500 12.5px/19px "JetBrains Mono",Consolas,monospace;flex:none}
#twocode-notice .bd{margin-top:3px;font-size:12.5px;line-height:17px;font-weight:500;color:rgba(255,255,255,.8);display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere}
#twocode-notice .bt{display:flex;gap:6px;margin-top:9px;justify-content:flex-end}
#twocode-notice button{height:28px;padding:0 12px;border:0;border-radius:8px;font:600 12px Inter,"Segoe UI",sans-serif;background:rgba(255,255,255,.14);color:#fff;cursor:pointer;flex:none;transition:transform .1s ease-out,background .15s}
#twocode-notice button.y{background:#fff;color:#000}
#twocode-notice button:hover{background:rgba(255,255,255,.22)}
#twocode-notice button.y:hover{background:#e5e5ea}
#twocode-notice button:active{transform:scale(.96)}
#twocode-notice .small{height:36px;width:max-content;min-width:200px;max-width:440px;padding:0 14px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600;white-space:nowrap}
#twocode-notice .small .st{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
#twocode-notice .small button{height:24px;padding:0 10px}
#twocode-notice .small .hr{line-height:36px}
#twocode-notice .over{top:6px;border-radius:20px;box-shadow:0 14px 34px rgba(0,0,0,.65),inset 0 0 0 1px rgba(255,255,255,.14);animation:nt-drop .28s cubic-bezier(.2,.9,.3,1) both}
@keyframes nt-drop{from{opacity:0;transform:translate(-50%,-10px) scale(.97)}}
@media (prefers-reduced-motion:reduce){#twocode-notice .over{animation:none}}`;
  document.head.appendChild(style);

  const esc = s => String(s ?? '').replace(/[&<>"]/g, x => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[x]));
  const icon = (id, s) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true">${window.TC_NOTICE_ICONS[id] || ''}</svg>`;
  const lighter = rgb => String(rgb).split(',').map(v => Math.round(+v + (255 - +v) * 0.38)).join(','); // (readable on the black)
  let cur = null, seq = 0; const queue = [];

  // (Lux, launch mode only: "done" is Robo's happy eyes, not a tick)
  const HAPPY = '<svg width="30" height="30" viewBox="0 0 30 30" fill="none" stroke="#fff" stroke-linecap="round" aria-hidden="true" style="stroke:#fff;stroke-width:2.8"><path d="M4 17q4.5-7.5 9 0M17 17q4.5-7.5 9 0"/></svg>';
  function paint(n) {
    const c = n.conf, rgb = n.rgb, buttons = (n.btns || []).map((b, i) => `<button type="button" class="${b.primary ? 'y' : ''}" data-i="${i}">${esc(b.label)}</button>`).join('');
    const showText = c.text !== false && n.body;
    root.innerHTML = n.size === 'small'
      ? `<div class="nt small" role="status">${n.img ? `<img src="${esc(n.img)}" alt="" style="width:18px;height:18px;border-radius:5px;flex:none">` : icon(n.base.ic, 16)}<span class="st">${esc(n.short || n.title)}</span>${n.right ? `<span class="hr">${esc(n.right)}</span>` : ''}${buttons}</div>`
      // (the icon itself in the message's colour, lit like the island's glow; an app's own logo as it is. A coloured square
      // behind a thin white icon looked like clip art: the user, 11 Nov, "the icons are a bit weird")
      : `<div class="nt big" role="status"><span class="sq" style="--ic:${rgb};color:rgb(${lighter(rgb)})">${n.img ? `<img src="${esc(n.img)}" alt="" style="width:34px;height:34px;border-radius:9px">` : window.__twocodeLux?.() && n.base.id === 'claudeDone' ? HAPPY : icon(n.base.ic, 27)}</span><div class="tx"><div class="h1"><span>${esc(n.title)}</span>${n.right ? `<span class="hr">${esc(n.right)}</span>` : ''}</div>${showText ? `<div class="bd">${esc(n.body)}</div>` : ''}${buttons ? `<div class="bt">${buttons}</div>` : ''}</div></div>`;
    root.style.display = 'block';
    n.el = root.firstElementChild;
    window.__twocodeLuxArrive?.(n.el, 'notice'); // (Lux, launch mode only: the words arrive after the shape, the icon pops)
    n.h = n.size === 'small' ? UI.COMPACT_H : Math.max(68, Math.ceil(n.el.offsetHeight));
    n.w = n.size === 'small' ? Math.ceil(n.el.offsetWidth) : 372;
  }
  function start(n) {
    cur = n; n.endAt = performance.now() + n.conf.stay * 1000;
    chime(n.conf);
    if (n.where === 'card') {
      api.noticeCard?.({ key: n.key, title: n.title, body: n.conf.text !== false ? n.body : '', right: n.right, ic: n.base.ic, rgb: n.rgb, btns: (n.btns || []).map(b => ({ label: b.label, primary: Boolean(b.primary) })), stay: n.sticky ? 0 : n.conf.stay, place: n.conf.place, alpha: window.__twocodeIslandAlpha?.() ?? 1 });
      return;
    }
    paint(n);
    if (mode !== 'expanded') setMode('compact', false);
  }
  function finish() {
    if (!cur) return;
    const wasIsland = cur.where !== 'card';
    cur = null; root.innerHTML = ''; root.style.display = 'none';
    if (queue.length) { start(queue.shift()); if (cur?.where !== 'card') return; }
    if (wasIsland && !cur && mode === 'compact') { setMode('compact', false); window.__twocodeSettleSize?.(); }
  }
  const later = n => { if (!introFinished || window.__twocodeHelloBusy?.()) { setTimeout(() => later(n), 400); return true; } return add(n); };
  function add(n) {
    if (!cur) { start(n); return true; }
    if ((cur.id === n.id && !n.base.stack) || (n.base.critical && !cur.base.critical) || (n.base.instant && !cur.base.critical)) { // (the same message again, or more urgent: it takes over, what it interrupted comes back after it)
      if (cur.where === 'card') api.noticeCardClose?.();
      if (cur.id !== n.id && !cur.base.instant) queue.unshift(cur);
      cur = null; root.innerHTML = ''; start(n); return true;
    }
    const same = n.base.stack ? -1 : queue.findIndex(x => x.id === n.id);
    if (same >= 0) queue[same] = n; else if (queue.length < 6) queue.push(n); else return false; // (no room: say so, or a busy Discord loses it here and in Windows)
    return true;
  }

  window.__twocodeNotice = (id, d = {}) => {
    const base = BY[id]; if (!base) return;
    const c = conf(id);
    if (d.seen) { chime(c); return; } // you are looking at it already
    if (c.show === 'off' || heldBack(base, c)) return;
    let where = c.show;
    if (where === 'windows') {
      if (P().notify !== false) { const key = ++seq; if (d.btns?.length || d.open) clickable.set(key, d.open || d.btns?.at(-1)?.run); const say = s => window.__twocodePack?.t(s) ?? s; api.noticeWindows?.({ key, title: say(d.title || ''), body: c.text !== false ? say(d.body || '') : '' }); chime(c); return; }
      where = 'island'; // (Windows notifications are off: never one from Windows)
    }
    if (where === 'island') {
      if (c.size === 'small' && base.oldSmall) { chime(c); return; } // the small island already says it itself
      if (c.size === 'small' && d.flash) { window.__twocodeFlash?.(d.flash, c.stay * 1000); chime(c); return; }
      if (window.__twocodeTuck?.get() || window.__twocodeGameMode?.active()) where = 'card'; // the island is out of sight
    }
    const rgb = (c.colour !== 'auto' && rgbOf(c.colour)) || d.rgb || base.c;
    return later({ id, base, conf: c, key: ++seq, where, size: c.size, title: d.title || pair(base.s[0]), body: d.body ?? '', short: d.short, right: d.right, btns: d.btns, open: d.open, until: d.until, sticky: Boolean(d.until), rgb, img: d.img });
  };
  // Other apps' notifications (a user: "classic windows notifications style is ass"): off until you choose where they show.
  // Only while it shows here does Windows' own message go away; held back by focus or a game, Windows keeps it for later.
  let otherListening = false; window.__twocodeWinNoticeStatus = '';
  const listenOther = () => { const on = conf('otherApps').show !== 'off'; if (on !== otherListening) { otherListening = on; if (!on) window.__twocodeWinNoticeStatus = ''; api?.winNoticesListen?.(on); } };
  setInterval(listenOther, 1000); setTimeout(listenOther, 1500);
  api?.onWinNoticeStatus?.(s => { window.__twocodeWinNoticeStatus = String(s || ''); });
  const APP_RGB = { discord: '88,101,242', whatsapp: '37,211,102', telegram: '42,171,238', outlook: '15,108,189', slack: '74,21,75', teams: '91,95,199', signal: '58,118,240', messenger: '10,124,255' }; // (programs like Discord give Windows no icon: their own colour instead)
  // (Windows can leave a program's name empty: then the one in its id, com.squirrel.Discord.Discord → Discord; a {GUID} alone says nothing)
  const appNameFromId = id => {
    const part = String(id).split(/[\\/]/).pop().split('!')[0].split('.').filter(p => p && !/^\d+$/.test(p) && !/^exe$/i.test(p)).pop()?.split('_')[0] || '';
    if (!part || part.includes('{')) return '';
    return part === part.toLowerCase() || part === part.toUpperCase() ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part;
  };
  // (Discord's title is "Abdu (#chat, Server)", and a mention in a thread has two #: who and where, without the # and the channel)
  const discordTitle = title => { const m = String(title).match(/^(.+?) \(#.*, ([^,]+)\)$/); return m ? `${m[1]} · ${m[2]}` : ''; };
  window.__twocodeWinNoticeIn = m => {
    const appId = String(m?.appId || ''), rawTitle = String(m?.title || m?.app || ''), fromDiscord = discordTitle(rawTitle), title = fromDiscord || rawTitle, head = String(m?.app || '') || appNameFromId(appId) || (fromDiscord ? 'Discord' : ''), logo = String(m?.logo || ''), body = String(m?.body || '');
    const rgb = Object.entries(APP_RGB).find(([name]) => head.toLowerCase().includes(name))?.[1];
    window.__twocodeWinNoticeLast = { app: head || title, at: Date.now() }; // (Settings shows it: did Windows hand us this one at all?)
    const shown = window.__twocodeNotice('otherApps', { title, body, right: head && head !== title ? head : '', short: body && conf('otherApps').text !== false ? `${title}: ${body}` : title, img: logo ? `data:image/png;base64,${logo}` : '', rgb, open: appId ? () => api?.winNoticeOpen?.(appId) : undefined });
    if (shown && conf('otherApps').hideWin !== false) api?.winNoticeHide?.(m.id);
  };
  api?.onWinNotice?.(m => window.__twocodeWinNoticeIn(m));
  const clickable = new Map();
  for (const args of window.__twocodeNoticeEarly?.splice(0) || []) window.__twocodeNotice(...args);

  // the island takes the size of what it shows (mascot.html modeTarget, ai-monitor-ui.js compactWidth)
  window.__twocodeNoticeTone = () => cur && cur.where !== 'card' ? cur.rgb || null : null; // (the glass orb fills with it, orb-ui.js)
  window.__twocodeNoticeSize = () => cur && cur.where !== 'card' && cur.h ? { width: cur.w, height: cur.h, radius: cur.size === 'small' ? cur.h / 2 : 26 } : null;

  // the colour of the message rises from the bottom of the island
  const baseSmall = drawSmall;
  drawSmall = function (...args) {
    if (!cur || cur.where === 'card') return baseSmall.apply(this, args);
    for (const key of ['ghost', 'cAllow', 'cDeny', 'cOpen', 'headEyes']) hit[key] = null;
    window.__twocodeBubbles = []; window.__twocodeClaudeBubble = null;
    const { x, width: w, height: h } = islandBounds, rgb = cur.rgb;
    ctx.save(); islandPath(x, 0, w, h, visual.radius); ctx.clip(); ctx.translate(x + w / 2, h * 1.36); ctx.scale(w * 1.1, h * 1.2);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, `rgb(${rgb})`); g.addColorStop(0.5, `rgba(${rgb},.36)`); g.addColorStop(0.82, `rgba(${rgb},0)`);
    ctx.fillStyle = g; ctx.fillRect(-1, -2, 2, 2); ctx.restore();
  };
  // you can read it and press its buttons without the big island opening under your mouse
  const baseHover = updateHover;
  updateHover = function (now) {
    if (cur && cur.where !== 'card' && mode === 'compact' && pointer.known && inside(pointer.x, pointer.y, islandBounds)) { hoverStartedAt = null; return; }
    return baseHover(now);
  };
  (function position() {
    if (cur && cur.where !== 'card' && cur.el) {
      // measured again once it is really laid out (fonts in): measured too early, the island was shorter than the message
      // and its last line hung over the edge
      if (cur.size !== 'small') { const h = Math.max(68, Math.ceil(cur.el.offsetHeight)); if (h !== cur.h) { cur.h = h; if (mode === 'compact') setMode('compact', false); } }
      const over = mode === 'expanded';
      root.style.left = `${islandBounds.x}px`; root.style.top = '0'; root.style.width = `${islandBounds.width}px`; root.style.height = `${Math.max(islandBounds.height, cur.h + 8)}px`;
      cur.el.classList.toggle('over', over);
      if (over) cur.el.style.background = `radial-gradient(110% 120% at 50% 136%,rgb(${cur.rgb}) 0,rgba(${cur.rgb},.36) 50%,transparent 82%),#000`; else cur.el.style.background = 'none';
      const k = over ? 1 : Math.max(0, Math.min(1, (visual.height - UI.COMPACT_H * 0.8) / Math.max(1, cur.h - UI.COMPACT_H * 0.8)));
      cur.el.style.opacity = cur.size === 'small' ? (Math.abs(visual.width - cur.w) < 40 ? 1 : 0) : Math.pow(k, 2);
    }
    requestAnimationFrame(position);
  })();
  setInterval(() => {
    if (!cur) return;
    const hovering = cur.where !== 'card' && pointer.known && inside(pointer.x, pointer.y, islandBounds);
    if (hovering) cur.endAt = Math.max(cur.endAt, performance.now() + 1500);
    if (cur.until?.()) { if (cur.where === 'card') api.noticeCardClose?.(); finish(); return; }
    if (cur.where !== 'card' && !cur.sticky && performance.now() > cur.endAt) finish();
    if (cur?.where === 'card' && !cur.sticky && performance.now() > cur.endAt + 4000) finish(); // (the card never answered: don't wait for ever)
  }, 200);
  function press(n, i) {
    const b = i >= 0 ? n.btns?.[i] : null;
    finish();
    if (b) { sound('click'); b.run?.(); } else if (i === -1) { sound('click'); n.open?.(); }
  }
  root.addEventListener('click', e => {
    if (!cur) return;
    const b = e.target.closest('button');
    press(cur, b ? Number(b.dataset.i) : -1);
  });
  api?.onNoticeChoice?.(({ key, index }) => {
    if (clickable.has(key)) { const run = clickable.get(key); clickable.delete(key); if (index === -1) run?.(); return; }
    if (cur?.key !== key) return;
    if (index === -2) { finish(); return; } // closed or its time is up
    press(cur, index);
  });
  // messages from the main process (update, shortcut taken, the AI in your browser)
  api?.onNoticeShow?.(m => window.__twocodeNotice(m.id, { title: m.title, body: m.body, right: m.right, open: m.token ? () => api.noticeClick?.(m.token) : undefined }));
  api?.noticeReady?.();

  // ---------- for Settings → Notifications ----------
  window.__twocodeNoticeCatalog = prefs => LIST.map(b => ({ id: b.id, group: pair(G[b.g]), name: T(b.nl, b.en), when: pair(b.when), ic: b.ic, rgb: b.c, title: pair(b.s[0]), body: pair(b.s[1]), btns: (b.s[2] || []).map(pair), critical: Boolean(b.critical), oldSmall: Boolean(b.oldSmall), conf: conf(b.id, prefs) }));
  // shows it now the way the draft says, whatever the switches say
  window.__twocodeNoticeTry = (id, prefs) => {
    const b = BY[id]; if (!b) return;
    const c = conf(id, prefs); if (c.show === 'off') return;
    if (c.show === 'windows') { api.noticeWindows?.({ key: ++seq, title: pair(b.s[0]), body: c.text !== false ? pair(b.s[1]) : '' }); chime(c); return; }
    const rgb = (c.colour !== 'auto' && rgbOf(c.colour)) || b.c;
    const n = { id, base: b, conf: c, key: ++seq, where: c.show === 'card' ? 'card' : 'island', size: c.size, title: pair(b.s[0]), body: pair(b.s[1]), btns: (b.s[2] || []).map((l, i, all) => ({ label: pair(l), primary: i === all.length - 1 })), rgb };
    add(n);
  };
})();
