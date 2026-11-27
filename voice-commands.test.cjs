'use strict';
// Robo's voice commands (voice-commands.js): short commands in the island's languages are done right away;
// questions and long sentences still go to the AI.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { parse, siteKey } = require('../voice-commands.js');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the music: pause, play, next, previous in several languages', () => {
  for (const s of ['pause', 'Pause.', 'Hey Robo, pause the music', 'pauze', 'zet de muziek uit', 'pausa', 'Musik aus', 'mets en pause']) assert.deepEqual(parse(s), { do: 'music', action: 'pause' }, s);
  for (const s of ['next', 'Next song please', 'volgende', 'volgend nummer', 'skip', 'siguiente', 'próxima', 'nächstes Lied', 'suivant', 'अगला गाना']) assert.deepEqual(parse(s), { do: 'music', action: 'next' }, s);
  for (const s of ['previous', 'go back', 'vorige', 'vorig nummer', 'anterior', 'zurück', 'précédent']) assert.deepEqual(parse(s), { do: 'music', action: 'previous' }, s);
  for (const s of ['play', 'resume', 'speel af', 'ga door', 'muziek aan', 'reproducir', 'weiter', 'reprendre']) assert.deepEqual(parse(s), { do: 'music', action: 'play' }, s);
});

test('the volume: louder, softer, mute and back', () => {
  for (const s of ['louder', 'turn it up', 'harder', 'zet het geluid harder', 'más alto', 'lauter', 'plus fort']) assert.deepEqual(parse(s), { do: 'volume', step: 1 }, s);
  for (const s of ['softer', 'quieter', 'turn the volume down', 'zachter', 'leiser', 'baisse le son']) assert.deepEqual(parse(s), { do: 'volume', step: -1 }, s);
  for (const s of ['mute', 'geluid uit', 'stumm', 'silenciar']) assert.deepEqual(parse(s), { do: 'mute', on: true }, s);
  for (const s of ['unmute', 'geluid weer aan', 'ton an']) assert.deepEqual(parse(s), { do: 'mute', on: false }, s);
});

test('open a site or one of your own apps: one word, a nice name back', () => {
  assert.deepEqual(parse('open YouTube'), { do: 'open', name: 'youtube', known: true, said: 'YouTube' });
  assert.deepEqual(parse('Robo, open you tube'), { do: 'open', name: 'youtube', known: true, said: 'YouTube' });
  assert.deepEqual(parse('ga naar netflix.com'), { do: 'open', name: 'netflix', known: true, said: 'Netflix' });
  assert.deepEqual(parse('open chat gpt please'), { do: 'open', name: 'chatgpt', known: true, said: 'ChatGPT' });
  assert.deepEqual(parse('öffne Spotify'), { do: 'open', name: 'spotify', known: true, said: 'Spotify' });
  assert.deepEqual(parse('open mijn rooster'), { do: 'open', name: 'mijnrooster', known: false, said: 'Mijn rooster' }); // (a command only when it is one of your own apps)
  // more than one thing, or a site Robo doesn't know: not a known site, so the AI works it out
  assert.equal(parse('open google en dan yt').known, false);
  assert.equal(parse('open Google and search cheap flights')?.known ?? false, false);
  assert.equal(siteKey('Visual Studio Code'), 'visualstudiocode');
});

test('a timer: with or without minutes, and stopping it', () => {
  assert.deepEqual(parse('start a timer'), { do: 'timer', min: 0 });
  assert.deepEqual(parse('timer 10 minutes'), { do: 'timer', min: 10 });
  assert.deepEqual(parse('zet een timer van vijf minuten'), { do: 'timer', min: 5 });
  assert.deepEqual(parse('focus 25'), { do: 'timer', min: 25 });
  assert.deepEqual(parse('timer for an hour'), { do: 'timer', min: 60 });
  assert.deepEqual(parse('stop the timer'), { do: 'timer', stop: true });
  assert.deepEqual(parse('timer stoppen'), { do: 'timer', stop: true });
});

test('pages of the island', () => {
  assert.deepEqual(parse('show my agenda'), { do: 'page', view: 'agenda' });
  assert.deepEqual(parse('mijn agenda'), { do: 'page', view: 'agenda' });
  assert.deepEqual(parse('open the music'), { do: 'page', view: 'spotify' });
  assert.deepEqual(parse('home'), { do: 'page', view: 'home' });
  assert.deepEqual(parse('mijn mail'), { do: 'page', view: 'mail' });
});

test('questions and long sentences still go to the AI', () => {
  for (const s of ['Can you explain how I pause a video in Premiere Pro?', 'what is the capital of France', 'play drake', 'next week I have an exam, help me plan', 'hoe laat is het', '', '   ']) assert.equal(parse(s), null, s);
});

test('the island loads the commands before the chat, the main side only opens its own list of sites', () => {
  const html = read('mascot.html');
  const a = html.indexOf('<script src="./voice-commands.js">'), b = html.indexOf('<script src="./chat-ui.js">');
  assert.ok(a > 0 && a < b);
  const links = read('links-main.cjs');
  assert.match(links, /ipcMain\.handle\('voice:open'/);
  assert.match(links, /Object\.hasOwn\(SITES/);
  assert.match(read('preload.js'), /voiceOpen: key => ipcRenderer\.invoke\('voice:open'/);
  const chat = read('chat-ui.js');
  assert.match(chat, /if \(!command\(v\)\) heardDo\(v\);/); // (a command first; otherwise the AI)
  assert.match(chat, /if \(c\.do === 'open' && !c\.known && !ownApps\.has\(c\.name\)\) return false;/);
});
