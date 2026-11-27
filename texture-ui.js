'use strict';
// The Texture pack (a paid app, Settings → Apps; pick a style in Settings → Island): the island lives along with your PC.
// A user's idea, in three styles:
//  - Fire & ice: your CPU and RAM. Over 50% the island melts (dark drips glowing like embers at their tips), over 75%
//    flames lick its sides; under 30% it freezes (an icy rim, frost, icicles). On the resting island with CPU or RAM next
//    to Robo's eyes every side shows its own: a hot RAM side burns while a calm CPU side freezes.
//  - Spider web: the later it gets, the more web in the island's corners; around 2 at night a spider hangs from it; by 7
//    in the morning it is clean again.
//  - Overgrown: the longer you have been at your PC today, the more leaves and vines, and after a long day flowers. After
//    half an hour away (asleep, switched off) it starts again.
// Drawn in the frames the island draws anyway (mascot.html drawIsland): behind it, only outside its edge (drips, icicles,
// flames, webs, vines); on it, under its text (a warm or cold glow, frost and leaves on the rim). Its text stays on top and
// clicks go through: only the island itself catches the mouse. Not bought yet: a style shows while you try it in Settings
// (your draft) and in the examples (Settings → Island, the Store's "See it on your island").
(function texturePack() {
  const api = window.twocode;
  const STYLES = ['fire', 'web', 'grow'];
  const clamp = v => Math.max(0, Math.min(1, v));
  const rnd = i => { const q = Math.sin(i * 127.1 + 311.7) * 43758.5453; return q - Math.floor(q); };
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  const view = () => window.__twocodeViewPrefs?.() || window.__twocodePrefs?.() || {};
  // Settings is open with your draft: what you pick there shows right away (also before you bought the pack: trying it)
  const trying = () => Boolean(window.__twocodeViewPrefs && window.__twocodePrefs && window.__twocodeViewPrefs() !== window.__twocodePrefs());
  const locked = () => Boolean(window.__twocodeLicense?.().locked?.includes('styles'));

  // ---------- examples: what a style looks like when it is that far (Settings → Island → Preview, the Store) ----------
  const DEMOS = {
    'fire:cold': ['fire', { all: 3 }], 'fire:warm': ['fire', { all: 68 }], 'fire:hot': ['fire', { all: 97 }], 'fire:split': ['fire', { split: true }],
    'web:evening': ['web', { web: 0.45 }], 'web:night': ['web', { web: 1 }], 'grow:noon': ['grow', { grow: 0.45 }], 'grow:long': ['grow', { grow: 1 }],
  };
  let demo = null, tourTimers = [];
  function play(name, ms = 8000, stay = false) { // stay: leave the island as it is (videos and tests show the big one too)
    tourTimers.forEach(clearTimeout); tourTimers = [];
    if (name === 'tour') { // the Store: all three, five seconds each
      ['fire:split', 'web:night', 'grow:long'].forEach((n, i) => tourTimers.push(setTimeout(() => show(n, 5200), i * 5000)));
      return;
    }
    show(name, ms, stay);
  }
  function show(name, ms, stay) {
    const d = DEMOS[name]; if (!d) return;
    demo = { style: d[0], v: d[1], until: performance.now() + ms };
    window.__twocodeHoldClosed?.(); // stay small while you watch
    if (mode === 'expanded' && !stay) setMode('rest', false);
    // RAM hot and CPU cold, next to Robo's eyes, also when you show something else there (rest-ui.js)
    window.__twocodeRestFace?.demo?.(d[1].split ? { left: 'ram', right: 'cpu', stats: { ram: 93, cpu: 4 }, ms } : null);
  }
  const demoing = () => Boolean(demo && performance.now() < demo.until);
  api?.onTextureDemo?.(name => play(String(name || '')));

  function style() {
    if (demoing()) return demo.style;
    const s = view().texture;
    if (!STYLES.includes(s)) return null;
    return locked() && !trying() ? null : s; // not bought: only while you try it in Settings
  }

  // ---------- how far: heat (CPU/RAM), the hour, how long you have been at your PC today ----------
  const SESSION = 'twocode:session', AWAY = 30 * 60e3;
  let session = (() => {
    try { const s = JSON.parse(localStorage.getItem(SESSION)); if (s && Date.now() - s.seen < AWAY && s.start <= Date.now()) return s; } catch {}
    return { start: Date.now(), seen: Date.now() };
  })();
  let lastWall = Date.now();
  const keepSession = () => {
    const now = Date.now();
    if (now - lastWall > AWAY) session.start = now; // the PC slept or was off for a while: a new day
    lastWall = now; session.seen = now;
    try { localStorage.setItem(SESSION, JSON.stringify(session)); } catch {}
  };
  keepSession(); setInterval(keepSession, 60e3);
  const lateness = () => { const d = new Date(), h = d.getHours() + d.getMinutes() / 60; return clamp(h >= 19 ? (h - 19) / 7 : h < 2 ? (h + 5) / 7 : h < 7 ? 1 - (h - 2) / 5 : 0); };
  const dayGreen = () => clamp((Date.now() - session.start) / 3.6e6 / 10); // fully grown after 10 hours

  // where the two halves meet and how hot each one is (0–100): next to Robo's eyes every side its own, else the busiest
  function heatTargets() {
    if (demoing() && demo.v.all != null) return { L: demo.v.all, R: demo.v.all, split: null };
    const rf = window.__twocodeRestFace, sides = rf?.sides?.();
    const stats = sides?.values || window.__twocodeSystemStats?.() || null;
    if (mode === 'rest' && rf?.on?.() && sides) {
      const val = k => (k === 'cpu' || k === 'ram') && stats?.[k] != null ? stats[k] : null;
      const l = val(sides.left), r = val(sides.right);
      if (l != null || r != null) return { L: l ?? 50, R: r ?? 50, split: rf.eyesX?.() ?? null };
    }
    const all = stats ? Math.max(stats.cpu || 0, stats.ram || 0) : 50;
    return { L: all, R: all, split: null };
  }
  const now = { L: 50, R: 50, split: null, web: 0, grow: 0, k: 0 };
  let drawn = null; // the style being drawn: another one fades out first, then the new one fades in
  function step(g) {
    const want = style(), slow = 0.06;
    if (drawn !== want) { now.k -= 0.08; if (now.k <= 0) { now.k = 0; drawn = want; } }
    else if (drawn) now.k = Math.min(1, now.k + 0.06);
    if (!drawn) return;
    if (drawn === 'fire') {
      const h = heatTargets(), mid = h.split ?? g.x + g.w / 2;
      now.L += (h.L - now.L) * slow; now.R += (h.R - now.R) * slow;
      now.split = now.split == null ? mid : now.split + (mid - now.split) * 0.2;
    }
    if (drawn === 'web') now.web += ((demoing() && demo.v.web != null ? demo.v.web : lateness()) - now.web) * slow;
    if (drawn === 'grow') now.grow += ((demoing() && demo.v.grow != null ? demo.v.grow : dayGreen()) - now.grow) * slow;
  }

  // ---------- the island's shape, the same as mascot.html islandPath (attached to the edge, or floating) ----------
  function geo() {
    const w = visual.width, h = visual.height, x = innerWidth / 2 - w / 2, floating = Boolean(window.__twocodeFloating?.());
    const r = floating ? Math.max(0, Math.min(visual.radius, w / 2, h / 2)) : Math.max(0, Math.min(visual.radius, w / 2, h));
    return { x, w, h, r, floating, ear: floating ? 0 : Math.max(0, Math.min(10, h / 3, w / 8)),
      room: Math.max(0, innerHeight - h - 4), s: Math.max(1, Math.min(2, h / 34)) };
  }
  function shape(g) {
    const p = new Path2D(), { x, w, h, r, ear } = g;
    if (g.floating) { p.roundRect(x, 0, w, h, r); return p; }
    p.moveTo(x - ear, 0); p.lineTo(x + w + ear, 0); p.quadraticCurveTo(x + w, 0, x + w, ear); p.lineTo(x + w, h - r);
    p.arcTo(x + w, h, x + w - r, h, r); p.lineTo(x + r, h); p.arcTo(x, h, x, h - r, r); p.lineTo(x, ear); p.quadraticCurveTo(x, 0, x - ear, 0);
    p.closePath(); return p;
  }
  const outsideOf = island => { const o = new Path2D(); o.rect(-50, -50, innerWidth + 100, innerHeight + 100); o.addPath(island); return o; };
  // the outline below the top (sides, round corners, bottom) as a line from 0 to 1, with the way out at every point
  function rim(g) {
    const { x, w, h, r } = g, top = g.floating ? r * 0.6 : 2;
    const side = Math.max(0, h - r - top), arc = Math.PI * r / 2, bottom = Math.max(0, w - 2 * r), total = 2 * side + 2 * arc + bottom;
    return { total, at(u) {
      let d = clamp(u) * total;
      if (d < side) return { x, y: top + d, a: Math.PI };
      d -= side;
      if (d < arc) { const th = Math.PI - (d / Math.max(1, arc)) * Math.PI / 2; return { x: x + r + r * Math.cos(th), y: h - r + r * Math.sin(th), a: th }; }
      d -= arc;
      if (d < bottom) return { x: x + r + d, y: h, a: Math.PI / 2 };
      d -= bottom;
      if (d < arc) { const th = Math.PI / 2 - (d / Math.max(1, arc)) * Math.PI / 2; return { x: x + w - r + r * Math.cos(th), y: h - r + r * Math.sin(th), a: th }; }
      d -= arc;
      return { x: x + w, y: h - r - d, a: 0 };
    } };
  }
  // the little islands next to it (Claude on the left, music or the timer on the right): nothing grows into them
  const free = () => ({ left: !(mode === 'compact' && window.__twocodeClaudeBubble), right: !(mode === 'compact' && (window.__twocodeBubbles || []).length) });
  const circle = (p, cx, cy, r) => { p.moveTo(cx + r, cy); p.arc(cx, cy, r, 0, Math.PI * 2); };
  function leaf(p, x, y, a, size) { // a leaf from its stem out, along angle a
    const L = size * 2, wd = size * 0.72, ca = Math.cos(a), sa = Math.sin(a), x1 = x + L * ca, y1 = y + L * sa, mx = (x + x1) / 2, my = (y + y1) / 2;
    p.moveTo(x, y); p.quadraticCurveTo(mx - sa * wd, my + ca * wd, x1, y1); p.quadraticCurveTo(mx + sa * wd, my - ca * wd, x, y); p.closePath();
  }

  // ---------- fire & ice ----------
  function halves(g) {
    const mid = Math.max(g.x + 8, Math.min(g.x + g.w - 8, now.split ?? g.x + g.w / 2)), f = free();
    return [{ side: -1, xa: g.x - 60, xb: mid, v: now.L, edge: g.x, free: f.left }, { side: 1, xa: mid, xb: g.x + g.w + 60, v: now.R, edge: g.x + g.w, free: f.right }]
      .map(o => ({ ...o, hot: clamp((o.v - 50) / 50), fire: clamp((o.v - 75) / 25), cold: clamp((30 - o.v) / 25) }));
  }
  function fireBehind(g, t) {
    const alpha = Math.max(0.8, window.__twocodeIslandAlpha?.() ?? 1);
    for (const o of halves(g)) {
      const lo = Math.max(o.xa, g.x + g.r * 0.7), hi = Math.min(o.xb, g.x + g.w - g.r * 0.7);
      // drips: dark at the island, glowing like embers at their tips
      if (o.hot > 0.01 && hi - lo > 6) {
        const n = Math.max(1, Math.floor((hi - lo) / (13 * g.s))), drips = new Path2D(); let longest = 6;
        for (let i = 0; i < n; i++) {
          const seed = i + (o.side < 0 ? 0 : 50), px = lo + (i + 0.5) * (hi - lo) / n + (rnd(seed) - 0.5) * 4, dw = (5 + 5 * rnd(seed + 3)) * g.s;
          const len = Math.min(g.room - 6, (6 + 30 * rnd(seed + 11)) * g.s * o.hot * (1 + 0.08 * Math.sin(t * 1.3 + i * 1.7)));
          if (len < 1) continue;
          longest = Math.max(longest, len);
          // a drop: wide where it leaves the island, thin in the middle, a round blob at the end (one outline)
          const top = g.h - 4, B = g.h + len;
          drips.moveTo(px - dw * 0.65, top);
          drips.bezierCurveTo(px - dw * 0.42, top + 2, px - dw * 0.36, top + len * 0.35, px - dw * 0.34, B - dw * 0.5);
          drips.bezierCurveTo(px - dw * 0.72, B - dw * 0.1, px - dw * 0.5, B + dw * 0.55, px, B + dw * 0.55);
          drips.bezierCurveTo(px + dw * 0.5, B + dw * 0.55, px + dw * 0.72, B - dw * 0.1, px + dw * 0.34, B - dw * 0.5);
          drips.bezierCurveTo(px + dw * 0.36, top + len * 0.35, px + dw * 0.42, top + 2, px + dw * 0.65, top);
          drips.closePath();
        }
        const gr = ctx.createLinearGradient(0, g.h, 0, g.h + longest + 8 * g.s);
        gr.addColorStop(0, `rgba(0,0,0,${alpha})`); gr.addColorStop(0.55, `rgba(120,30,8,${alpha})`); gr.addColorStop(1, `rgba(255,110,40,${alpha})`);
        ctx.fillStyle = gr; ctx.fill(drips);
        ctx.strokeStyle = `rgba(255,120,50,${(0.3 * o.hot).toFixed(3)})`; ctx.lineWidth = 0.8; ctx.stroke(drips);
      }
      // icicles: clear ice with a light edge, so they show on a dark and on a light desktop
      if (o.cold > 0.01 && hi - lo > 6) {
        const n = Math.max(1, Math.floor((hi - lo) / (9 * g.s))), ice = new Path2D(); let longest = 4;
        for (let i = 0; i < n; i++) {
          const seed = i + (o.side < 0 ? 200 : 260), px = lo + (i + 0.5) * (hi - lo) / n + (rnd(seed) - 0.5) * 3, bw = (3 + 3 * rnd(seed + 5)) * g.s;
          const len = Math.min(g.room - 4, (4 + 16 * rnd(seed + 9)) * g.s * o.cold);
          if (len < 1) continue;
          longest = Math.max(longest, len);
          ice.moveTo(px - bw / 2, g.h - 3); ice.quadraticCurveTo(px - bw * 0.15, g.h + len * 0.6, px, g.h + len); ice.quadraticCurveTo(px + bw * 0.15, g.h + len * 0.6, px + bw / 2, g.h - 3); ice.closePath();
        }
        const gr = ctx.createLinearGradient(0, g.h, 0, g.h + longest);
        gr.addColorStop(0, 'rgba(236,248,255,0.95)'); gr.addColorStop(1, 'rgba(150,205,255,0.55)');
        ctx.fillStyle = gr; ctx.fill(ice);
        ctx.strokeStyle = 'rgba(70,130,190,0.45)'; ctx.lineWidth = 0.8; ctx.stroke(ice);
      }
      // flames along the outer side, with their warm light
      if (o.fire > 0.01 && o.free) {
        const glow = ctx.createRadialGradient(o.edge, g.h * 0.55, 2, o.edge, g.h * 0.55, (22 + g.h * 0.5) * (0.6 + 0.4 * o.fire));
        glow.addColorStop(0, `rgba(255,140,40,${(0.45 * o.fire).toFixed(3)})`); glow.addColorStop(1, 'rgba(255,60,20,0)');
        ctx.fillStyle = glow; ctx.fillRect(o.edge - 90, -10, 180, g.h + 80);
        // tongues of fire of different sizes: they leave the side sideways and curl up (fire rises), each flickers on its
        // own; red outside, orange, a yellow heart; and a few sparks that rise and fade
        const layers = [new Path2D(), new Path2D(), new Path2D()], sparks = new Path2D(), count = 4 + Math.round(g.h / 22), out = o.side;
        for (let i = 0; i <= count; i++) {
          const seed = i + (out < 0 ? 400 : 460), corner = i === count, size = 0.55 + 0.75 * rnd(seed + 2);
          const by = corner ? g.h - g.r * 0.3 : g.h * 0.12 + (i + 0.5 * rnd(seed + 9)) / count * (g.h - g.r * 0.5 - g.h * 0.12);
          const bx = corner ? o.edge - out * g.r * 0.3 : o.edge;
          const flick = 0.72 + 0.3 * Math.sin(t * (8 + 4 * rnd(seed + 6)) + i * 2.1) * Math.sin(t * 13.7 + i * 0.7) + 0.12 * Math.sin(t * 3.1 + i);
          const L = (7 + 9 * size) * g.s * o.fire * flick, bw = (3.5 + 3 * size) * g.s * (0.5 + 0.5 * o.fire);
          const dx = out * (corner ? 0.55 : 0.85), dy = corner ? 0.35 : -0.15;
          for (const [j, k, lk] of [[0, 1, 1], [1, 0.68, 0.78], [2, 0.38, 0.52]]) {
            const l = L * lk, w2 = bw * k / 2;
            const tipX = bx + dx * l * 0.75 + Math.sin(t * 7 + i) * w2 * 0.6, tipY = by + dy * l * 0.75 - l * 0.55;
            const cx = bx + dx * l * 0.45, cy = by + dy * l * 0.45 - l * 0.1, f = layers[j];
            f.moveTo(bx, by - w2);
            f.quadraticCurveTo(cx + out * w2 * 0.2, cy - w2 * 1.6, tipX, tipY);
            f.quadraticCurveTo(cx + out * w2 * 1.4, cy + w2 * 1.2, bx, by + w2);
            f.closePath();
          }
          if (o.fire > 0.3 && !still.matches) {
            const life = (t * 0.9 + rnd(seed + 20)) % 1;
            circle(sparks, bx + out * (4 + 10 * rnd(seed + 21)) * g.s + Math.sin(t * 3 + i) * 2, by - life * (10 + 16 * rnd(seed + 22)) * g.s, (0.8 + 0.6 * rnd(seed + 23)) * (1 - life));
          }
        }
        ['rgba(255,74,20,0.85)', 'rgba(255,150,30,0.9)', 'rgba(255,232,150,0.95)'].forEach((c, j) => { ctx.fillStyle = c; ctx.fill(layers[j]); });
        ctx.fillStyle = 'rgba(255,205,100,0.9)'; ctx.fill(sparks);
      }
    }
  }
  function fireFront(g, island) {
    const parts = halves(g);
    ctx.save(); ctx.clip(island);
    for (const o of parts) { // a warm or a cold glow from that side's bottom corner, under the island's text
      const warm = 0.38 * o.hot + 0.2 * o.fire, cool = 0.32 * o.cold; if (warm < 0.01 && cool < 0.01) continue;
      const rad = Math.max(g.w * 0.55, g.h * 1.3), gr = ctx.createRadialGradient(o.edge, g.h, 2, o.edge, g.h, rad);
      gr.addColorStop(0, warm >= cool ? `rgba(255,80,20,${warm.toFixed(3)})` : `rgba(110,190,255,${cool.toFixed(3)})`);
      gr.addColorStop(1, warm >= cool ? 'rgba(255,80,20,0)' : 'rgba(110,190,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(g.x - 2, 0, g.w + 4, g.h + 2);
    }
    ctx.restore();
    for (const o of parts) { // frozen: an icy rim and frost on it
      if (o.cold < 0.01) continue;
      ctx.save(); ctx.beginPath(); ctx.rect(Math.max(o.xa, g.x - 4), -5, Math.min(o.xb, g.x + g.w + 4) - Math.max(o.xa, g.x - 4), g.h + 10); ctx.clip();
      ctx.strokeStyle = `rgba(200,235,255,${(0.65 * o.cold).toFixed(3)})`; ctx.lineWidth = 1.6 * g.s; ctx.stroke(island);
      ctx.restore();
      const frost = new Path2D(), R = rim(g), n = 4 + Math.round(R.total / (o.free ? 24 : 34));
      for (let i = 0; i < n; i++) {
        const q = R.at((i + rnd(i + 600)) / n);
        if (q.x < o.xa || q.x > o.xb || (!o.free && Math.abs(q.x - o.edge) < 2)) continue;
        const c = (1.6 + 2.4 * rnd(i + 640)) * g.s * o.cold;
        for (let k = 0; k < 3; k++) { const a = k * Math.PI / 3 + rnd(i) * 0.5; frost.moveTo(q.x - Math.cos(a) * c, q.y - Math.sin(a) * c); frost.lineTo(q.x + Math.cos(a) * c, q.y + Math.sin(a) * c); }
      }
      ctx.strokeStyle = 'rgba(232,247,255,0.85)'; ctx.lineWidth = 0.9; ctx.lineCap = 'round'; ctx.stroke(frost);
    }
  }

  // ---------- spider web ----------
  function webBehind(g, t) {
    const web = now.web; if (web < 0.02) return;
    const f = free(), path = new Path2D(), R = Math.min(130, 36 + g.h * 0.35) * web * (g.floating ? 0.8 : 1);
    const corner = (ax, ay, angles) => {
      const sway = Math.sin(t * 0.9) * 0.02, pt = (a, r) => [ax + r * Math.cos(a + sway), ay + Math.min(g.room + g.h - ay, r * Math.sin(a + sway))];
      for (const deg of angles) { const q = pt(deg * Math.PI / 180, R * 1.04); path.moveTo(ax, ay); path.lineTo(q[0], q[1]); }
      for (let k = 1; k <= 6; k++) {
        const r = R * k / 6;
        angles.forEach((deg, j) => {
          const q = pt(deg * Math.PI / 180, r);
          if (!j) { path.moveTo(q[0], q[1]); return; }
          const p0 = pt(angles[j - 1] * Math.PI / 180, r);
          path.quadraticCurveTo(ax + ((p0[0] + q[0]) / 2 - ax) * 0.86, ay + ((p0[1] + q[1]) / 2 - ay) * 0.86, q[0], q[1]);
        });
      }
    };
    if (g.floating) { if (f.left) corner(g.x + 2, g.h / 2, [100, 118, 136, 154, 172, 190]); if (f.right) corner(g.x + g.w - 2, g.h / 2, [80, 62, 44, 26, 8, -10]); }
    else { if (f.left) corner(g.x - g.ear * 0.5, 0, [96, 114, 132, 150, 168, 178]); if (f.right) corner(g.x + g.w + g.ear * 0.5, 0, [84, 66, 48, 30, 12, 2]); }
    if (web > 0.3) for (let i = 0; i < 3; i++) { // a few loose threads under it
      const sx = g.x + g.r + rnd(i + 700) * (g.w - 2 * g.r), len = Math.min(g.room - 2, (5 + 9 * rnd(i + 720)) * g.s * clamp((web - 0.3) / 0.4));
      path.moveTo(sx, g.h); path.quadraticCurveTo(sx + 3 * Math.sin(t + i), g.h + len * 0.6, sx + 1, g.h + len);
    }
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(0,0,0,${(0.18 + 0.2 * web).toFixed(3)})`; ctx.lineWidth = 1.7; ctx.stroke(path); // dark under the white: it shows on a light desktop too
    ctx.strokeStyle = `rgba(255,255,255,${(0.3 + 0.45 * web).toFixed(3)})`; ctx.lineWidth = 0.9; ctx.stroke(path);
  }
  function spider(g, t) {
    const web = now.web; if (web < 0.45 || g.room < 24) return;
    const k = clamp((web - 0.45) / 0.55), sx = g.x + g.w * 0.8;
    const sy = g.h + Math.min(g.room - 10, (12 + 22 * k) * Math.min(g.s, 1.5) + 4 * Math.sin(t * 1.1));
    ctx.save(); ctx.globalAlpha *= k;
    ctx.strokeStyle = 'rgba(220,220,228,0.8)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(sx, g.h); ctx.lineTo(sx, sy - 4); ctx.stroke();
    const legs = new Path2D();
    for (const side of [-1, 1]) for (const j of [-3, -1, 1, 3]) {
      const ky = sy + j * 1.3, wig = Math.sin(t * 4 + j + side) * 0.8;
      legs.moveTo(sx, ky); legs.quadraticCurveTo(sx + side * 7, ky - 4 + wig, sx + side * 11, sy + j * 3.4 + wig);
    }
    ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke(legs);
    ctx.strokeStyle = '#e4e4ea'; ctx.lineWidth = 1.4; ctx.stroke(legs);
    const body = new Path2D(); circle(body, sx, sy + 2, 4.6); circle(body, sx, sy - 3.6, 2.7);
    ctx.fillStyle = '#e4e4ea'; ctx.fill(body); ctx.strokeStyle = 'rgba(30,30,36,0.7)'; ctx.lineWidth = 0.8; ctx.stroke(body);
    ctx.fillStyle = '#ff5a5f'; ctx.beginPath(); ctx.arc(sx - 1.1, sy - 3.9, 0.7, 0, Math.PI * 2); ctx.arc(sx + 1.1, sy - 3.9, 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // ---------- overgrown ----------
  const GREENS = ['#2f7a34', '#4f9f45', '#6cbf5a'];
  function growBehind(g, t) {
    const green = now.grow; if (green < 0.02) return;
    const ls = Math.max(1, Math.min(1.6, g.h / 34)), vines = Math.max(2, Math.min(10, Math.round(g.w / 55)));
    const stem = new Path2D(), leaves = [new Path2D(), new Path2D(), new Path2D()];
    for (let j = 0; j < vines; j++) {
      const grow = clamp(green * 1.3 - rnd(j + 30) * 0.5); if (grow <= 0) continue;
      const vx0 = g.x + g.r + (j + 0.5) * (g.w - 2 * g.r) / vines, len = Math.min(g.room - 4, (14 + 34 * rnd(j + 40)) * ls * grow);
      if (len < 3) continue;
      stem.moveTo(vx0, g.h - 2);
      for (let y = 3; y <= len; y += 3) {
        const vx = vx0 + Math.sin(y / 9 + j + (still.matches ? 0 : t * 0.8)) * 2.6;
        stem.lineTo(vx, g.h - 2 + y);
        if (y % 9 === 0) leaf(leaves[(j + y) % 3], vx, g.h - 2 + y, Math.PI * ((y / 9) % 2 ? 0.15 : 0.85), 2.6 * ls);
      }
    }
    ctx.strokeStyle = '#3d7f37'; ctx.lineWidth = 1.8 * ls; ctx.lineCap = 'round'; ctx.stroke(stem);
    leaves.forEach((p, i) => { ctx.fillStyle = GREENS[i]; ctx.fill(p); });
  }
  function growFront(g, t, island) {
    const green = now.grow; if (green < 0.02) return;
    ctx.save(); ctx.clip(island); // moss from the bottom, under the island's text
    const moss = ctx.createLinearGradient(0, g.h * 0.35, 0, g.h);
    moss.addColorStop(0, 'rgba(40,110,45,0)'); moss.addColorStop(1, `rgba(40,110,45,${(0.45 * green).toFixed(3)})`);
    ctx.fillStyle = moss; ctx.fillRect(g.x, 0, g.w, g.h); ctx.restore();
    const f = free(), R = rim(g), ls = Math.max(1, Math.min(1.6, g.h / 34)), n = Math.max(10, Math.min(70, Math.round(R.total / (10 * ls))));
    const leaves = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < n; i++) {
      const k = clamp((green - rnd(i + 100) * 0.9) / 0.1); if (k <= 0) continue; // they come one by one, all over
      const q = R.at((i + 0.5 + (rnd(i) - 0.5) * 0.8) / n);
      if ((q.x < g.x + 1 && !f.left) || (q.x > g.x + g.w - 1 && !f.right)) continue;
      const a = q.a + (rnd(i + 7) - 0.5) * 1.1 + (still.matches ? 0 : Math.sin(t * 1.2 + i) * 0.07);
      leaf(leaves[i % 3], q.x - Math.cos(q.a) * 1.5, q.y - Math.sin(q.a) * 1.5, a, (3.5 + 3.5 * rnd(i + 3)) * ls * k);
    }
    leaves.forEach((p, i) => { ctx.fillStyle = GREENS[i]; ctx.fill(p); });
    if (green > 0.7) { // after a long day: flowers
      const bloom = clamp((green - 0.7) / 0.3), count = Math.max(2, Math.min(10, Math.round(g.w / 45))), petals = [new Path2D(), new Path2D()], hearts = new Path2D();
      for (let i = 0; i < count; i++) {
        const q = R.at(0.12 + 0.76 * (i + rnd(i + 70)) / count), r = 1.9 * ls * bloom;
        for (let p = 0; p < 5; p++) { const a = p * Math.PI * 2 / 5 + (still.matches ? 0 : t * 0.2); circle(petals[i % 2], q.x + Math.cos(a) * r * 1.25, q.y + Math.sin(a) * r * 1.25, r); }
        circle(hearts, q.x, q.y, r * 0.75);
      }
      ctx.fillStyle = '#ffb3d1'; ctx.fill(petals[0]); ctx.fillStyle = '#fff4f8'; ctx.fill(petals[1]); ctx.fillStyle = '#ffd84a'; ctx.fill(hearts);
    }
  }

  // ---------- into the island's own drawing ----------
  const baseIsland = drawIsland;
  drawIsland = function (...args) {
    const g = geo();
    step(g);
    const fade = now.k * (1 - (window.__twocodeOutro?.() || 0));
    if (!drawn || fade < 0.01) return baseIsland.apply(this, args);
    const t = still.matches ? 0 : performance.now() / 1000, island = shape(g);
    ctx.save(); ctx.globalAlpha *= fade; ctx.clip(outsideOf(island), 'evenodd'); // behind it: only outside its edge
    if (drawn === 'fire') fireBehind(g, t); else if (drawn === 'web') webBehind(g, t); else growBehind(g, t);
    ctx.restore();
    const result = baseIsland.apply(this, args);
    ctx.save(); ctx.globalAlpha *= fade; // on it: under its text (the text is drawn after this)
    if (drawn === 'fire') fireFront(g, island); else if (drawn === 'web') spider(g, t); else growFront(g, t, island);
    ctx.restore();
    return result;
  };

  window.__twocodeTexture = Object.freeze({
    style,                                            // the style that shows now (or null)
    play,                                             // an example: 'fire:hot', 'web:night', 'grow:long', 'tour' …
    wantsStats: () => style() === 'fire',             // rest-ui.js reads CPU and RAM for it too
    locked,
  });
})();
