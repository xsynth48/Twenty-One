'use strict';
// Game mode: a short "full screen" from Windows may not hide the island (a customer saw Robo go and come back by himself).
const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

function load(others = [], visible = () => true) {
  const handlers = {}, sent = [], onTop = [];
  const win = { isDestroyed: () => false, webContents: { getURL: () => 'file:///mascot.html', send: (c, v) => sent.push(v) }, getBounds: () => ({}), isVisible: visible, setAlwaysOnTop: (...a) => onTop.push(a) };
  const electron = {
    app: { on: (name, fn) => { handlers[name] = fn; } }, ipcMain: { on() {}, handle() {} },
    BrowserWindow: { getAllWindows: () => [win, ...others] },
    screen: { screenToDipPoint: p => p, getDisplayNearestPoint: () => ({ id: 1 }), getDisplayMatching: () => ({ id: 1 }) },
  };
  const real = Module._load;
  Module._load = (name, ...rest) => (name === 'electron' ? electron : real(name, ...rest));
  delete require.cache[require.resolve('../game-mode-main.cjs')];
  const mod = require('../game-mode-main.cjs');
  Module._load = real;
  return { fire: on => handlers['twocode-fullscreen'](on, ''), sent, onTop, mod };
}

test('a blip of "full screen" does not hide the island', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const g = load();
  g.fire(true); t.mock.timers.tick(1000); g.fire(false); t.mock.timers.tick(10000);
  assert.deepEqual(g.sent, []);
  assert.equal(g.mod.fullscreen(), false);
});

test('a game that keeps running hides it, and leaving brings it back', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const g = load();
  g.fire(true); t.mock.timers.tick(3000);
  assert.deepEqual(g.sent, [true]);
  g.fire(false); t.mock.timers.tick(1000); assert.deepEqual(g.sent, [true]);
  t.mock.timers.tick(500); assert.deepEqual(g.sent, [true, false]);
});

test('a blip back to the desktop during a game does not show it', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const g = load();
  g.fire(true); t.mock.timers.tick(3000);
  g.fire(false); t.mock.timers.tick(500); g.fire(true); t.mock.timers.tick(10000);
  assert.deepEqual(g.sent, [true]);
});

test('pointing at the island puts it back on top', () => {
  const g = load();
  g.mod.backOnTop();
  assert.deepEqual(g.onTop, [[true, 'pop-up-menu']]);
});

test('never "floating": Electron puts that below the taskbar, which sinks below a full-screen game', () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const file of ['game-mode-main.cjs', 'island-window-main.js', 'main.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    const calls = src.match(/setAlwaysOnTop\(\s*true,\s*'[^']*'/g) || [];
    assert.ok(!calls.some(c => c.includes("'floating'")), file);
  }
});

test('but not over Robo\'s own layer or the focus guard', () => {
  const g = load([{ isDestroyed: () => false, isVisible: () => true, isAlwaysOnTop: () => true, webContents: { getURL: () => 'file:///guard.html' } }]);
  g.mod.backOnTop();
  assert.deepEqual(g.onTop, []);
});

test('and not while Game mode hides it during a game', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const g = load([], () => false);
  g.fire(true); t.mock.timers.tick(3000);
  g.mod.backOnTop();
  assert.deepEqual(g.onTop, []);
});

test('with Game mode off it stays on top of a full-screen game', t => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const g = load();
  g.fire(true); t.mock.timers.tick(3000);
  g.mod.backOnTop();
  assert.deepEqual(g.onTop, [[true, 'pop-up-menu']]);
});
