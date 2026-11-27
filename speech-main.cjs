// Robo listens himself (11 Nov 2026). Windows' voice typing (Win+H) showed its bar but the words never reached Robo's
// chat; whisper.cpp as a separate program was then blocked by Smart App Control (its ggml.dll is not signed). So now it
// runs INSIDE Twenty-One: a hidden window (hear.html) with Whisper through transformers.js, on the GPU or else the CPU. The
// island records you (chat-ui.js) and sends the sound here; the text goes back.
//   ipc robo:hear-ready → { ready } (the model came once already), robo:hear-prepare → { ok } (progress:
//   'robo:hear-progress' { got, total }), robo:hear { pcm: 16 kHz mono Int16 bytes, lang: the island's, levels } → { ok, text }
// The model leaves memory again 5 minutes after you last talked. Each try leaves one line in userData/robo-hear.log.
const { app, ipcMain, BrowserWindow } = require('electron');
const fs = require('node:fs'), path = require('node:path');

const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const marker = () => path.join(app.getPath('userData'), 'robo-hear.json'); // written once the model came in
// beta 125: the GPU decoder is fp16 now (q4 heard Dutch badly, and was bigger); an older marker means: comes in once more
const LOCAL = 2;
const ready = () => { try { return JSON.parse(fs.readFileSync(marker(), 'utf8')).v === LOCAL; } catch { return false; } };
// Robo Plus (beta 125): the server hears you (Whisper large v3 turbo, far better than the small model here); this PC's own
// model is then only the way back when the server cannot be reached, so it does not need to come in first
const plus = () => { try { return require('./robo-plus-main.cjs'); } catch { return null; } };
const plusOn = () => { try { return Boolean(plus()?.isOn()); } catch { return false; } };

let win = null, idleTimer = null;
function hearWindow() {
  if (win && !win.isDestroyed()) return win;
  win = new BrowserWindow({ show: false, width: 320, height: 240, skipTaskbar: true, webPreferences: { backgroundThrottling: false, contextIsolation: true, sandbox: true } });
  win.loadFile(path.join(__dirname, 'hear.html'));
  win.on('closed', () => { win = null; });
  return win;
}
async function js(code) {
  clearTimeout(idleTimer); // busy: it may not be cleaned up halfway through a download
  const w = hearWindow();
  for (let i = 0; i < 100 && !w.isDestroyed(); i++) { if (!w.webContents.isLoading() && await w.webContents.executeJavaScript('!!window.ready').catch(() => false)) break; await new Promise(r => setTimeout(r, 100)); }
  return w.webContents.executeJavaScript(code);
}
function idle() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (win && !win.isDestroyed()) win.destroy(); win = null; }, 5 * 60 * 1000); }

// the first time: the model comes in (146 MB for the GPU since beta 125, 80 for the CPU), with how far it is; later it only loads
let preparing = null;
function prepare(onProgress) {
  if (plusOn()) return Promise.resolve({ ok: true, device: 'cloud' }); // (the local model then only loads when the server fails)
  if (preparing) return preparing;
  preparing = (async () => {
    const poll = setInterval(() => { js('[window.__got, window.__total]').then(([got, total]) => { if (total > 20e6) onProgress({ got, total }); }).catch(() => {}); }, 400); // (over 20 MB: the small config files first said "100%")
    try {
      const r = await js('window.load()');
      if (r?.ok) { try { fs.writeFileSync(marker(), JSON.stringify({ model: 'onnx-community/whisper-base', v: LOCAL, device: r.device, at: new Date().toISOString() })); } catch {} return { ok: true, device: r.device }; }
      return { ok: false, error: r?.error || 'the model did not load' };
    } finally { clearInterval(poll); idle(); }
  })().catch(error => ({ ok: false, error: String(error?.message || error).slice(0, 200) })).finally(() => { preparing = null; });
  return preparing;
}

// Which language: the island's when you chose one, else your region's (Windows' country: NL → Dutch), else English.
// (Whisper writes what you say in that language; if you speak another one it writes a translation, which Jarvis still
// understands.)
const NAMES = { en: 'english', nl: 'dutch', es: 'spanish', pt: 'portuguese', de: 'german', fr: 'french', hi: 'hindi' };
const REGION = { NL: 'nl', BE: 'nl', SR: 'nl', ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', PT: 'pt', BR: 'pt', DE: 'de', AT: 'de', CH: 'de', FR: 'fr', IN: 'hi' };
function language(island) {
  if (NAMES[island] && island !== 'en') return island;
  let country = ''; try { country = String(app.getLocaleCountryCode() || '').toUpperCase(); } catch {}
  return REGION[country] || 'en';
}
// "[BLANK_AUDIO]", "(music)" mean nothing; a line said twice in a row counts once. Whisper also writes what it learned from
// subtitles when it only hears a room: "MUZIEK." opened the music page by itself on 11 Nov, so those count as nothing heard.
const NOISE = /^(?:muziek|music|musik|musique|m[uú]sica|applaus|applause|gelach|laughter|stilte|silence|you|ondertiteld? .*|ondertiteling.*|.*amara\.org.*|bedankt voor het (?:kijken|luisteren).*|thanks? (?:you )?for watching.*|subtitles? by.*)$/i;
const tidy = t => { const s = String(t || '').replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*|♪+/g, ' ').replace(/\s+/g, ' ').trim().replace(/(.{8,}?[.!?])(?:\s*\1)+/g, '$1');
  return NOISE.test(s.replace(/[\s.!?,…-]+$/, '')) ? '' : s; };
function note(o) {
  try { const f = path.join(app.getPath('userData'), 'robo-hear.log'), line = new Date().toISOString() + ' ' + JSON.stringify(o) + '\n';
    const old = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).slice(-199).join('\n') + '\n' : ''; fs.writeFileSync(f, old + line); } catch {}
}
async function hear({ pcm, lang, levels }) {
  const bytes = Buffer.from(pcm || []); if (bytes.length < 16000) return { ok: true, text: '' }; // under half a second: nothing said
  const clip = bytes.subarray(0, 16000 * 2 * 30), l = language(lang), t0 = Date.now(); // at most 30 s
  let cloudError = '';
  if (plusOn()) { // Plus: the server first; when it fails, this PC's own model (if it is here)
    const c = await plus().hear(clip, l).catch(e => ({ ok: false, error: String(e?.message || e) }));
    if (c?.ok) {
      note({ seconds: +(clip.length / 32000).toFixed(1), levels, lang: c.lang || l, device: 'cloud', ms: Date.now() - t0, text: tidy(c.text).slice(0, 120) });
      return { ok: true, text: tidy(c.text), lang: c.lang || l };
    }
    cloudError = String(c?.error || 'server');
    if (!c?.off && !ready()) { note({ seconds: +(clip.length / 32000).toFixed(1), levels, lang: l, device: 'cloud', ms: Date.now() - t0, error: cloudError.slice(0, 200) }); return { ok: false, error: c?.energy ? (l === 'nl' ? "Robo's energie voor deze maand is op." : 'Robo is out of energy for this month.') : cloudError }; }
  }
  let r; try { r = await js(`window.hear(${JSON.stringify(clip.toString('base64'))}, ${JSON.stringify(NAMES[l])})`); } catch (error) { r = { ok: false, error: String(error?.message || error) }; }
  idle();
  note({ seconds: +(clip.length / 32000).toFixed(1), levels, lang: l, device: r?.device, ms: Date.now() - t0, modelMs: r?.ms, text: tidy(r?.text).slice(0, 120), error: r?.ok ? undefined : String(r?.error || '').slice(0, 200), cloudError: cloudError || undefined });
  if (!r?.ok) return { ok: false, error: String(r?.error || 'listening failed').slice(0, 200) };
  return { ok: true, text: tidy(r.text), lang: l };
}

ipcMain.handle('robo:hear-ready', e => (fromIsland(e) ? { ready: ready() || plusOn() } : null));
ipcMain.handle('robo:hear-prepare', e => {
  if (!fromIsland(e)) return null;
  const wc = e.sender;
  return prepare(p => { if (!wc.isDestroyed()) wc.send('robo:hear-progress', p); });
});
ipcMain.handle('robo:hear', (e, payload) => (fromIsland(e) ? hear(payload || {}) : null));

// beta 113-116 fetched whisper.cpp and a 190 MB model into userData/whisper: no longer used, so it goes
app.whenReady().then(() => setTimeout(() => { try { fs.rmSync(path.join(app.getPath('userData'), 'whisper'), { recursive: true, force: true }); } catch {} }, 20000));

module.exports = { ready, prepare, hear, language, tidy, LOCAL };
