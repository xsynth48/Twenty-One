// Talking to twocode.nl (the update check, News in Settings, the Store), the way a browser does. twocode.nl runs on
// shared hosting with a firewall that answers some people's PCs with a "checking your browser" page instead of the data:
// a browser solves it by itself with JavaScript, a plain request can't. A user got "<!DOCTYPE …" instead of the update
// every single time, while his browser showed the same address fine. So:
//  1. Chromium's own network (Windows' proxy, VPN and certificates) with Electron's normal browser User-Agent (an app's
//     own "Twenty-One/1.2" made such firewalls suspicious sooner); Node's own fetch as a second try;
//  2. a web page instead of the answer: a hidden window opens the address once, so the page's check runs like in Chrome
//     and leaves its cookie in Twenty-One's session, and the request is tried again (at most once a minute).
// What the firewall sent (its page title) goes into the log, so the next look tells what it was.
const { app, net, BrowserWindow } = require('electron');

const looksLikePage = text => /^\s*</.test(text) && /<(!doctype|html|head|body|script)/i.test(text.slice(0, 2000));
const titleOf = text => (/<title[^>]*>([^<]{0,120})/i.exec(text)?.[1] || '').trim() || text.replace(/\s+/g, ' ').slice(0, 80);

let solving = null, solvedAt = 0;
/** Opens the address in a hidden window and waits until it shows the real answer (JSON). true: solved. */
function solveCheck(url, ms = 25000) {
  if (solving) return solving;
  if (Date.now() - solvedAt < 60 * 1000) return Promise.resolve(false); // tried a moment ago: not again right away
  solving = new Promise(resolve => {
    let win = null, done = false;
    const finish = ok => {
      if (done) return; done = true; clearTimeout(timer);
      try { if (win && !win.isDestroyed()) win.destroy(); } catch {}
      solvedAt = Date.now(); solving = null; resolve(ok);
    };
    const timer = setTimeout(() => finish(false), ms);
    try {
      win = new BrowserWindow({ show: false, width: 900, height: 700, skipTaskbar: true,
        webPreferences: { sandbox: true, contextIsolation: true, nodeIntegration: false, backgroundThrottling: false } });
      win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      win.webContents.on('will-download', e => e.preventDefault());
      // the check page reloads itself to the real answer once it is passed: a JSON answer means we are through
      const look = () => win.webContents.executeJavaScript('[document.contentType, (document.body && document.body.innerText || "").slice(0, 20)]')
        .then(([type, text]) => { if (/json/i.test(type) || /^\s*[[{]/.test(text)) finish(true); }).catch(() => {});
      win.webContents.on('did-finish-load', () => setTimeout(look, 400));
      win.loadURL(url);
    } catch { finish(false); }
  });
  return solving;
}

/**
 * Gets an address of twocode.nl like a browser. as: 'json' or 'buffer'; ms: for the whole answer; log(text): where to
 * say what went wrong. Throws when it really could not.
 */
async function siteGet(url, { as = 'json', ms = 20000, headers = {}, log = () => {} } = {}) {
  const attempt = async (name, f) => {
    const stop = new AbortController(); let timer;
    const late = new Promise((_, no) => { timer = setTimeout(() => { stop.abort(); no(new Error('no answer within ' + Math.round(ms / 1000) + ' s')); }, ms); });
    try {
      return await Promise.race([late, (async () => {
        // credentials: the cookie a passed check page left in Twenty-One's session goes along (site-fetch's hidden window)
        const res = await f(url, { headers: { Accept: as === 'json' ? 'application/json' : '*/*', ...headers }, credentials: 'include', signal: stop.signal });
        const buf = Buffer.from(await res.arrayBuffer()), head = buf.subarray(0, 2000).toString('utf8');
        const page = looksLikePage(head) && !/^\s*[[{]/.test(head);
        // such firewalls also answer 403 ("access denied", a user saw "server error 403"), 429 or 503 with their page
        if (!res.ok) { const e = new Error(new URL(url).host + ' answered ' + res.status + (page ? ': "' + titleOf(head) + '"' : '')); e.page = page && [403, 429, 503].includes(res.status); throw e; }
        if (page) { const e = new Error('got a web page instead of the answer: "' + titleOf(head) + '"'); e.page = true; throw e; }
        return as === 'json' ? JSON.parse(buf.toString('utf8')) : buf;
      })()]);
    } finally { clearTimeout(timer); }
  };
  const ways = [['chromium', (u, i) => net.fetch(u, i)], ['node', (u, i) => fetch(u, { ...i, headers: { 'User-Agent': app.userAgentFallback, ...i.headers } })]];
  let last = null, page = false;
  for (const [name, f] of ways) {
    try { return await attempt(name, f); }
    catch (e) { last = e; page = page || Boolean(e.page); log(name + ' could not get ' + new URL(url).pathname.split('/').filter(Boolean).pop() + ': ' + (e && e.message || e)); }
  }
  if (page && app.isReady()) { // a firewall's check page: let a hidden window pass it like a browser, then once more
    const check = as === 'json' ? url : new URL(url).origin + '/wp-json/twocode/v1/app-update';
    const ok = await solveCheck(check);
    log('hidden window ' + (ok ? 'passed' : 'could not pass') + ' the check page');
    if (ok) {
      try { return await attempt('chromium', ways[0][1]); }
      catch (e) { last = e; log('chromium after the check: ' + (e && e.message || e)); }
    }
  }
  throw last || new Error('could not reach ' + new URL(url).host);
}

module.exports = { siteGet, looksLikePage, solveCheck };
