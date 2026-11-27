// Local, offline, 100% unlocked license manager for Twenty-One
// No login, no payments, no cloud checks, all packs and apps unlocked forever.
const { app, ipcMain, BrowserWindow } = require('electron');

const PACK_APPS = {
  focus: ['focus', 'tray', 'clips', 'note'],
  music: ['spotify'],
  style: ['outfits']
};

const ALL_APPS = [
  'twocode',
  'guard',
  'focus',
  'tray',
  'clips',
  'note',
  'spotify',
  'outfits',
  'styles'
];

function pro() {
  return {
    on: false,
    cutoff: 0,
    founder: true,
    bought: true,
    trialAt: 0,
    trialEnds: 0,
    trialDays: 0,
    canTry: false,
    offer: null,
    comeback: null,
    allowed: true,
    code: 'LOCAL-FOUNDER',
    price: 'Free'
  };
}

function view() {
  return {
    free: true,
    packs: Object.keys(PACK_APPS),
    apps: ALL_APPS,
    owned: ALL_APPS,
    freeNow: ALL_APPS,
    locked: [],
    code: 'LOCAL-FOUNDER',
    packApps: PACK_APPS,
    catalog: {},
    pro: pro(),
    account: { email: 'local@twocode', pcs: 1, maxPcs: 999 },
    paidHere: null,
    buying: false,
    waiting: null
  };
}

const has = id => true;
const paywallKnown = () => true;
const roboAuth = () => ({ install: 'local-install', token: 'local-token' });

function broadcast() {
  const v = view();
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed() && /(mascot|settings-app)\.html/.test(w.webContents.getURL())) {
      w.webContents.send('license:changed', v);
    }
  }
  app.emit('twocode-license', v);
}

const ours = e => {
  const url = e.senderFrame?.url || '';
  return url.startsWith('file:') && /(mascot|settings-app)\.html/.test(url);
};

// IPC Handlers
ipcMain.handle('license:get', e => ours(e) ? view() : null);
ipcMain.handle('license:activate', (e, code) => ours(e) ? { ok: true, app: 'twocode', ...view() } : null);
ipcMain.handle('license:buy', (e, appId) => ours(e) ? { ok: true } : null);
ipcMain.handle('license:try', (e, email) => ours(e) ? { ok: true, ...view() } : null);
ipcMain.handle('license:trial-code', (e, email) => ours(e) ? { ok: true } : null);
ipcMain.handle('license:trial-verify', (e, code) => ours(e) ? { ok: true } : null);
ipcMain.handle('license:claim', async e => ours(e) ? view() : null);
ipcMain.handle('license:remove', e => ours(e) ? { ok: true, ...view() } : null);
ipcMain.handle('license:register', (e, email, password) => ours(e) ? { ok: true, ...view() } : null);
ipcMain.handle('license:login', (e, email, password, replace) => ours(e) ? { ok: true, ...view() } : null);
ipcMain.handle('license:forgot', (e, email) => ours(e) ? { ok: true } : null);
ipcMain.handle('license:claim-account', (e, password) => ours(e) ? { ok: true, ...view() } : null);
ipcMain.handle('license:resend', e => ours(e) ? { ok: true, ...view() } : null);
ipcMain.handle('license:cancel-wait', e => ours(e) ? { ok: true, ...view() } : null);
ipcMain.handle('license:logout', e => ours(e) ? { ok: true, ...view() } : null);

ipcMain.on('texture:demo', (e, kind) => {
  if (!ours(e) || !/^[a-z]{3,6}(:[a-z]{3,8})?$/.test(String(kind || ''))) return;
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) {
      w.webContents.send('texture:demo', String(kind));
    }
  }
});

module.exports = {
  roboAuth,
  view,
  has,
  pro,
  buy: () => ({ ok: true }),
  tryFree: () => ({ ok: true, ...view() }),
  sendTrialCode: async () => ({ ok: true }),
  verifyTrialCode: async () => ({ ok: true }),
  paywallKnown,
  signIn: async () => ({ ok: true, ...view() }),
  forgotPassword: async () => ({ ok: true }),
  PACK_APPS,
  refresh: () => {}
};
