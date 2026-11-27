'use strict';
// Kleurglas (Settings → Island → Material). Beta 98/99 let Windows blur what was behind the island: on the user's laptop a
// flat grey block (battery saver) and, with the charger in, a dull grey plate. Beta 100: tinted glass the island draws
// itself. Beta 102-119: what is behind showed blurred, from a small picture of the screen (backdrop-main.cjs). Beta 120:
// live, clear glass: the island itself is see-through, no picture any more (the user: too grey, not really see-through,
// laggy and old, and taking the picture made the first clicks fall through the island).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('no Windows glass any more: no pane window, nothing in main, preload or game mode', () => {
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'glass-main.cjs')), false);
  for (const f of ['main.js', 'preload.js', 'game-mode-main.cjs']) assert.doesNotMatch(read(f), /glass-main|glass:panes|__twocodeGlass/, f);
  assert.doesNotMatch(read('glass-ui.js'), /glassPanes|backgroundMaterial/);
});

test('beta 120: live glass: the island itself is see-through, never a picture of the screen', () => {
  const html = read('mascot.html'), ui = read('glass-ui.js');
  assert.match(html, /const smoke = window\.__twocodeGlassSmoke\?\.\( visual\.width, visual\.height \), seeThrough = smoke \?\? /);
  assert.match(html, /smoke != null \? window\.__twocodeGlassFill\( share \)/);
  assert.match(html, /window\.__twocodeGlassOver\?\.\( x, visual\.width, visual\.height, visual\.radius \)/);
  assert.doesNotMatch(ui, /backdropShot|drawImage|filter = `blur/); // no picture, no blur of one
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'backdrop-main.cjs')), false);
  assert.doesNotMatch(read('main.js'), /require\('\.\/backdrop-main\.cjs'\)/);
  assert.doesNotMatch(read('preload.js'), /backdropShot/);
  assert.match(read('ai-monitor-ui.js'), /const smoke = window\.__twocodeGlassSmoke\?\.\(0, UI\.COMPACT_H\); if \(smoke != null\) return window\.__twocodeGlassFill\(smoke\);/); // the little side islands too
  assert.match(ui, /__twocodeTintNow/); assert.match(ui, /__twocodeAlbumColour/); // a page's colour, the song's cover
  assert.match(ui, /const g = on\(\); mark\(g\);\n    if \(!g\) return;/); // Black (the default) draws nothing extra
});

test('beta 104: the colour is light from below, not paint over the slab, and the black cards inside turn to glass', () => {
  const ui = read('glass-ui.js');
  assert.doesNotMatch(ui, /addColorStop\(1, rgba\(rgb, 0\.6\)\)/); // the old wash: muddy brown with Claude busy, milky grey when quiet
  assert.match(ui, /ctx\.createRadialGradient\(cx, h \* 1\.32/);
  assert.match(ui, /ctx\.globalCompositeOperation = 'screen'/);
  assert.match(ui, /ctx\.globalCompositeOperation = 'source-over'/); // put back before the edge
  assert.match(ui, /classList\.toggle\('tc-glass', g\)/);
  assert.match(ui, /html\.tc-glass #twocode-tools \.ml-t,html\.tc-glass #twocode-home \.tile\{background-color:var\(--tc-card\)!important/);
});

test('glass colour (beta 103) stays; the glass haze is gone (live glass cannot blur)', () => {
  const fun = read('twocode-fun.js'), ui = read('glass-ui.js');
  assert.match(fun, /glassTint: 'auto'/);
  assert.doesNotMatch(fun, /row\('Glaswaas'/);
  assert.match(fun, /prefs\.material === 'glass' \? row\('Glaskleur'/);
  assert.match(ui, /const want = \(\) => TINTS\[view\(\)\.glassTint\] \|\|/); // a chosen colour wins, 'auto' follows what is going on
});

test('black stays the default, and the see-through slider is there with both materials', () => {
  const fun = read('twocode-fun.js');
  assert.match(fun, /material: 'black'/);
  assert.match(fun, /\n    row\('Doorzichtig', 'Hoeveel je door het eiland heen ziet', slider\('seeThrough', 0, 60, 5\)\),/);
  assert.match(fun, /kleurglas: echt doorzichtig glas waardoor je live ziet wat erachter staat/);
  assert.doesNotMatch(fun, /kleine foto van wat achter het eiland staat/); // no picture to tell about any more
  assert.match(read('i18n-ui.js'), /'Black, or colour glass: real see-through glass, so you see what is behind it live/);
  for (const l of ['de', 'es', 'fr', 'pt', 'hi']) assert.ok(read(`lang/${l}.js`).includes('"Black, or colour glass: real see-through glass, so you see what is behind it live, with a glow in the colour of your music or Claude":'), l);
});

// glass-ui.js run for real, with a made-up clock, canvas and island
function glassIsland() {
  const vm = require('node:vm');
  const shots = [], stops = [];
  const grad = () => ({ addColorStop: (at, c) => stops.push([at, c]) });
  const ctx = new Proxy({ createRadialGradient: grad, createLinearGradient: grad }, { get: (o, k) => o[k] || (() => {}), set: () => true });
  const el = () => ({ style: {}, classList: { toggle() {} }, getContext: () => ctx, appendChild() {} });
  const box = { T: 0, prefs: { material: 'glass', seeThrough: 0 } };
  const window = {
    __twocodeViewPrefs: () => box.prefs,
    twocode: { backdropShot: () => { shots.push(box.T); return Promise.resolve(null); } },
  };
  const sandbox = { window, ctx, mode: 'rest', twocodePointerMovedAt: 0, innerWidth: 760, innerHeight: 330, islandPath() {}, UI: { COMPACT_H: 36 },
    performance: { now: () => box.T }, document: { createElement: el, head: el(), documentElement: el() }, setTimeout, clearTimeout };
  vm.createContext(sandbox);
  vm.runInContext(read('glass-ui.js'), sandbox);
  // the glow's colour this frame: the first stop of the light from below
  const frame = () => { stops.length = 0; window.__twocodeGlassOver(0, 200, 36, 18); return stops.find(s => s[0] === 0)[1]; };
  const run = (ms, fps) => { let c; for (let t = 0; t < ms; t += 1000 / fps) { box.T += 1000 / fps; c = frame(); } return c; };
  return { box, window, sandbox, shots, run };
}
const rgbOf = s => /rgba\((\d+),(\d+),(\d+)/.exec(s).slice(1).map(Number);

test('beta 120: how dark the glass is: see-through, clearer with the slider, thicker when open, nothing with Black', () => {
  const { box, window, sandbox, shots, run } = glassIsland();
  const smoke = (w, h) => window.__twocodeGlassSmoke(w, h);
  const small = smoke(200, 36), open = smoke(600, 300);
  assert.ok(small > 0.5 && small < 0.8, `small island ${small}`); // smoked, not black
  assert.ok(open > small && open <= 0.9, `open island ${open}`); // thicker for text, still see-through
  box.prefs.seeThrough = 60; assert.ok(smoke(200, 36) < 0.4, 'See-through at its most: clear glass');
  box.prefs.seeThrough = 15; const his = smoke(200, 36); assert.ok(his > 0.6 && his < 0.7, `the user's 15: ${his}`);
  assert.match(window.__twocodeGlassFill(0.5), /^rgba\(6,8,12,0\.500\)$/);
  box.prefs.material = 'black'; assert.equal(smoke(200, 36), null);
  // never a picture: with the mouse moving round the island, at rest, small or open
  box.prefs.material = 'glass'; sandbox.islandBounds = { x: 340, y: 0, width: 80, height: 30 };
  for (const mode of ['rest', 'compact', 'expanded']) { sandbox.mode = mode; sandbox.pointer = { known: true, x: 380, y: 120 }; sandbox.twocodePointerMovedAt = box.T; run(3000, 30); }
  assert.equal(shots.length, 0);
});

test('beta 109: closing, the glow fades with the page\'s colour, the same on every PC, and never stays behind it', () => {
  // 107: per frame, so on a PC drawing 15 a second the pink glow stayed in the middle after the rest had gone ("a smaller
  // island inside"); 108: gone at once, but the founder liked the fade ("it makes it look more alive")
  const pink = [236, 72, 153], quiet = [96, 112, 150];
  const near = (c, to, d) => c.every((v, i) => Math.abs(v - to[i]) < d);
  const closing = fps => { const x = glassIsland(); x.sandbox.mode = 'expanded'; x.window.__twocodeTintNow = 'rgb(236,72,153)'; x.run(1500, 60);
    x.sandbox.mode = 'rest'; x.window.__twocodeTintNow = null; return t => rgbOf(x.run(t, fps)); }; // (spotify-ui drops it as it closes)
  for (const fps of [15, 60]) {
    const step = closing(fps), early = step(250);
    assert.ok(!near(early, pink, 20) && !near(early, quiet, 20), `${fps} fps: ${early} after 0.25 s is not a fade`);
    assert.ok(near(step(950), quiet, 12), `${fps} fps: still coloured after 1.2 s`); // gone before the page's colour (about 1.2 s)
  }
  const a0 = closing(15)(500), c0 = closing(60)(500);
  assert.ok(near(a0, c0, 12), `15 fps ${a0} against 60 fps ${c0}`); // the same on every PC
  // and an ordinary change (Claude starts) still glides softly, the same at 15 or 60 frames a second
  const slow = glassIsland(), fast = glassIsland();
  for (const x of [slow, fast]) { x.run(1000, 60); x.window.__twocodeTintNow = 'rgb(249,115,22)'; }
  const a = rgbOf(slow.run(300, 15)), c = rgbOf(fast.run(300, 60));
  assert.ok(a[0] < 230 && Math.abs(a[0] - c[0]) < 10, `15 fps ${a} against 60 fps ${c}`);
});

test('beta 108/109: closing, the page\'s colour hands over to the glass at once and fades by the clock in about 1.2 s', () => {
  const sp = read('spotify-ui.js');
  assert.match(sp, /window\.__twocodeTintNow = want && tintK > 0\.05 \? tintColour : null;/);
  assert.match(sp, /tintK \+= \(strength - tintK\) \* \(1 - Math\.pow\(strength < tintK \? 0\.96 : 0\.88, dt \/ 16\.7\)\);/);
  // 0.96 per 16.7 ms: down to a twentieth in about 1.2 s
  assert.ok(Math.abs(Math.log(0.05) / Math.log(0.96) * 16.7 - 1225) < 50);
});

test('beta 120: "Claude is done" goes to Claude: his window, or his page when you are there already', () => {
  const ui = read('ai-monitor-ui.js'), main = read('ai-monitor-main.cjs');
  assert.match(ui, /else if \(now === 'done'\) tell\('claudeDone', \{[^\n]*open: \(\) => goTo\(/); // the message, not only the page
  assert.match(ui, /if \(p && \['done', 'error'\]\.includes\(p\.state\)\) return goTo\(p\);/); // the small blue island: the same
  assert.match(ui, /if \(!result\?\.ok \|\| result\.already\) return open\(p\.provider, true\);/); // never a click that does nothing
  assert.match(main, /if \(-not \[Twenty-One\.Win\]::IsIconic\(\$h\) -and \(Before\) -eq \$h\) \{ exit 3 \}/);
  assert.match(main, /code === 3 \? 'already'/);
  assert.match(main, /if \(focused === 'already'\) return \{ \.\.\.view\(\), already: true \};/);
  assert.match(main, /\$o -ne \$\{process\.pid\}/); // Twenty-One's own windows (the island you just clicked) don't count
});

test('beta 120: a message\'s icon is lit in its colour, no coloured square behind it', () => {
  const n = read('notify-ui.js'), s = read('settings-app.html');
  assert.doesNotMatch(n, /<span class="sq" style="background:rgb\(\$\{rgb\}\)">/);
  assert.match(n, /<span class="sq" style="--ic:\$\{rgb\};color:rgb\(\$\{lighter\(rgb\)\}\)">/);
  assert.match(n, /#twocode-notice \.sq svg\{stroke-width:2;filter:drop-shadow\(0 0 7px rgba\(var\(--ic\),\.55\)\)\}/);
  assert.doesNotMatch(s, /<span class="np-sq" style="background:rgb\(\$\{rgb\}\)">/); // Settings shows it the same
});
