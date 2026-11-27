'use strict';
// Extras for the island (main process): file tray, calendar (ICS link), weather (Open-Meteo),
// volume changes and Bluetooth battery levels. Only the Twenty-One window may use these channels.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { fileURLToPath } = require('node:url');

const POWERSHELL = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
const BLANK_PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

function setup(electron) {
  const { app, ipcMain, shell, nativeImage, BrowserWindow } = electron;
  const file = name => path.join(app.getPath('userData'), name);
  const readJson = (name, fallback) => { try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return fallback; } };
  const writeJson = (name, value) => { try { fs.writeFileSync(file(name), JSON.stringify(value)); } catch {} };
  const trusted = event => {
    try { return path.resolve(fileURLToPath(event.sender.getURL())).toLowerCase() === path.join(__dirname, 'mascot.html').toLowerCase(); }
    catch { return false; }
  };
  const handle = (channel, fn) => ipcMain.handle(channel, async (event, payload) => {
    if (!trusted(event)) return { ok: false, error: 'Geen toegang.' };
    try { return { ok: true, ...(await fn(payload, event)) }; } catch (error) { return { ok: false, error: error.message }; }
  });
  const send = (channel, data) => { for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed() && trusted({ sender: win.webContents })) win.webContents.send(channel, data); };

  // ---------- file tray: remembers paths of files you drop on the island ----------
  let tray = readJson('tray.json', []).filter(p => typeof p === 'string' && fs.existsSync(p));
  const icons = new Map();
  const trayView = async () => ({ files: await Promise.all(tray.map(async p => {
    let icon = icons.get(p);
    if (!icon) { try { icon = await app.getFileIcon(p, { size: 'normal' }); icons.set(p, icon); } catch {} }
    let size = 0; try { size = fs.statSync(p).size; } catch {}
    return { path: p, name: path.basename(p), icon: icon ? icon.toDataURL() : '', size };
  })) });
  handle('extras:tray-get', trayView);
  handle('extras:tray-add', async payload => {
    for (const p of (Array.isArray(payload?.paths) ? payload.paths : []).slice(0, 20)) {
      if (typeof p === 'string' && path.isAbsolute(p) && fs.existsSync(p) && !tray.includes(p)) tray.unshift(p);
    }
    tray = tray.slice(0, 24); writeJson('tray.json', tray); return trayView();
  });
  // Twenty-One Drop (drop-main.cjs): it sends what is in the tray to your phone, and what your phone sends comes in here
  app.twocodeTray = () => tray.slice();
  app.on('twocode-tray-add', paths => {
    for (const p of (Array.isArray(paths) ? paths : []).slice(0, 20)) if (typeof p === 'string' && path.isAbsolute(p) && fs.existsSync(p) && !tray.includes(p)) tray.unshift(p);
    tray = tray.slice(0, 24); writeJson('tray.json', tray);
  });
  handle('extras:tray-remove', async payload => { tray = tray.filter(p => p !== payload?.path); writeJson('tray.json', tray); return trayView(); });
  handle('extras:tray-open', async payload => {
    if (!tray.includes(payload?.path)) throw new Error('Dit bestand staat niet in de lade.');
    const problem = await shell.openPath(payload.path); if (problem) throw new Error(problem); return {};
  });
  ipcMain.on('extras:tray-drag', (event, p) => {
    if (!trusted(event) || !tray.includes(p) || !fs.existsSync(p)) return;
    event.sender.startDrag({ file: p, icon: icons.get(p) || nativeImage.createFromDataURL(BLANK_PNG) });
  });

  // ---------- settings for calendar and weather ----------
  let config = readJson('extras.json', { calendarUrl: '', city: '' });
  handle('extras:config', async payload => {
    if (payload && typeof payload === 'object') {
      if (typeof payload.calendarUrl === 'string') {
        const url = payload.calendarUrl.trim().replace(/^webcal:/i, 'https:');
        if (url && !/^https:\/\//i.test(url)) throw new Error('Plak een https- of webcal-link van je agenda.');
        config.calendarUrl = url; calendarCache = null;
      }
      if (typeof payload.city === 'string') { config.city = payload.city.trim().slice(0, 80); weatherCache = null; }
      writeJson('extras.json', config);
    }
    return { config };
  });

  // ---------- calendar: next event from an ICS link (Google: "Geheim adres in iCal-indeling") ----------
  let calendarCache = null;
  async function upcoming() {
    if (!calendarCache || Date.now() - calendarCache.at > 10 * 60000) {
      const res = await fetch(config.calendarUrl, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) throw new Error('Agenda niet bereikbaar (' + res.status + ').');
      calendarCache = { at: Date.now(), events: parseIcs(await res.text()) };
    }
    const now = Date.now(), list = [];
    for (const e of calendarCache.events) for (const start of occurrences(e, now, now + 60 * 864e5)) list.push({ title: e.title, start, allDay: e.allDay });
    return list.sort((a, b) => a.start - b.start);
  }
  // V3: the Agenda page draws the whole day and the month, so it also needs what was earlier today and how long things last
  async function agendaEvents() {
    if (!calendarCache || Date.now() - calendarCache.at > 10 * 60000) await upcoming();
    const from = new Date(); from.setHours(0, 0, 0, 0); const f = from.getTime(), list = [];
    for (const e of calendarCache.events) for (const start of occurrences(e, f, f + 62 * 864e5)) list.push({ title: e.title, start, end: start + (e.duration || 3600000), allDay: e.allDay });
    return list;
  }
  const google = require('./google-main.cjs'); // signed in with Google: your events come from there, new ones go there
  handle('extras:calendar', async () => {
    if (google.on('calendar')) { const now = Date.now(), next = (await google.events()).find(e => e.end > now && !e.allDay) || null; return { next: next && { title: next.title, start: next.start, allDay: false } }; }
    if (!config.calendarUrl) return { next: null };
    const next = (await upcoming())[0] || null;
    return { next: next && { title: next.title, start: next.start, allDay: next.allDay } };
  });
  // (beta 80) Linking Google Calendar: its settings open in your browser, where you copy the secret link (read-only). The page sees that
  // link on the clipboard and links it by itself (tools-ui.js).
  handle('extras:google-calendar', async () => { await shell.openExternal('https://calendar.google.com/calendar/u/0/r/settings'); return {}; });
  // (beta 80) the Agenda page (tools-ui.js)
  // Events you add yourself: kept on this PC until Twenty-One can write to your Google Calendar (needs the Google login)
  let ownEvents = readJson('agenda-own.json', { events: [] }).events || [];
  const saveOwn = () => writeJson('agenda-own.json', { events: ownEvents });
  handle('extras:agenda', async () => {
    const g = google.status(), viaGoogle = google.on('calendar');
    const out = { linked: viaGoogle || Boolean(config.calendarUrl), google: { available: g.available, on: viaGoogle, email: g.email }, events: [], calendarFailed: false };
    if (viaGoogle) try { out.events = await google.events(); } catch { out.calendarFailed = true; }
    else if (config.calendarUrl) try { out.events = await agendaEvents(); } catch { out.calendarFailed = true; }
    const start = new Date(); start.setHours(0, 0, 0, 0);
    ownEvents = ownEvents.filter(e => e.end >= start.getTime());
    out.events = [...out.events, ...ownEvents.map(e => ({ ...e, own: true }))].sort((a, b) => a.start - b.start).slice(0, 400);
    return out;
  });
  handle('extras:agenda-add', async e => {
    const title = String(e?.title || '').trim().slice(0, 120), start = Number(e?.start), end = Number(e?.end);
    if (!title || !(start > 0) || !(end > start)) return { ok: false };
    if (google.on('calendar')) return google.addEvent({ title, start, end }).catch(() => ({ ok: false }));
    ownEvents.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title, start, end }); saveOwn();
    return { ok: true };
  });
  handle('extras:agenda-remove', async id => { ownEvents = ownEvents.filter(e => e.id !== id); saveOwn(); return { ok: true }; });

  // ---------- weather (Open-Meteo, no account needed) ----------
  let weatherCache = null;
  handle('extras:weather', async () => (config.city ? { weather: await weatherNow() } : { weather: null }));
  async function weatherNow() {
    if (!weatherCache || Date.now() - weatherCache.at > 15 * 60000) {
      const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?count=1&language=nl&name=' + encodeURIComponent(config.city), { signal: AbortSignal.timeout(8000) })).json();
      const place = geo?.results?.[0]; if (!place) throw new Error('Stad niet gevonden.');
      const data = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,weather_code,is_day`, { signal: AbortSignal.timeout(8000) })).json();
      weatherCache = { at: Date.now(), weather: { place: place.name, temp: Math.round(data.current.temperature_2m), code: data.current.weather_code, day: data.current.is_day === 1 } };
    }
    return weatherCache.weather;
  }

  // ---------- volume: a small PowerShell helper reports every change of the master volume ----------
  let volumeChild = null, volumeNow = null;
  // the volume block on the home screen sets the Windows volume (0-100) through the same helper
  handle('extras:volume-set', async payload => {
    const level = Math.max(0, Math.min(100, Math.round(Number(payload?.level))));
    if (!Number.isFinite(level)) throw new Error('Volume niet beschikbaar.');
    if (!process.env.REC_OUT) { require('./media-main.cjs').volumeSet(level); return {}; } // the music helper sets it
    if (!volumeChild?.stdin) throw new Error('Volume niet beschikbaar.');
    volumeChild.stdin.write(`set ${level}
`); return {};
  });
  handle('extras:volume-get', async () => ({ volume: volumeNow }));
  function startVolume() {
    if (process.platform !== 'win32' || volumeChild) return;
    // Normally the music helper (media-session.ps1) watches the volume too: one PowerShell less. Test recordings keep
    // this separate watcher, which the recorder replaces with pretend reports.
    if (!process.env.REC_OUT) { require('./media-main.cjs').volume(v => { volumeNow = v; send('extras:volume', volumeNow); }); return; }
    volumeChild = spawn(POWERSHELL, ['-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'volume-watch.ps1'), '-Parent', String(process.pid)],
      { windowsHide: true, shell: false, stdio: ['pipe', 'pipe', 'ignore'] });
    volumeChild.stdin?.on?.('error', () => {});
    let buffer = '';
    volumeChild.stdout.on('data', chunk => {
      buffer += chunk.toString();
      let end; while ((end = buffer.indexOf('\n')) >= 0) {
        const [level, muted] = buffer.slice(0, end).trim().split(' '); buffer = buffer.slice(end + 1);
        if (level !== undefined && level !== '') { volumeNow = { level: Number(level), muted: muted === '1' }; send('extras:volume', volumeNow); }
      }
    });
    volumeChild.on('exit', () => { volumeChild = null; });
  }

  // ---------- Bluetooth battery levels (headphones, mouse, ...) every 5 minutes ----------
  const BT_SCRIPT = `$k='{104EA319-6EE2-4701-BD47-8DDBF425BBE5} 2'
Get-PnpDevice -Class Bluetooth -Status OK -ErrorAction SilentlyContinue | ForEach-Object {
  $b = (Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName $k -ErrorAction SilentlyContinue).Data
  if ($b -ne $null) { "$b|$($_.FriendlyName)" } }`;
  function readBluetooth() {
    if (process.platform !== 'win32') return;
    const child = spawn(POWERSHELL, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', BT_SCRIPT], { windowsHide: true, shell: false });
    let out = ''; child.stdout.on('data', d => { out += d; });
    child.on('exit', () => {
      const devices = out.split(/\r?\n/).map(line => line.split('|')).filter(([b, n]) => n && /^\d+$/.test(b)).map(([b, n]) => ({ name: n.trim(), battery: Number(b) }));
      send('extras:bluetooth', { devices });
    });
    child.on('error', () => {});
  }

  // ---------- clipboard history: your last 8 copied texts (only in memory, never saved to disk) ----------
  let clips = [], lastClip = '';
  const copiedAt = new Map(); // text → when it was copied
  const clipsView = () => ({ clips: clips.map(text => ({ text: text.slice(0, 400), long: text.length > 400, at: copiedAt.get(text) || 0 })) });
  async function readClipboard() {
    // readText can give a string or a promise (newer Electron); anything else is ignored.
    let text = ''; try { const r = electron.clipboard.readText(); text = typeof r === 'string' ? r : r && typeof r.then === 'function' ? await r : ''; } catch {}
    if (typeof text !== 'string' || !text || text === lastClip) return; lastClip = text;
    if (!text.trim() || text.length > 20000) return;
    clips = [text, ...clips.filter(c => c !== text)].slice(0, 8); copiedAt.set(text, Date.now());
    for (const key of copiedAt.keys()) if (!clips.includes(key)) copiedAt.delete(key);
    send('extras:clips', clipsView());
  }
  handle('extras:clips-get', async () => clipsView());
  handle('extras:clips-copy', async payload => {
    const text = clips[Number(payload?.index)]; if (typeof text !== 'string') throw new Error('Niet gevonden.');
    electron.clipboard.writeText(text); lastClip = text; clips = [text, ...clips.filter(c => c !== text)]; copiedAt.set(text, Date.now()); return clipsView();
  });
  handle('extras:clips-clear', async () => { clips = []; return clipsView(); });

  // ---------- quick note: one note, saved on your PC ----------
  handle('extras:note-get', async () => ({ text: readJson('note.json', { text: '' }).text || '' }));
  handle('extras:note-set', async payload => { writeJson('note.json', { text: String(payload?.text || '').slice(0, 20000) }); return {}; });

  // (the keyboard shortcuts that jump straight to a screen live in shortcuts-main.cjs)

  app.whenReady().then(() => {
    const poll = setInterval(() => { readClipboard().catch(() => {}); }, 1000); poll.unref?.();
    startVolume();
    setTimeout(readBluetooth, 15000); const bt = setInterval(readBluetooth, 5 * 60000); bt.unref?.();
  });
  app.on('before-quit', () => { try { volumeChild?.kill(); } catch {} });
}

// ---------- tiny ICS reader: what a Google Calendar holds. Titles and times (also in another time zone), repeats
// (DAILY, WEEKLY with its days, MONTHLY, YEARLY, COUNT, UNTIL, EXDATE), and single dates of a repeat that were changed or cancelled ----------
function parseIcs(text) {
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/), events = [];
  const zone = head => /;TZID="?([^;:"]+)/.exec(head)?.[1];
  let event = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') event = {};
    else if (line === 'END:VEVENT') { if (event?.start) events.push(event); event = null; }
    else if (event) {
      const colon = line.indexOf(':'); if (colon < 0) continue;
      const head = line.slice(0, colon), value = line.slice(colon + 1), name = head.split(';')[0];
      if (name === 'SUMMARY') event.title = value.replace(/\\([,;\\])/g, '$1').replace(/\\n/gi, ' ').slice(0, 120);
      if (name === 'DTSTART') { event.start = icsDate(value, zone(head)); event.allDay = /VALUE=DATE(?!-)/.test(head) || /^\d{8}$/.test(value); }
      if (name === 'DTEND') event.end = icsDate(value, zone(head));
      if (name === 'RRULE') event.rrule = value;
      if (name === 'EXDATE') (event.skip ||= []).push(...value.split(',').map(v => icsDate(v, zone(head))));
      if (name === 'RECURRENCE-ID') event.changes = icsDate(value, zone(head));
      if (name === 'UID') event.uid = value;
      if (name === 'STATUS') event.cancelled = value === 'CANCELLED';
    }
  }
  for (const e of events) e.duration = e.end ? Math.max(0, e.end - e.start) : 0;
  // one date of a repeat changed or cancelled: the repeat leaves that date out (a changed one is its own event here)
  const repeats = new Map(events.filter(e => e.rrule && e.uid).map(e => [e.uid, e]));
  for (const e of events) if (e.changes && repeats.has(e.uid)) (repeats.get(e.uid).skip ||= []).push(e.changes);
  return events.filter(e => e.start && !e.cancelled);
}
const zones = new Map();
function zoned(parts, tz) { // a wall clock in another time zone
  const guess = Date.UTC(...parts);
  try {
    if (!zones.has(tz)) zones.set(tz, new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }));
    const p = {}; for (const { type, value } of zones.get(tz).formatToParts(guess)) p[type] = Number(value);
    return guess - (Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - guess);
  } catch { return new Date(...parts).getTime(); } // a name this PC does not know: as if it is local time
}
function icsDate(value, tz) {
  const m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/.exec(value); if (!m) return null;
  const [, y, mo, d, h = '00', mi = '00', s = '00', z] = m, parts = [+y, mo - 1, +d, +h, +mi, +s];
  return z ? Date.UTC(...parts) : tz && m[4] ? zoned(parts, tz) : new Date(...parts).getTime();
}
const WEEKDAYS = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };
// The moments an event happens between from and to. A repeat walks the calendar, so 18:00 stays 18:00 when the clocks change.
function occurrences(event, from, to, max = 40) {
  const out = [], length = event.duration || 0;
  const hit = t => { if (t + length > from && t <= to && !event.skip?.includes(t)) out.push(t); };
  const rule = Object.fromEntries(String(event.rrule || '').split(';').map(p => p.split('='))), freq = rule.FREQ;
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(freq)) { hit(event.start); return out; }
  const first = new Date(event.start), y = first.getFullYear(), m = first.getMonth(), d = first.getDate();
  const at = (yy, mm, dd) => new Date(yy, mm, dd, first.getHours(), first.getMinutes(), first.getSeconds()).getTime();
  const every = Math.max(1, Number(rule.INTERVAL) || 1), count = Number(rule.COUNT) || Infinity, until = rule.UNTIL ? icsDate(rule.UNTIL) : Infinity;
  const days = String(rule.BYDAY || '').split(',').filter(Boolean);
  let made = 0;
  for (let k = 0; k < 20000 && out.length < max; k++) {
    let dates = [];
    if (freq === 'DAILY') dates = [at(y, m, d + k * every)];
    else if (freq === 'WEEKLY') {
      const monday = d - (first.getDay() + 6) % 7 + k * every * 7;
      dates = (days.length ? days.map(w => WEEKDAYS[w]) : [first.getDay()]).map(w => at(y, m, monday + (w + 6) % 7)).sort((a, b) => a - b);
    } else if (freq === 'MONTHLY') { // the same date, or "the second Monday" (2MO), "the last Friday" (-1FR)
      const mo = m + k * every, nth = /^(-?\d)([A-Z]{2})$/.exec(days[0] || '');
      let day = Number(rule.BYMONTHDAY) || d;
      if (nth) {
        const w = WEEKDAYS[nth[2]], n = Number(nth[1]), last = new Date(y, mo + 1, 0);
        day = n > 0 ? 1 + (w - new Date(y, mo, 1).getDay() + 7) % 7 + (n - 1) * 7 : last.getDate() - (last.getDay() - w + 7) % 7 + (n + 1) * 7;
      }
      const t = at(y, mo, day);
      if (new Date(t).getMonth() === new Date(y, mo, 1).getMonth()) dates = [t]; // (no 31 February)
    } else { const t = at(y + k * every, m, d); if (new Date(t).getDate() === d) dates = [t]; } // (29 February: only in leap years)
    for (const t of dates) {
      if (t < event.start) continue;
      if (t > until || made >= count || t > to) return out;
      made++; hit(t);
    }
  }
  return out;
}
const nextStart = (event, now) => occurrences(event, now, now + 400 * 864e5, 1)[0] ?? null;

if (process.versions.electron) setup(require('electron'));
module.exports = { parseIcs, nextStart, occurrences, icsDate };
