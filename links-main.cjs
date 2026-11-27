// Your own apps (a user: "add essentials or browser links as squares next to Claude Code and Spotify"): up to 4 websites or
// programs on this PC, kept in userData/links.json. Settings → Apps → Your own apps adds and removes them; the island shows
// them next to its tabs and opens them. Only what you added can be opened this way, and a program only comes from the file picker.
const { app, ipcMain, BrowserWindow, shell, net, dialog } = require('electron');
const fs = require('node:fs'), path = require('node:path');

const MAX = 4;
const file = () => path.join(app.getPath('userData'), 'links.json');
const ours = e => /(mascot|settings-app)\.html/.test(e.senderFrame?.url || '');
const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
const isProgram = p => typeof p === 'string' && /^[a-z]:\\.+\.(exe|lnk)$/i.test(p);
const valid = l => l && typeof l.name === 'string' && l.name && (isProgram(l.path) || /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(String(l.url || '')));
const picked = new Set(); // programs chosen in the file picker just now
const host = url => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; } };

function read() {
  try { const v = JSON.parse(fs.readFileSync(file(), 'utf8')); return Array.isArray(v) ? v.filter(valid).slice(0, MAX) : []; } catch { return []; }
}
function clean(list) {
  const known = new Set(read().map(l => l.path).filter(Boolean));
  return (Array.isArray(list) ? list : []).map(l => {
    if (l?.path) {
      if (!isProgram(l.path) || !(picked.has(l.path) || known.has(l.path))) return null;
      return { name: String(l.name || '').trim().slice(0, 24) || path.parse(l.path).name.slice(0, 24), path: l.path };
    }
    let url = String(l?.url || '').trim().slice(0, 500);
    if (url && !/^https?:\/\//i.test(url)) url = 'https://' + url;   // "youtube.com" is fine too
    const name = String(l?.name || '').trim().slice(0, 24) || host(url).slice(0, 24);
    return { name, url };
  }).filter(valid).slice(0, MAX);
}
function broadcast(list) {
  list = withIcons(list);
  for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send('links:changed', list);
}

// (beta 75) the site's own icon instead of a letter (a buyer: "my YouTube shortcut shows a plain Y"): fetched once per site
// from DuckDuckGo's icon service (only the site's name goes there), kept in userData/link-icons.json as a small picture;
// no icon (offline, unknown site): the letter stays.
const iconFile = () => path.join(app.getPath('userData'), 'link-icons.json');
let icons = null; const asking = new Set();
function iconCache() { if (!icons) { try { icons = JSON.parse(fs.readFileSync(iconFile(), 'utf8')) || {}; } catch { icons = {}; } } return icons; }
function withIcons(list) {
  const c = iconCache(), out = list.map(l => { const k = l.path || host(l.url); return c[k] ? { ...l, icon: c[k] } : l; });
  for (const l of list) if (l.path) programIcon(l.path); else fetchIcon(host(l.url));
  return out;
}
// a program's icon comes from Windows itself
async function programIcon(p) {
  const c = iconCache();
  if (p in c || asking.has(p)) return;
  asking.add(p);
  let pic = '';
  try { const img = await app.getFileIcon(p, { size: 'large' }); if (!img.isEmpty()) pic = img.toDataURL(); } catch {}
  asking.delete(p); c[p] = pic;
  try { fs.writeFileSync(iconFile(), JSON.stringify(c)); } catch {}
  if (pic) broadcast(read());
}
async function fetchIcon(h) {
  const c = iconCache();
  if (!h || h in c || asking.has(h) || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(h)) return;
  asking.add(h);
  let pic = '';
  try {
    const res = await net.fetch(`https://icons.duckduckgo.com/ip3/${h}.ico`, { signal: AbortSignal.timeout(8000) });
    const b = Buffer.from(await res.arrayBuffer());
    const type = b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])) ? 'image/png' : b.subarray(0, 4).equals(Buffer.from([0, 0, 1, 0])) ? 'image/x-icon'
      : b[0] === 0xff && b[1] === 0xd8 ? 'image/jpeg' : b.subarray(0, 3).toString() === 'GIF' ? 'image/gif' : '';
    if (res.ok && type && b.length > 100 && b.length < 120000) pic = `data:${type};base64,${b.toString('base64')}`;
  } catch { asking.delete(h); return; }                                  // (offline: try again next time)
  c[h] = pic;                                                             // ('' = this site has none: the letter)
  try { fs.writeFileSync(iconFile(), JSON.stringify(c)); } catch {}
  if (pic) broadcast(read());
}

ipcMain.handle('links:get', e => (ours(e) ? withIcons(read()) : []));
ipcMain.handle('links:set', (e, list) => {
  if (!ours(e)) return read();
  const v = clean(list);
  try { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file(), JSON.stringify(v, null, 1)); } catch {}
  broadcast(v);
  return withIcons(v);
});
// Settings: choose a program (a shortcut on your desktop works too)
ipcMain.handle('links:pick', async e => {
  if (!ours(e)) return null;
  const r = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), { defaultPath: app.getPath('desktop'), properties: ['openFile'], filters: [{ name: 'Programs', extensions: ['exe', 'lnk'] }] });
  const p = r.canceled ? '' : r.filePaths[0];
  if (!isProgram(p)) return null;
  picked.add(p);
  return { name: path.parse(p).name.slice(0, 24), path: p };
});
ipcMain.on('links:open', (e, target) => {
  if (!fromIsland(e)) return;
  const l = read().find(x => x.url === target || x.path === target);
  if (l?.path) shell.openPath(l.path); else if (l) shell.openExternal(l.url);
});
// Robo's voice commands (voice-commands.js): "open YouTube" opens one of these well-known sites, never an address you say
const SITES = { youtube: 'https://www.youtube.com', netflix: 'https://www.netflix.com', chatgpt: 'https://chatgpt.com', claude: 'https://claude.ai',
  gmail: 'https://mail.google.com', google: 'https://www.google.com', instagram: 'https://www.instagram.com', tiktok: 'https://www.tiktok.com',
  whatsapp: 'https://web.whatsapp.com', discord: 'https://discord.com/app', twitch: 'https://www.twitch.tv', reddit: 'https://www.reddit.com',
  x: 'https://x.com', twitter: 'https://x.com', github: 'https://github.com', outlook: 'https://outlook.live.com', maps: 'https://maps.google.com',
  googlemaps: 'https://maps.google.com', drive: 'https://drive.google.com', googledrive: 'https://drive.google.com', linkedin: 'https://www.linkedin.com',
  wikipedia: 'https://www.wikipedia.org', pinterest: 'https://www.pinterest.com', facebook: 'https://www.facebook.com', primevideo: 'https://www.primevideo.com',
  disneyplus: 'https://www.disneyplus.com', soundcloud: 'https://soundcloud.com', duolingo: 'https://www.duolingo.com', canva: 'https://www.canva.com',
  notion: 'https://www.notion.so', gemini: 'https://gemini.google.com', translate: 'https://translate.google.com', googletranslate: 'https://translate.google.com' };
ipcMain.handle('voice:open', (e, key) => {
  if (!fromIsland(e)) return false;
  const url = Object.hasOwn(SITES, String(key)) ? SITES[key] : null;
  if (url) shell.openExternal(url);
  return Boolean(url);
});

module.exports = { read, clean, withIcons };
