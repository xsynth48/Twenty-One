'use strict';
// Twenty-One Lux (beta 130, 17 Nov 2026): the premium look the user picked from the canvas "Twenty-One Lux"
// (https://claude.ai/artifact/KS5YuDSaPx2hZQA5M2hgKj): one black material hanging from the top edge, colour only as light
// (orange Claude, amber a question, BLUE done, purple Focus, the cover's colours for music), Robo's two soft eyes as the only
// character, and motion only when something happens (the shape first, then the content; one hop when done, two knocks
// when he asks).
// SECRET until launch day: it only shows in launch mode (the server's /v1/robo/status says launch: only the test PC today,
// everyone once ROBO_LAUNCH = "on"; twocode-fun.js keeps window.__twocodeLaunchMode, also remembered for the next start).
// Off, unknown or offline: every hook below answers "not me" and the island looks exactly as before.
// mascot.html asks: __twocodeLuxBump (a few px of height for the hop/knock), __twocodeLuxOpenK (how far the open content
// has materialized), __twocodeLuxEyes, __twocodeLuxUnder / __twocodeLuxLight (light under and inside the island),
// __twocodeLuxSize (the resting and the lyrics sizes). ai-monitor-ui.js: __twocodeLuxMark, __twocodeLuxGlow,
// __twocodeLuxCover, __twocodeLuxSheen. pages-ui.js / notify-ui.js: __twocodeLuxArrive. home-ui.js: the Lux Home.
(function lux() {
  const on = () => window.__twocodeLaunchMode === true;
  let still = false; try { const q = matchMedia('(prefers-reduced-motion: reduce)'); still = q.matches; q.addEventListener?.('change', e => { still = e.matches; }); } catch {}
  // (and on a laptop with little battery left and no charger: no drifting, no breathing, the moments stay but without motion)
  let low = false;
  try { navigator.getBattery?.().then(b => { const check = () => { low = !b.charging && b.level <= 0.2; }; check(); b.addEventListener('chargingchange', check); b.addEventListener('levelchange', check); }).catch(() => {}); } catch {}
  const calm = () => still || low;
  window.__twocodeLux = on;
  // (a class for the HTML pages, so their CSS can follow; checked again now and then: the server can answer later)
  const mark = () => { try { document.documentElement.classList.toggle('twocode-lux', on()); } catch {} };
  mark(); setInterval(mark, 1000);

  const TAU = Math.PI * 2;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - Math.pow(1 - clamp01(x), 3);
  const rgbOf = c => { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c || ''); if (m) return [+m[1], +m[2], +m[3]]; const hex = /^#([0-9a-f]{6})$/i.exec(c || ''); if (hex) { const n = parseInt(hex[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; } return [224, 31, 76]; };
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  // the cover's colour and two neighbours on the colour wheel (the canvas: pink, purple and a warm orange drifting together)
  const shift = (rgb, deg, light = 0) => {
    const [r, g, b] = rgb.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let h = 0, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = ((h * 60 + deg) % 360 + 360) % 360; s = Math.max(s, 0.55); const L = Math.min(0.72, Math.max(0.42, l + light));
    const c = (1 - Math.abs(2 * L - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = L - c / 2;
    const [a, bb, cc] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [a, bb, cc].map(v => Math.round((v + m) * 255));
  };
  const COLOUR = { claude: [232, 134, 95], ask: [255, 170, 64], done: [10, 132, 255], focus: [177, 140, 255], white: [255, 255, 255] };

  // ---------- what is going on, and the moments (done, a question, opening) ----------
  let doneAt = -1e9, askSince = 0, wasDone = false, wasAsk = false, openAt = -1e9, wasMode = null, ticked = -1;
  function track(now) {
    if (ticked === now) return; ticked = now;
    const s = window.__twocodeIslandState?.() || {};
    if (s.done && !wasDone) doneAt = now;
    wasDone = Boolean(s.done);
    if (s.needsYou && !wasAsk) askSince = now;
    if (!s.needsYou) askSince = 0;
    wasAsk = Boolean(s.needsYou);
    const m = typeof mode === 'string' ? mode : null;
    if (m === 'expanded' && wasMode !== 'expanded') openAt = now;
    wasMode = m;
  }
  const state = () => window.__twocodeIslandState?.() || {};
  const doneFresh = now => now - doneAt < 4200;

  // A hop when Claude is done (the island's bottom dips, lifts and settles), two knocks every 3.2 s while he asks.
  // As extra height: the island stays hanging from the top edge.
  const keys = (t, pts) => { for (let i = 1; i < pts.length; i++) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; if (t <= t1) { const k = (t - t0) / (t1 - t0), e = k * k * (3 - 2 * k); return v0 + (v1 - v0) * e; } } return 0; };
  const HOP = [[0, 0], [0.06, 2], [0.18, -4], [0.32, 1], [0.48, 0]];
  const KNOCK = [[0, 0], [0.09, 2], [0.18, 0], [0.27, 2], [0.36, 0]];
  window.__twocodeLuxBump = now => {
    if (!on()) return 0;
    if (typeof mode === 'string' && mode === 'expanded') { track(now); return 0; } // (the open island's pages stay still)
    track(now);
    if (calm()) return 0;
    let d = 0; const t = (now - doneAt) / 1000;
    if (t >= 0 && t < 0.48) d += keys(t, HOP);
    if (askSince) { const u = ((now - askSince) / 1000) % 3.2; if (u < 0.36) d += keys(u, KNOCK); }
    return d;
  };

  // Opening: the shape arrives first, then the content materializes in it (blur 8 → 0, scale .96 → 1, opacity), 90 ms later.
  window.__twocodeLuxOpenK = now => {
    if (!on()) return 1;
    track(now);
    if (calm()) return 1;
    const t = now - openAt - 90;
    return t <= 0 ? 0 : t >= 320 ? 1 : ease(t / 320);
  };
  // the same for the HTML pages and messages, as they appear
  window.__twocodeLuxArrive = (el, kind = 'page') => {
    if (!on() || calm() || !el?.animate) return;
    try {
      if (kind === 'notice') {
        (el.querySelector?.('.tx, .st') || el).animate([{ opacity: 0, filter: 'blur(6px)', transform: 'translateX(-6px)' }, { opacity: 1, filter: 'blur(0px)', transform: 'translateX(0)' }],
          { duration: 300, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
        const icon = el.querySelector?.('.sq, img, svg');
        icon?.animate?.([{ transform: 'scale(.6)' }, { transform: 'scale(1.06)', offset: 0.7 }, { transform: 'scale(1)' }], { duration: 380, delay: 140, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'backwards' });
        return;
      }
      if (!el.style.transformOrigin) el.style.transformOrigin = '50% 0';
      el.animate([{ opacity: 0, filter: 'blur(8px)', transform: 'scale(.96)' }, { opacity: 1, filter: 'blur(0px)', transform: 'scale(1)' }],
        { duration: 320, delay: 90, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    } catch {}
  };

  // ---------- sizes: the resting island (188 x 34) and the medium lyrics island (60 high) ----------
  window.__twocodeLuxSize = (which, t) => {
    if (!on()) return null;
    if (which === 'rest' && !window.__twocodeRestFace?.on?.()) return { width: Math.max(t.width, 188), height: Math.max(t.height, 34), radius: 19 };
    if (which === 'compact' && window.__twocodeListenPill?.()) return null;
    if (which === 'compact' && window.__twocodeLuxTogether?.()) return { width: Math.max(t.width, 470), height: window.__twocodeLuxTogetherRow?.() ? 136 : 108, radius: 30 };
    if (which === 'compact' && window.__twocodeLyricsWide?.() && !state().needsYou && !window.__twocodeNoticeSize?.()) return { width: Math.max(t.width, 452), height: 60, radius: 26 };
    if (which === 'compact' && window.__twocodeLuxMusicOnly?.()) return { width: 236, height: t.height, radius: t.height / 2 };
    if (which === 'compact' && window.__twocodeLuxClaudeOnly?.()) return { width: Math.max(t.width, 340), height: 46, radius: 23 };
    return null;
  };

  // ---------- Robo's eyes: soft white, irregular blinks (sometimes twice), small glances, scanning while Claude reads,
  // happy arcs when done, looking down when he asks ----------
  const blink = { next: 0, at: -1e9, twice: false };
  function openness(now) {
    if (!blink.next) blink.next = now + 2200 + Math.random() * 3800;
    if (now >= blink.next) { blink.at = now; blink.twice = Math.random() < 0.28; blink.next = now + 2600 + Math.random() * 4600; }
    const one = t => t < 0 || t > 150 ? 1 : 1 - 0.9 * Math.sin(Math.PI * t / 150);
    let k = one(now - blink.at); if (blink.twice) k = Math.min(k, one(now - blink.at - 240));
    return k;
  }
  const glance = { from: 0, to: 0, at: 0, next: 0, back: 0 };
  function glanceX(now) {
    if (!glance.next) glance.next = now + 4000 + Math.random() * 5000;
    if (now >= glance.next) { glance.from = glanceAt(now); glance.to = [-2, -1.5, 1.5, 2][Math.floor(Math.random() * 4)]; glance.at = now; glance.back = now + 700 + Math.random() * 700; glance.next = now + 4200 + Math.random() * 5200; }
    if (glance.back && now >= glance.back) { glance.from = glanceAt(now); glance.to = 0; glance.at = now; glance.back = 0; }
    return glanceAt(now);
  }
  function glanceAt(now) { const k = ease((now - glance.at) / 260); return glance.from + (glance.to - glance.from) * k; }
  function eyeShape(x, y, w, h) {
    const r = Math.min(w, h) / 2;
    ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe4ee');
    ctx.fillStyle = g; ctx.fill();
  }
  function arcEye(x, y, size) {
    ctx.beginPath(); ctx.ellipse(x, y + 2 * size, 5 * size, 4.4 * size, 0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.4 * size; ctx.lineCap = 'round'; ctx.stroke();
  }
  // kind: 'rest' (the island's face), 'work' (scanning), 'done' (arcs), 'ask' (looking down)
  // (the canvas: 9 x 11, 13 apart in the island's face; 6 apart when they sit in front of words)
  function eyes(cx, cy, size, kind, now, gap = 13) {
    const fx = window.__twocodeGhostFx?.() || {}, talk = window.__twocodeTalking?.() || 0;
    const w = 9 * size, h = 11 * size, half = (9 + gap) / 2 * size;
    let dx = 0, dy = 0, open = calm() ? 1 : openness(now);
    if (kind === 'work' && !calm()) dx = Math.sin(now / 1600 * TAU) * 1.5 * size;
    else if (kind === 'rest' && !calm()) {
      dx = glanceX(now) * size;
      if (pointer?.known) dx += Math.max(-1, Math.min(1, (pointer.x - cx) / 320)) * 1.2 * size; // (still follows your mouse, a little)
    }
    if (kind === 'ask') { dy = 1.6 * size; open *= 0.62; }
    const hop = (fx.dy || 0) * 0.18 * size - talk * 1.6 * size;
    const sleep = fx.mood === 'sleep', happy = kind === 'done' || fx.mood === 'happy';
    ctx.save();
    ctx.translate(cx + dx, cy + dy + hop);
    ctx.scale(1 + talk * 0.08, 1 - talk * 0.38);
    ctx.shadowColor = 'rgba(255,255,255,.26)'; ctx.shadowBlur = 8 * Math.max(0.6, size);
    for (const side of [-1, 1]) {
      const x = side * half;
      if (happy) arcEye(x, 0, size);
      else if (sleep) { ctx.beginPath(); ctx.moveTo(x - w / 2, 1); ctx.lineTo(x + w / 2, 1); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2 * size; ctx.lineCap = 'round'; ctx.stroke(); }
      else eyeShape(x, 0, w, Math.max(1, h * open));
    }
    ctx.restore();
  }
  window.__twocodeLuxEyes = (cx, cy, size = 1) => {
    if (!on()) return false;
    if (window.__twocodeOrbFace?.(cx, cy, size)) return true; // (beta 131: the glass orb is his face, orb-ui.js)
    const now = performance.now(), s = state();
    const kind = s.needsYou ? 'ask' : s.done && doneFresh(now) ? 'done' : s.working && size <= 1.05 ? 'work' : 'rest';
    eyes(cx, cy, size, kind, now);
    return true;
  };
  // the small island's leading mark (ai-monitor-ui.js mark()): Robo's eyes, smaller, in the mood of what is going on
  // x: where the island's content starts. Roomy (46 high, Claude at work): full size, the words start 42 px in; small: 0.7
  window.__twocodeLuxMark = (x, cy, kind, roomy = false) => {
    if (!on()) return false;
    if (window.__twocodeOrbFace?.(x + (roomy ? 21 : 11), cy, roomy ? 1 : 0.74)) return true; // (the glass orb, 30 or 22 px)
    const size = roomy ? 1 : 0.7;
    eyes(x + (roomy ? 6 : 0) + 12 * size, cy, size, kind, performance.now(), 6);
    return true;
  };

  // ---------- light inside the island (the small island's glow): softer and wider than before; a question pulses ----------
  function insideClip() { const { x, width: w, height: h } = islandBounds; islandPath(x, 0, w, h, visual.radius); ctx.clip(); return { x, w, h }; }
  function pool(cx, cy, rx, ry, rgb, a) {
    if (a <= 0.003) return;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(rx, ry);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(rgb, a)); g.addColorStop(0.55, rgba(rgb, a * 0.34)); g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }
  window.__twocodeLuxGlow = (rgbText, k = 1, kind = '') => {
    if (!on()) return false;
    const now = performance.now(), rgb = kind === 'done' ? COLOUR.done : kind === 'ask' ? COLOUR.ask : kind === 'claude' ? COLOUR.claude : kind === 'focus' ? COLOUR.focus : rgbOf(`rgb(${rgbText})`);
    let a = 0.62 * Math.min(1, k);
    if (kind === 'ask' && !calm()) a *= 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((now - askSince) / 1600 * TAU));
    if (kind === 'done') { const t = (now - doneAt) / 1000; a *= t < 0.3 ? 1 : Math.max(0.55, 1 - (t - 0.3) / 2.5); }
    ctx.save(); const { x, w, h } = insideClip();
    pool(x + w / 2, h + 6, w * 0.46, h * 0.95, rgb, a);
    if (kind === 'ask') { const rim = ctx.createLinearGradient(0, h - visual.radius, 0, h); rim.addColorStop(0, rgba(COLOUR.ask, 0)); rim.addColorStop(1, rgba(COLOUR.ask, 0.45 * a / 0.62)); ctx.strokeStyle = rim; ctx.lineWidth = 1.5; islandPath(x + 0.75, 0, w - 1.5, h - 0.75, visual.radius); ctx.save(); ctx.beginPath(); ctx.rect(x - 20, h - visual.radius, w + 40, visual.radius + 2); ctx.clip(); islandPath(x + 0.75, 0, w - 1.5, h - 0.75, visual.radius); ctx.stroke(); ctx.restore(); }
    ctx.restore();
    return true;
  };
  // music: the cover's colours drift through the black ("Hoes-gloed"), three soft pools that never stand still
  window.__twocodeLuxCover = colour => {
    if (!on()) return false;
    const now = performance.now() / 1000, base = rgbOf(colour || window.__twocodeAlbumColour), two = shift(base, 48, 0.02), three = shift(base, -38, 0.1);
    ctx.save(); const { x, w, h } = insideClip();
    ctx.globalCompositeOperation = 'lighter';
    const drift = (p, amp) => calm() ? 0 : Math.sin(now / p * TAU) * amp;
    pool(x + w * 0.2 + drift(12, w * 0.22), h * 0.62, w * 0.34, h * 1.1, base, 0.62);
    pool(x + w * 0.8 - drift(14, w * 0.24), h * 0.66, w * 0.32, h * 1.05, two, 0.52);
    pool(x + w * 0.48 + drift(10, w * 0.16), h * 0.85, w * 0.24, h * 0.9, three, 0.4);
    ctx.restore();
    return true;
  };
  // "thinking" = a white sheen moving over the words (never a rainbow)
  window.__twocodeLuxSheen = (s, x, y, size, maxW, align = 'left') => {
    if (!on()) return false;
    const now = performance.now();
    ctx.save(); ctx.font = `600 ${size}px Inter, "Segoe UI", sans-serif`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    let t = String(s || ''); while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -2) + '…';
    const tw = ctx.measureText(t).width, x0 = align === 'center' ? x - tw / 2 : align === 'right' ? x - tw : x;
    const p = calm() ? 0.5 : ((now / 2200) % 1), cxs = x0 - tw * 0.4 + p * tw * 1.8;
    const g = ctx.createLinearGradient(cxs - tw * 0.35, 0, cxs + tw * 0.35, 0);
    g.addColorStop(0, 'rgba(255,255,255,.62)'); g.addColorStop(0.5, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,.62)');
    ctx.fillStyle = g; ctx.fillText(t, x, y);
    ctx.restore();
    return true;
  };

  // ---------- light under the island (drawn before its black, so only what spills out below shows) and the material ----------
  window.__twocodeLuxUnder = (x, w, h) => {
    if (!on()) return false;
    const now = performance.now(), s = state(), cx = x + w / 2, m = typeof mode === 'string' ? mode : 'rest';
    ctx.save();
    if (m === 'rest' && !s.working && !s.needsYou && !s.music) pool(cx, h - 2, Math.min(90, w * 0.45), 16, COLOUR.white, 0.1 * (calm() ? 1 : 0.78 + 0.22 * Math.sin(now / 8000 * TAU)));
    if (s.music && m === 'compact' && !s.needsYou) { const base = rgbOf(window.__twocodeAlbumColour), two = shift(base, 48, 0.02); pool(cx - w * 0.06, h + 2, Math.min(150, w * 0.56), 20, base, 0.42 * (calm() ? 1 : 0.8 + 0.2 * Math.sin(now / 3200 * TAU))); pool(cx + w * 0.14, h + 2, Math.min(120, w * 0.42), 18, two, 0.22); }
    if (s.needsYou) pool(cx, h - 2, Math.min(230, w * 0.48), 26, COLOUR.ask, 0.3 * (calm() ? 1 : 0.62 + 0.38 * (0.5 + 0.5 * Math.sin((now - askSince) / 1600 * TAU))));
    const t = (now - doneAt) / 1000; // done: a soft blue ripple spreads out once (a glow, not a stroke)
    if (t >= 0 && t < 1.2 && !calm()) { const k = ease(t / 1.2); pool(cx, h - 2, Math.min(260, w * 0.55) * (0.7 + 0.65 * k), 26 * (0.8 + 0.5 * k), COLOUR.done, 0.5 * (1 - k)); }
    ctx.restore();
    return true;
  };
  window.__twocodeLuxLight = (x, w, h, r) => {
    if (!on()) return false;
    // the faint lower edge (light catching the bottom of the material), never along the top: there it flows into the screen
    ctx.save(); islandPath(x, 0, w, h, r); ctx.clip();
    ctx.beginPath(); ctx.rect(x - 20, Math.max(0, h - Math.max(r, 6)), w + 40, Math.max(r, 6) + 2); ctx.clip();
    islandPath(x + 0.5, 0, w - 1, h - 0.5, r); ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.restore();
    return true;
  };
  // the material's shadow: a little deeper and softer than before (lifts the black off a light desktop)
  window.__twocodeLuxShadow = () => on() ? { color: 'rgba(0,0,0,.5)', blur: mode === 'expanded' ? 40 : 28, y: mode === 'expanded' ? 16 : 10 } : null;

  // ---------- tucked away: "Druppel", a small black drop on a stem with a light orbiting round it (tuck-ui.js) ----------
  window.__twocodeLuxDrop = (now, k) => {
    if (!on()) return null;
    const s = state(), cx = innerWidth / 2, cy = 21, R = 13;
    const rgb = s.working ? [240, 144, 95] : s.done ? [47, 149, 255] : s.music ? shift(rgbOf(window.__twocodeAlbumColour), 0, 0.08) : s.focus ? [183, 140, 255] : COLOUR.white;
    const busy = s.working || s.done || s.music || s.focus, speed = s.working ? 1.6 : s.music ? 2.4 : 3.2;
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.65 * k;
    if (busy) pool(cx, cy + 2, 32, 22, rgb, 0.42);
    ctx.fillStyle = '#000'; ctx.fillRect(cx - 1.5, 0, 3, 10);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
    if (ctx.createConicGradient) {
      const a = calm() ? 0 : (now / 1000 / speed) * TAU, g = ctx.createConicGradient(a, cx, cy);
      g.addColorStop(0, rgba(rgb, 0)); g.addColorStop(0.62, rgba(rgb, 0)); g.addColorStop(0.92, rgba(rgb, busy ? 1 : 0.95)); g.addColorStop(1, rgba(rgb, 0));
      ctx.beginPath(); ctx.arc(cx, cy, R + 1.75, 0, TAU); ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
    }
    const open = calm() ? 1 : openness(now);
    ctx.fillStyle = '#ffffff';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.roundRect(cx + side * 2.6 - 1.75, cy - 2.25 * open, 3.5, Math.max(0.6, 4.5 * open), 1.75); ctx.fill(); }
    ctx.restore();
    return { x: cx - 30, y: 0, width: 60, height: cy + R + 10 }; // where pointing brings Robo back
  };
})();
