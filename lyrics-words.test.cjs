'use strict';
// Beta 103, a founder's wish, as an option (the user: "it must be a choice"): lyrics word by word, like karaoke.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('off by default, a switch in Settings, translated', () => {
  assert.match(read('twocode-fun.js'), /lyricsWords: false/);
  assert.match(read('twocode-fun.js'), /row\('Woord voor woord', [^\n]*toggle\('lyricsWords'\)\)/);
  assert.match(read('i18n-ui.js'), /'Woord voor woord': 'Word by word'/);
});

test('both places that show lyrics light the words up, only when it is on', () => {
  const ui = read('lyrics-ui.js');
  assert.match(ui, /const wordsOn = \(\) => window\.__twocodePrefs\?\.\(\)\.lyricsWords === true/);
  assert.match(ui, /if \(!wordsOn\(\) \|\| gap \|\| index < 0\) return null/);
  assert.match(read('ai-monitor-ui.js'), /lyric\.text \? lyric\.lit : null/);   // the small island
  assert.match(read('spotify-ui.js'), /lyr && lyr\.lit != null && lyr\.now/);    // the music page
});

test('the words of a line take about 0.42 s each, and never run past the next line', () => {
  // the same sums as lyrics-ui.js lit()
  const lit = (pos, line, next, words) => { const span = Math.max(400, Math.min(next != null ? next - line - 150 : 4000, words * 420 + 300)); return Math.max(0, Math.min(1, (pos - line) / span)); };
  assert.equal(lit(10000, 10000, 13000, 5), 0);
  assert.ok(Math.abs(lit(11200, 10000, 13000, 5) - 1200 / 2400) < 1e-9); // 5 words: 2.4 s
  assert.equal(lit(12400, 10000, 13000, 5), 1);
  assert.equal(lit(10900, 10000, 11000, 8), 1);  // a short gap to the next line: done before it starts
  assert.equal(lit(9000, 10000, 13000, 5), 0);
});
