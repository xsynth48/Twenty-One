'use strict';
// (beta 121) Andrey, app in Spanish: words inside a song's lyrics were translated. Whole lines were kept, but lyrics are also
// drawn in pieces (word by word, wrapped over two lines, cut with "…"). Song text is now drawn inside the pack's raw().
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

function load(words, before) {
  const store = { 'twocode:ui-lang': 'es' }, drawn = [];
  const sandbox = {
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = v; } },
    addEventListener() {}, RegExp, Map, WeakMap, Object,
    document: { documentElement: { lang: '' }, head: { appendChild() {} }, createElement: () => ({}), body: null },
    CanvasRenderingContext2D: class { fillText(s) { drawn.push(s); } strokeText(s) { drawn.push(s); } measureText(s) { return { width: String(s).length, text: s }; } },
  };
  sandbox.window = sandbox;
  vm.runInNewContext(read('lang-pack.js'), sandbox);
  const pack = sandbox.window.__twocodePack;
  if (before) before(pack); // things that happen before the Spanish words have arrived
  sandbox.window.__twocodeLangData?.(words);
  return { pack, ctx: new sandbox.CanvasRenderingContext2D(), drawn };
}
const WORDS = { Home: 'Inicio', Stop: 'Detener', 'Golden hour': 'Hora dorada' };

test('Twenty-One\'s own words on the canvas are still translated', () => {
  const { ctx, drawn } = load(WORDS);
  ctx.fillText('Home');
  assert.deepEqual(drawn, ['Inicio']);
});

test('inside raw() nothing is translated: a lyric word alone, half a line, a cut line', () => {
  const { pack, ctx, drawn } = load(WORDS);
  const out = pack.raw(() => { ctx.fillText('Home'); ctx.fillText('Stop'); ctx.fillText('Golden hour'); return ctx.measureText('Home').text; });
  assert.deepEqual(drawn, ['Home', 'Stop', 'Golden hour']);
  assert.equal(out, 'Home');
  ctx.fillText('Home'); // and after it, translating works again
  assert.equal(drawn.at(-1), 'Inicio');
});

test('raw() also ends when the drawing throws', () => {
  const { pack, ctx, drawn } = load(WORDS);
  assert.throws(() => pack.raw(() => { throw new Error('boom'); }));
  ctx.fillText('Stop');
  assert.equal(drawn.at(-1), 'Detener');
});

test('a song kept before the language\'s words arrived stays its own', () => {
  const { pack } = load(WORDS, p => p.keep('Golden hour', 'Home'));
  assert.equal(pack.t('Golden hour'), 'Golden hour');
  assert.equal(pack.t('Home'), 'Home');
  assert.equal(pack.t('Stop'), 'Detener');
});

test('every place that draws a song\'s words does it inside raw()', () => {
  assert.match(read('lyrics-ui.js'), /__twocodeSongText = draw => \(window\.__twocodePack\?\.raw/);
  assert.match(read('lyrics-ui.js'), /__twocodeLitText = \(s, x, y, at, dim = 0\.38\) => window\.__twocodeSongText\(/);
  assert.match(read('ai-monitor-ui.js'), /const line = \(s, dy, f, lit\) => \(window\.__twocodeSongText/);
  assert.match(read('spotify-ui.js'), /const song = track \? \(window\.__twocodeSongText/);
});
