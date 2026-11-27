'use strict';
// The glass orb (beta 131, 17 Nov 2026): Robo as the small smoked-glass ball the user picked from the canvas "C · Glas"
// (boards MascotGlass, GlassOut, GlassIsland, GlassBuddy, GlassMoods). SECRET like Lux (lux-ui.js): only in launch mode
// (window.__twocodeLaunchMode === true). Off, unknown or offline, every hook here says "not me" and Robo stays as he was.
// - In the island he is the face: smoked glass, a thin rim, a highlight, two white eyes, and what is going on as light
//   inside him (the cover's colours for music, orange Claude, blue done, amber a question, purple Focus, a white swirl
//   while he thinks).
// - A switch (music, Claude at work, done, a question, Focus, a message, listening): he first fills himself with the new
//   colour (a liquid rising inside the glass), then drips out of the island as ink that clears into glass, lands just
//   under it with a small hop, shows the moment and flies back in. Small updates (a song's progress, Focus ticking, the
//   next song) are colour only. There is only one Robo: the island's face is hidden while he is out.
// - Reduced motion or a low battery: the colour only, never the walk, no bopping.
// - Robo Buddy (dragged out of the island) is the orb too: stretched while carried, a white swirl while he reads.
// mascot.html asks __twocodeOrbWobble (every frame: what changed, and the island's gulp when he comes back),
// __twocodeOrbOut (him outside the island), __twocodeOrbBusy (smooth frames while he moves) and __twocodeOrbBuddy
// (drawGhost for the buddy window). lux-ui.js asks __twocodeOrbFace from its eyes and its mark.
(function orb() {
  const on = () => window.__twocodeLaunchMode === true;
  let still = false; try { const q = matchMedia('(prefers-reduced-motion: reduce)'); still = q.matches; q.addEventListener?.('change', e => { still = e.matches; }); } catch {}
  let low = false;
  try { navigator.getBattery?.().then(b => { const check = () => { low = !b.charging && b.level <= 0.2; }; check(); b.addEventListener('chargingchange', check); b.addEventListener('levelchange', check); }).catch(() => {}); } catch {}
  const calm = () => still || low;

  const TAU = Math.PI * 2;
  const clamp01 = x => Math.max(0, Math.min(1, x));
  const ease = x => 1 - Math.pow(1 - clamp01(x), 3);
  const seg = (t, a, b) => clamp01((t - a) / (b - a));
  const bell = u => u <= 0 || u >= 1 ? 0 : Math.sin(Math.PI * u);
  const keys = (t, pts) => { for (let i = 1; i < pts.length; i++) { const [t0, v0] = pts[i - 1], [t1, v1] = pts[i]; if (t <= t1) { const k = (t - t0) / (t1 - t0), e = k * k * (3 - 2 * k); return v0 + (v1 - v0) * e; } } return pts[pts.length - 1][1]; };
  const rgbOf = c => { const m = /(\d+)\D+(\d+)\D+(\d+)/.exec(c || ''); if (m) return [+m[1], +m[2], +m[3]]; const hex = /^#([0-9a-f]{6})$/i.exec(c || ''); if (hex) { const n = parseInt(hex[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; } return [255, 92, 140]; };
  const rgba = (rgb, a) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`;
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  // the cover's colour and two neighbours on the colour wheel (the same as Lux's cover light)
  const shift = (rgb, deg, light = 0) => {
    const [r, g, b] = rgb.map(v => v / 255), max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    let h = 0, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    if (d) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h = ((h * 60 + deg) % 360 + 360) % 360; s = Math.max(s, 0.55); const L = Math.min(0.72, Math.max(0.42, l + light));
    const c = (1 - Math.abs(2 * L - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = L - c / 2;
    const [a, bb, cc] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [a, bb, cc].map(v => Math.round((v + m) * 255));
  };

  // the light inside him per state (the canvas's --c), and how strong it is
  const TONE = {
    rest: { rgb: [190, 210, 255], a: 0.7 }, sleep: { rgb: [150, 170, 230], a: 0.45 },
    work: { rgb: [240, 160, 126], a: 0.95 }, done: { rgb: [47, 149, 255], a: 1 }, ask: { rgb: [255, 179, 64], a: 0.95 },
    focus: { rgb: [160, 110, 255], a: 0.9 }, listen: { rgb: [140, 190, 255], a: 0.9 },
  };
  const MUSIC = [[255, 92, 140], [150, 100, 255], [255, 150, 80]];
  function toneOf(k, fx) {
    if (k === 'music') {
      const c = window.__twocodeAlbumColour;
      if (!c) return { key: 'music:', cycle: MUSIC, a: 0.95 };
      const base = rgbOf(c); return { key: 'music:' + c, cycle: [base, shift(base, 48, 0.02), shift(base, -38, 0.1)], a: 0.95 };
    }
    if (k === 'notice') { const c = window.__twocodeNoticeTone?.(); return { key: 'notice:' + (c || ''), rgb: c ? mix(rgbOf(c), [255, 255, 255], 0.25) : [235, 240, 255], a: 0.9 }; }
    if (k === 'rest' && fx?.mood === 'sleep') return { key: 'sleep', ...TONE.sleep };
    return { key: k, ...(TONE[k] || TONE.rest) };
  }
  const toneRgb = (t, now) => {
    if (!t.cycle) return t.rgb;
    if (calm()) return t.cycle[0];
    const p = ((now / 6000) % 1) * 3, i = Math.floor(p), f = p - i;
    return mix(t.cycle[i % 3], t.cycle[(i + 1) % 3], f * f * (3 - 2 * f));
  };

  // ---------- what is going on, the switches, the fill and the walk ----------
  const FILL = 700, HOLD = 150, SETTLE = 500, END = 4000, DONE_MS = 5200, NOTICE_MS = 5000;
  const BIG = new Set(['done', 'ask', 'notice', 'listen']); // the big moments may walk out again after 2.5 s, the rest after 12 s
  let kind = null, cur = null, fill = null, walk = null, lastWalkEnd = -1e9, ticked = -1e9;
  let doneAt = -1e9, wasDone = null, noticeAt = -1e9, wasNotice = null;
  let face = { x: 0, y: 0, d: 26, at: -1e9 }; // where the island wants its face (also asked while he is out)
  const islandMode = () => typeof mode === 'string' ? mode : '';
  function kindNow(now) {
    const s = window.__twocodeIslandState?.() || {};
    if (s.done && wasDone === false) doneAt = now;
    wasDone = Boolean(s.done);
    const notice = Boolean(window.__twocodeNoticeSize?.());
    if (notice && wasNotice === false) noticeAt = now;
    wasNotice = notice;
    if (window.__twocodeListenPill?.()) return 'listen';
    if (s.needsYou) return 'ask';
    if (s.done && now - doneAt < DONE_MS) return 'done';
    if (notice && now - noticeAt < NOTICE_MS) return 'notice';
    if (s.working) return 'work';
    if (s.focus) return 'focus';
    if (s.music) return 'music';
    return 'rest';
  }
  function mayWalk(k, now) {
    if (k === 'rest' || calm() || walk) return false;
    if (islandMode() === 'expanded') return false; // (the open island: colour only)
    if (window.__twocodeCarried?.() || window.__twocodeTuck?.get?.()) return false; // he is already out, or the island is tucked away
    return now - lastWalkEnd > (BIG.has(k) ? 2500 : 12000);
  }
  function track(now) {
    if (Math.abs(now - ticked) < 4) return; ticked = now;
    const fx = window.__twocodeGhostFx?.() || {}, k = kindNow(now), t = toneOf(k, fx);
    if (kind === null) { kind = k; cur = t; return; } // (the first look is no switch: nothing walks out at start)
    if (k !== kind || t.key !== cur.key) {
      // first the colour: a new fill, or the one still rising simply aims at the new colour (the cover arrives a moment later)
      if (fill && now - fill.at < FILL) fill.to = t; else fill = { from: cur, to: t, at: now };
      if (k !== kind && mayWalk(k, now)) walk = { at: now + FILL + HOLD, kind: k, x: null };
      kind = k; cur = t;
    }
    if (fill && now - fill.at > FILL + HOLD + SETTLE) fill = null;
    if (walk) {
      const w = now - walk.at;
      if (w >= END) { walk = null; lastWalkEnd = now; }
      else if (calm() || islandMode() === 'expanded' || window.__twocodeCarried?.()) { walk = null; lastWalkEnd = now; } // (asked to be calm, opened, or grabbed: straight back)
    }
  }

  // ---------- eyes: blinks, glances ----------
  const blink = { next: 0, at: -1e9 };
  function openness(now) {
    if (calm()) return 1;
    if (!blink.next) blink.next = now + 2200 + Math.random() * 3800;
    if (now >= blink.next) { blink.at = now; blink.next = now + 2600 + Math.random() * 4600; }
    const t = now - blink.at; return t < 0 || t > 150 ? 1 : 1 - 0.9 * Math.sin(Math.PI * t / 150);
  }
  const glance = { from: 0, to: 0, at: 0, next: 0, back: 0 };
  const glanceAt = now => glance.from + (glance.to - glance.from) * ease((now - glance.at) / 260);
  function glanceX(now) {
    if (calm()) return 0;
    if (!glance.next) glance.next = now + 4000 + Math.random() * 5000;
    if (now >= glance.next) { glance.from = glanceAt(now); glance.to = [-1, -0.75, 0.75, 1][Math.floor(Math.random() * 4)]; glance.at = now; glance.back = now + 700 + Math.random() * 700; glance.next = now + 4200 + Math.random() * 5200; }
    if (glance.back && now >= glance.back) { glance.from = glanceAt(now); glance.to = 0; glance.at = now; glance.back = 0; }
    return glanceAt(now);
  }

  // How he looks right now. where: 'in' (the island's face), 'out' (on the screen under it), 'buddy'.
  // Body motion in px of a 30 px orb (the canvas's island size), scaled by s.
  function look(now, where, D) {
    const fx = window.__twocodeGhostFx?.() || {}, talk = window.__twocodeTalking?.() || 0, quiet = calm(), s = D / 30;
    const k = kind || 'rest', mood = fx.mood;
    const L = { dy: 0, sx: 1, sy: 1, rot: 0, swirl: 0, glowA: 0.35, innerK: 1, ring: null, out: where !== 'in',
      eyes: { kind: 'open', sx: 1, sy: 1, dx: 0, dy: 0, open: openness(now) } };
    const E = L.eyes, wave = (ms, lo, hi) => quiet ? (lo + hi) / 2 : lo + (hi - lo) * (0.5 + 0.5 * Math.sin(now / ms * TAU));
    if (k === 'work' || mood === 'focus') { // thinking: a white swirl turns inside him, the eyes read
      L.swirl = 1;
      if (!quiet) { const p = (now % 2200) / 2200; E.dx = (p < 0.5 ? -1.5 + 6 * p : 4.5 - 6 * p) * s; E.dy = p >= 0.5 ? s : 0; }
      if (k === 'work') L.glowA = wave(2200, 0.35, 0.9);
    }
    if (k === 'ask') { E.sx = E.sy = 1.15; E.dy += s; L.glowA = wave(1600, 0.35, 0.9); L.innerK = wave(1600, 0.55, 1); }
    if (k === 'listen') { E.sx = E.sy = 1.08; E.dy += s; L.glowA = wave(1100, 0.45, 1) * 0.6; L.innerK = wave(1100, 0.5, 1); }
    if (k === 'focus') { L.glowA = wave(5000, 0.3, 0.6); L.innerK = wave(5000, 0.5, 1); }
    if (k === 'done') { E.kind = 'happy'; const t = (now - doneAt) / 3000; L.glowA = keys(Math.min(1, t), [[0, 0.25], [0.3, 0.25], [0.38, 1], [0.75, 0.35], [1, 0.35]]); }
    if (k === 'notice' && now - noticeAt < 900) { E.sx = E.sy = 1.3; L.glowA = 0.6; }
    if (k === 'rest' && where !== 'buddy') {
      E.dx = glanceX(now) * 1.5 * s;
      if (!quiet && typeof pointer !== 'undefined' && pointer?.known) E.dx += Math.max(-1, Math.min(1, (pointer.x - face.x) / 320)) * s;
    }
    if (mood === 'sleep') { E.kind = 'closed'; L.innerK = wave(5000, 0.25, 0.85); L.glowA = wave(5000, 0.12, 0.4); if (!quiet && where === 'in') L.dy += 1 + 0.5 * Math.sin(now / 5000 * TAU); }
    if (mood === 'happy' || mood === 'heart') E.kind = 'happy';
    if (mood === 'surprised') { E.sx = E.sy = 1.3; }
    if (mood === 'curious') { E.sx = E.sy = 1.12; E.dx += 1.5 * s; }
    if (mood === 'sad') { E.dy += 1.5 * s; E.open *= 0.7; }
    if (talk) { E.sx *= 1 + talk * 0.08; E.sy *= 1 - talk * 0.38; }
    if (where === 'in' && !quiet) { // the canvas's little moves inside the island
      const t = now / 1000;
      if (k === 'music') { const p = t % 1; L.dy -= 3 * s * Math.abs(Math.sin(p * TAU)); const sq = Math.cos(p * 2 * TAU); L.sx = 1 + 0.03 * sq; L.sy = 1 - 0.03 * sq; }
      if (k === 'ask') { const u = (t % 3.2) / 3.2; L.dy -= 3 * s * (bell(seg(u, 0, 0.12)) + bell(seg(u, 0.12, 0.24))); }
      if (k === 'done') { const u = ((now - doneAt) % 3000) / 3000; L.dy -= Math.min(5, 8 * s) * bell(seg(u, 0.08, 0.36)); const sq = bell(seg(u, 0, 0.12)) * 0.08 - bell(seg(u, 0.12, 0.3)) * 0.05 + bell(seg(u, 0.3, 0.46)) * 0.1; L.sx = 1 + sq; L.sy = 1 - sq; }
    }
    if (!quiet) L.swirlAt = (now / 2200) * TAU;
    else L.swirlAt = 0.6;
    return L;
  }

  // the light inside him: the colour now, or the new colour rising as a liquid over the old one
  function lightOf(now) {
    const t = cur || toneOf('rest');
    if (!fill) return { rgb: toneRgb(t, now), a: t.a };
    const e = now - fill.at, from = { rgb: toneRgb(fill.from, now), a: fill.from.a }, to = { rgb: toneRgb(fill.to, now), a: fill.to.a };
    if (calm()) { const k = seg(e, 0, 250); return { rgb: mix(from.rgb, to.rgb, k), a: from.a + (to.a - from.a) * k }; } // (calm: a quiet change of colour)
    const level = 0.5 - 0.5 * Math.cos(Math.PI * clamp01(e / FILL)), settle = seg(e, FILL + HOLD, FILL + HOLD + SETTLE);
    return { rgb: from.rgb, a: from.a * (1 - level), liquid: { rgb: to.rgb, a: to.a, level, settle, phase: now / 160 }, next: { rgb: to.rgb, a: to.a * settle } };
  }

  function innerPool(D, rgb, a) { // the canvas: left/right 6%, bottom -26%, 74% high, radial closest-side
    if (a <= 0.004) return;
    ctx.save(); ctx.translate(0, 0.39 * D); ctx.scale(0.44 * D, 0.37 * D);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); g.addColorStop(0, rgba(rgb, a)); g.addColorStop(1, rgba(rgb, 0));
    ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
  }
  function eyesOf(D, E) {
    const big = D >= 48; // (the 64 px orb has slightly smaller eyes than the 30 px one in the island)
    const w = D * (big ? 0.125 : 0.14), h = D * (big ? 0.156 : 0.19), gap = D * (big ? 0.125 : 0.13), y0 = D * (big ? -0.016 : -0.042), half = (w + gap) / 2;
    ctx.save();
    ctx.translate(E.dx, y0 + E.dy); ctx.scale(E.sx, E.sy);
    ctx.shadowColor = 'rgba(255,255,255,.35)'; ctx.shadowBlur = Math.min(10, 5 * D / 30);
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#ffffff'; ctx.lineCap = 'round';
    for (const side of [-1, 1]) {
      const x = side * half;
      if (E.kind === 'happy') { const aw = w * 0.68; ctx.beginPath(); ctx.ellipse(x, h * 0.22, aw, aw * 0.85, 0, Math.PI * 1.08, Math.PI * 1.92); ctx.lineWidth = Math.max(1.3, D * 0.053); ctx.stroke(); }
      else if (E.kind === 'closed') { ctx.beginPath(); ctx.moveTo(x - w * 0.56, h * 0.15); ctx.lineTo(x + w * 0.56, h * 0.15); ctx.lineWidth = Math.max(1.2, D * 0.045); ctx.stroke(); }
      else { const eh = Math.max(1, h * E.open); ctx.beginPath(); ctx.roundRect(x - w / 2, -h / 2 + (h - eh) * 0.6, w, eh, Math.min(w, eh) / 2); ctx.fill(); }
    }
    ctx.restore();
  }
  // One orb, centred on (cx, cy), D across. Drawn like the canvas: glow, smoked glass, light inside, swirl, inner shade,
  // rim, eyes, highlight.
  function drawOrb(cx, cy, D, L, now) {
    const r = D / 2, light = lightOf(now), main = light.liquid ? mix(light.rgb, light.liquid.rgb, light.liquid.level) : light.rgb;
    ctx.save();
    ctx.translate(cx, cy + L.dy);
    if (L.rot) ctx.rotate(L.rot);
    if (L.sx !== 1 || L.sy !== 1) { const oy = L.out ? r : 0; ctx.translate(0, oy); ctx.scale(L.sx, L.sy); ctx.translate(0, -oy); } // (on the floor: squashed from the bottom)
    // the glow round him
    const gr = D * (L.out ? 1.04 : 1.07), ga = L.out ? 0.3 : L.glowA;
    if (ga > 0.01) { const g = ctx.createRadialGradient(0, 0, 0, 0, 0, gr); g.addColorStop(0, rgba(main, ga * (L.out ? 1 : 0.9))); g.addColorStop(1, rgba(main, 0)); ctx.fillStyle = g; ctx.fillRect(-gr, -gr, gr * 2, gr * 2); }
    // smoked glass (no desktop blur behind a window like this, so a little darker than the canvas outside the island)
    const body = ctx.createRadialGradient(0, 0.7 * D, 0, 0, 0.7 * D, 1.3 * D);
    if (L.out) { body.addColorStop(0, 'rgba(10,12,24,.34)'); body.addColorStop(0.7, 'rgba(10,12,24,.8)'); body.addColorStop(1, 'rgba(10,12,24,.8)'); }
    else { body.addColorStop(0, 'rgba(30,34,52,.4)'); body.addColorStop(0.7, 'rgba(14,16,28,.85)'); body.addColorStop(1, 'rgba(14,16,28,.85)'); }
    ctx.save();
    if (L.out) { ctx.shadowColor = 'rgba(0,0,0,.4)'; ctx.shadowBlur = 24 * D / 64; ctx.shadowOffsetY = 12 * D / 64; }
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fillStyle = body; ctx.fill();
    ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
    innerPool(D, light.rgb, light.a * L.innerK);
    if (light.liquid) { // the new colour rising like a liquid, its surface catching the light, then settling into the glow
      const q = light.liquid, A = 1 - q.settle, top = r - q.level * D * 1.08, amp = (0.6 + 1.6 * (1 - q.level)) * D / 30;
      if (light.next.a > 0.004) innerPool(D, light.next.rgb, light.next.a * L.innerK);
      if (A > 0.01 && q.level > 0.01) {
        const step = Math.max(2, D / 12), surf = x => top + Math.sin(x / D * 9 + q.phase) * amp;
        ctx.beginPath(); ctx.moveTo(-r - 2, r + 2);
        for (let x = -r - 2; x <= r + 2.01; x += step) ctx.lineTo(x, surf(x));
        ctx.lineTo(r + 2, r + 2); ctx.closePath();
        const g = ctx.createLinearGradient(0, top, 0, r); g.addColorStop(0, rgba(q.rgb, 0.42 * q.a * A)); g.addColorStop(1, rgba(q.rgb, 0.85 * q.a * A));
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); for (let x = -r - 2; x <= r + 2.01; x += step) ctx[x === -r - 2 ? 'moveTo' : 'lineTo'](x, surf(x));
        ctx.strokeStyle = `rgba(255,255,255,${(0.4 * A).toFixed(3)})`; ctx.lineWidth = Math.max(0.8, D / 40); ctx.stroke();
      }
    }
    if (L.swirl > 0 && ctx.createConicGradient) { // thinking: white, never a rainbow
      const g = ctx.createConicGradient(L.swirlAt, 0, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.68, 'rgba(255,255,255,0)'); g.addColorStop(0.86, `rgba(255,255,255,${(0.5 * L.swirl).toFixed(3)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(-r, -r, D, D);
    }
    const shade = ctx.createRadialGradient(0, -0.17 * D, 0.36 * D, 0, -0.17 * D, 0.7 * D); // the inset shade at the bottom
    shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.45)'); ctx.fillStyle = shade; ctx.fillRect(-r, -r, D, D);
    const lit = ctx.createRadialGradient(0, 0.13 * D, 0.4 * D, 0, 0.13 * D, 0.62 * D); // and the faint light along the top
    lit.addColorStop(0, 'rgba(255,255,255,0)'); lit.addColorStop(1, 'rgba(255,255,255,.09)'); ctx.fillStyle = lit; ctx.fillRect(-r, -r, D, D);
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, TAU); ctx.strokeStyle = L.out ? 'rgba(255,255,255,.22)' : 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.stroke();
    eyesOf(D, L.eyes);
    ctx.save(); ctx.translate(-0.13 * D, -0.27 * D); ctx.rotate(-28 * Math.PI / 180); ctx.scale(0.16 * D, 0.092 * D); // the highlight
    const hl = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); hl.addColorStop(0, 'rgba(255,255,255,.85)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl; ctx.fillRect(-1, -1, 2, 2); ctx.restore();
    if (L.ring && L.ring.k < 1) { const k = L.ring.k; ctx.beginPath(); ctx.arc(0, 0, r * (1 + 0.6 * ease(k)), 0, TAU); ctx.strokeStyle = rgba(L.ring.rgb, 0.9 * (1 - k)); ctx.lineWidth = Math.max(1.5, D / 32); ctx.stroke(); }
    ctx.restore();
  }

  // ---------- the island's face (lux-ui.js asks from its eyes and its mark) ----------
  window.__twocodeOrbFace = (cx, cy, size = 1) => {
    if (!on()) return false;
    const now = performance.now();
    track(now);
    const H = typeof islandBounds !== 'undefined' && islandBounds?.height ? islandBounds.height : 34;
    const D = Math.max(14, Math.min(30 * size, H - 10)); // (the canvas: 30 px in a 46 px island; 24 in the 34 px resting one)
    face = { x: cx, y: cy, d: D, at: now };
    let alpha = 1, sink = 0;
    if (walk) { // he sinks out of the face as the ink drips out, and comes back when the island has swallowed him again
      const w = now - walk.at;
      if (w >= 0 && w < 220) { alpha = 1 - w / 220; sink = ease(w / 220) * D * 0.35; }
      else if (w >= 220 && w < 3650) return true;
      else if (w >= 3650) alpha = seg(w, 3650, 3850);
    }
    ctx.save(); ctx.globalAlpha *= alpha;
    drawOrb(cx, cy + sink, D, look(now, 'in', D), now);
    ctx.restore();
    return true;
  };

  // ---------- out on the screen: the walk (drawn after the island, in the same see-through window) ----------
  function ink(x, top, by, r, neck, a) { // the black drop, still joined to the island by a neck that thins and snaps
    if (a <= 0.01 || r <= 0.3) return;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = '#000';
    if (neck > 0.02 && by - r * 0.55 > top - 2) {
      const nw = r * (0.35 + 0.75 * neck), flare = r * 0.9 * neck, mid = (top + by) / 2;
      ctx.beginPath(); ctx.moveTo(x - nw - flare, top - 1);
      ctx.quadraticCurveTo(x - nw * 0.45, mid, x - r * 0.62, by - r * 0.55); ctx.lineTo(x + r * 0.62, by - r * 0.55);
      ctx.quadraticCurveTo(x + nw * 0.45, mid, x + nw + flare, top - 1); ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, by, r, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // the moment itself (1.4 s): each switch its own little act (px of the canvas's 64 px orb, scaled by s)
  function moment(k, m, s, L, now) {
    const E = L.eyes, rgb = toneRgb(cur || toneOf(k), now);
    if (k === 'done') { E.kind = 'happy'; const b = bell(seg(m, 80, 620)); L.dy -= 16 * s * b; const sq = bell(seg(m, 0, 80)) * 0.08 + bell(seg(m, 620, 720)) * 0.1 - b * 0.05; L.sx = 1 + sq; L.sy = 1 - sq; L.ring = { k: seg(m, 0, 760), rgb }; }
    else if (k === 'ask') { const kn = t => bell(seg(t, 0, 200)); L.dy -= 5 * s * (kn(m) + kn(m - 260) + kn(m - 800) + kn(m - 1060)); E.sx = E.sy = 1.15; E.dy = -2.2 * s; } // knocks, looking up at the question
    else if (k === 'notice') { const b = bell(seg(m, 0, 420)); L.dy -= 12 * s * b; L.sx = 1 - 0.06 * b; L.sy = 1 + 0.06 * b; if (m < 900) E.sx = E.sy = 1.3; L.ring = { k: seg(m, 0, 760), rgb }; }
    else if (k === 'listen') { L.dy -= 2 * s * ease(seg(m, 0, 300)); E.dy = -2 * s; }
    else if (k === 'work') { L.dy -= 1.5 * s * Math.abs(Math.sin(m / 300)); }
    else if (k === 'focus') { const b = Math.sin(m / 2500 * TAU); L.sx = L.sy = 1 + 0.025 * b; E.open = 0.55; }
    else if (k === 'music') { const p = (m % 1200) / 1200; L.rot = -0.14 * Math.cos(p * TAU); L.dy -= 9 * s * Math.abs(Math.sin(p * TAU)); const sq = 0.03 * Math.cos(p * 2 * TAU); L.sx = 1 + sq; L.sy = 1 - sq; E.sy *= 0.5; }
    else { E.kind = 'happy'; }
  }
  window.__twocodeOrbOut = now => {
    if (!on() || !walk || typeof islandBounds === 'undefined' || !islandBounds) return false;
    const w = now - walk.at;
    if (w < 0 || w >= END) return false;
    const H = islandBounds.height, mid = islandBounds.x + islandBounds.width / 2;
    const home = now - face.at < 400 ? face.x : mid; // where the island wants its face back
    if (walk.x == null) walk.x = home;
    const x0 = Math.max(islandBounds.x + 24, Math.min(islandBounds.x + islandBounds.width - 24, walk.x));
    const room = (typeof innerHeight === 'number' && innerHeight > 0 ? innerHeight : 320) - H - 34;
    const D = Math.max(36, Math.min(64, room)), s = D / 30, gap = 20 * D / 64, restY = H + gap + D / 2, dripY = H + D * 0.3;
    // 1. the ink drop pulls out of the island and lets go
    if (w < 520) { const p = ease(seg(w, 0, 450)), r = D * (0.1 + 0.11 * p); ink(x0, H, H - r * 0.5 + (dripY - H + r * 0.5) * p, r, w < 410 ? 1 - seg(w, 0, 410) : 0, w < 380 ? 1 : 1 - seg(w, 380, 520)); }
    // 4. back in: the island swallows the last of the ink
    if (w >= 3540) { const k = seg(w, 3540, 3800), r = D * 0.15 * (1 - ease(k)); ink(home, H, H + r * 0.6 * (1 - k), r, 1, 1); }
    if (w < 380 || w >= 3650) return true;
    // 2. the ink clears into glass, falls, lands with a squash and one small hop; the moment; a look round; back up
    const kk = kind && kind !== 'rest' ? kind : walk.kind, L = look(now, 'out', D);
    let x = x0, y = restY, sc = 1, a = 1;
    if (w < 520) { const c = seg(w, 380, 520); a = c; sc = 0.62 + 0.28 * ease(c); y = dripY; }
    else if (w < 880) { const e = ease(seg(w, 520, 880)); y = dripY + (restY - dripY) * e; sc = 0.9 + 0.1 * e; }
    else if (w < 1000) { const b = bell(seg(w, 880, 1000)); L.sx = 1 + 0.09 * b; L.sy = 1 - 0.1 * b; }
    else if (w < 1320) { const b = bell(seg(w, 1000, 1320)); y -= 14 * D / 64 * b; L.sx = 1 - 0.04 * b; L.sy = 1 + 0.04 * b; }
    else if (w < 1400) { const b = bell(seg(w, 1320, 1400)); L.sx = 1 + 0.06 * b; L.sy = 1 - 0.07 * b; }
    else if (w < 2800) moment(kk, w - 1400, D / 64, L, now);
    else if (w < 3150) L.eyes.dx = 0.09 * D * keys(seg(w, 2800, 3150), [[0, 0], [0.15, -1], [0.45, -1], [0.6, 1], [0.9, 1], [1, 0]]);
    else if (w < 3250) { const b = bell(seg(w, 3150, 3250)); L.sx = 1 + 0.07 * b; L.sy = 1 - 0.08 * b; }
    else { const u = seg(w, 3250, 3650), e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, b = bell(u);
      x = x0 + (home - x0) * e; y = restY + (H + D * 0.08 - restY) * e; sc = 1 - 0.55 * e; a = 1 - seg(w, 3520, 3650); L.sx = 1 - 0.03 * b; L.sy = 1 + 0.05 * b; }
    ctx.save(); ctx.globalAlpha *= a;
    ctx.translate(x, y); ctx.scale(sc, sc);
    drawOrb(0, 0, D, L, now);
    ctx.restore();
    return true;
  };
  // the island gulps him back in: a little wider for a moment (the canvas: 188 → 204 → 184 → 188)
  window.__twocodeOrbWobble = now => {
    if (!on()) return 0;
    track(now);
    if (!walk) return 0;
    const w = now - walk.at;
    return w < 3600 || w > 4000 ? 0 : keys(seg(w, 3600, 4000), [[0, 0], [0.35, 16], [0.65, -4], [1, 0]]);
  };
  // smooth frames (60 a second) only while something moves: the fill and the walk
  window.__twocodeOrbBusy = now => on() && Boolean(walk || (fill && now - fill.at < FILL + HOLD + SETTLE));

  // ---------- Robo Buddy: the orb on your screen (buddy-ui.js draws him for the buddy window through drawGhost) ----------
  let dragAt = -1e9, wasDragging = false;
  window.__twocodeOrbBuddy = (x, y, diameter = 112) => {
    if (!on()) return false;
    const now = performance.now();
    track(now);
    const D = 72 * diameter / 112, L = look(now, 'buddy', D), mood = (window.__twocodeGhostFx?.() || {}).mood, quiet = calm();
    const dragging = Boolean(window.__twocodeDragging?.());
    if (dragging && !wasDragging) dragAt = now;
    wasDragging = dragging;
    if (dragging && !quiet) { // picked up: a squash, then he stretches and sways in your hand
      const t = now - dragAt, sq = bell(seg(t, 0, 140)) * 0.1, st = ease(seg(t, 120, 320)) * 0.1;
      L.sx = 1 + sq - st; L.sy = 1 - sq + st * 1.2; L.rot = Math.sin(now / 420) * 0.07; L.eyes.sx = L.eyes.sy = 1.12;
    } else if (!quiet) L.dy = Math.sin(now / 1600 * TAU) * 1.5; // resting: he floats a little
    if (mood === 'focus') { L.swirl = 1; L.glowA = 0.6; } // reading a window: the white swirl turns (the lens is buddy.html's)
    L.out = true;
    drawOrb(x, y - 3 * diameter / 112, D, L, now);
    return true;
  };

  // for the tests: what he is doing now
  window.__twocodeOrbNow = () => ({ kind, fill: fill ? { at: fill.at, to: fill.to.key } : null, walk: walk ? { at: walk.at, kind: walk.kind } : null });
})();
