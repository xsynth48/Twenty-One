// Twenty-One in the Windows tray (next to the clock): Robo's face, with a menu to open the island,
// start with Windows, restart and quit. The island itself has no taskbar button, so this is the
// place where you can always find and close Twenty-One. Also: only one Twenty-One runs at a time.
const { app, Tray, Menu, nativeImage, BrowserWindow, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { t: T, onChange: onLang } = require('./lang-main.cjs');

let tray = null;

function island() {
  return BrowserWindow.getAllWindows().find(w => !w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL()));
}

function openIsland() {
  const win = island(); if (!win) return;
  if (win.isMinimized()) win.restore();
  win.showInactive();
  win.webContents.send('extras:shortcut', 'home');
}

// Start with Windows. During development Twenty-One runs as "electron.exe <folder>", so pass those along.
function loginOptions() { return app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] }; }
function startsWithWindows() { try { return app.getLoginItemSettings(loginOptions()).openAtLogin; } catch { return false; } }
function setStartsWithWindows(on) {
  try { app.setLoginItemSettings({ ...loginOptions(), openAtLogin: !!on }); } catch {}
  // (beta 78) your own choice: welcome-main.cjs never turns it on again by itself
  try { require('node:fs').writeFileSync(require('node:path').join(app.getPath('userData'), 'start-with-windows-default'), new Date().toISOString()); } catch {}
  buildMenu();
}

function quit() { app.quit(); } // main.js shows the goodbye first
function restart() { app.relaunch(); app.quit(); }

onLang(() => buildMenu());
function buildMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Twenty-One', enabled: false },
    { type: 'separator' },
    { label: T('Open the island'), accelerator: require('./shortcuts-main.cjs').keysOf('island') || undefined, registerAccelerator: false, click: openIsland },
    { label: T('Tuck the island away / back'), accelerator: require('./shortcuts-main.cjs').keysOf('tuck') || undefined, registerAccelerator: false, click: () => {
      for (const w of BrowserWindow.getAllWindows()) if (!w.isDestroyed() && /mascot\.html/.test(w.webContents.getURL())) w.webContents.send('extras:shortcut', 'tuck');
    } },
    { label: T('Settings'), click: () => app.emit('twocode-open-settings') },
    { label: T('Set up Twenty-One…'), click: () => app.emit('twocode-open-welcome') },
    // which screen the island is on (display-main.cjs), with two or more screens
    ...(require('electron').screen.getAllDisplays().length > 1 ? [{ label: T('Screen'), submenu: require('./display-main.cjs').list().map(d => (
      { label: d.label, type: 'radio', checked: d.chosen, click: () => require('./display-main.cjs').choose(d.id) })) }] : []),
    { label: T('Start with Windows'), type: 'checkbox', checked: startsWithWindows(), click: item => setStartsWithWindows(item.checked) },
    // a black box around the island on some PCs: graphics-main.cjs (restarts Twenty-One)
    { label: T('Safe graphics (fixes a black box)'), type: 'checkbox', checked: require('./graphics-main.cjs').safe, click: item => require('./graphics-main.cjs').setSafe(item.checked) },
    // which graphics card draws the island (graphics-main.cjs, restarts Twenty-One)
    { label: T('Graphics card'), enabled: !require('./graphics-main.cjs').safe, submenu: [['low', 'Power saving (recommended)'], ['high', 'High performance'], ['auto', 'Let Windows decide']].map(([id, label]) => (
      { label: T(label), type: 'radio', checked: require('./graphics-main.cjs').gpu === id, click: () => require('./graphics-main.cjs').setGpu(id) })) },
    { type: 'separator' },
    { label: T('Restart'), click: restart },
    { label: T('Quit Twenty-One'), click: quit }
  ]));
}

if (!app.requestSingleInstanceLock()) {
  // Twenty-One already runs: that one opens its island, this one stops right away.
  app.exit(0);
} else {
  // "Twenty-One Instellingen" in the Start menu starts Twenty-One with --settings: then only that app opens.
  app.on('second-instance', (event, argv) => {
    if ((argv || []).includes('--uninstall')) app.emit('twocode-uninstall'); // Settings → Apps → Uninstall (uninstall-main.cjs)
    else if ((argv || []).includes('--settings')) app.emit('twocode-open-settings'); else openIsland();
  });
  app.setName('Twenty-One');
  // The app was called TwoCode: keep its settings/data folder so renaming does not reset everything.
  // (app.getPath('appData') is stable; a --user-data-dir passed by a test copy still wins.)
  if (app.isPackaged && !process.argv.some(a => a.startsWith('--user-data-dir'))) {
    app.setPath('userData', path.join(app.getPath('appData'), 'TwoCode'));
  }
  app.whenReady().then(() => {
    // Windows shows the name and icon of a notification from a Start menu shortcut with the same app id.
    // Without it, notifications said "Electron". Made (or fixed) on every start, it costs nothing.
    // Only the real Twenty-One does this. Takes for videos (REC_OUT), test copies with their own profile and the code folder
    // pointed Twenty-One.lnk at themselves: the installed Twenty-One then never started again, so it stopped updating (beta 59
    // while beta 62 was out). The code folder may still do it on a PC where Twenty-One is not installed.
    const installedExe = path.join(process.env.LOCALAPPDATA || path.join(require('node:os').homedir(), 'AppData', 'Local'), 'Programs', 'Twenty-One', 'Twenty-One.exe');
    // A portable copy stays invisible to Windows' Start menu: it leaves no installed shortcut behind.
    const portable = fs.existsSync(path.join(path.dirname(process.execPath), 'portable.txt'));
    const mayLink = !portable && !process.env.REC_OUT && (app.isPackaged ? !process.argv.some(a => a.startsWith('--user-data-dir')) : !fs.existsSync(installedExe));
    if (process.platform === 'win32' && mayLink) {
      try {
        const { shell } = require('electron');
        const programs = path.join(app.getPath('appData'), 'Microsoft', 'Windows', 'Start Menu', 'Programs');
        const link = path.join(programs, 'Twenty-One.lnk');
        // An old "Electron" shortcut with Twenty-One's app id made every notification say "Electron". Only that one goes.
        const old = path.join(programs, 'Electron.lnk');
        try {
          const info = require('node:fs').existsSync(old) && shell.readShortcutLink(old);
          if (info && info.appUserModelId === 'nl.twocode.assistent' && path.resolve(info.target) === path.resolve(process.execPath)) require('node:fs').unlinkSync(old);
        } catch {}
        shell.writeShortcutLink(link, require('node:fs').existsSync(link) ? 'replace' : 'create', {
          target: process.execPath,
          args: app.isPackaged ? '' : `"${app.getAppPath()}"`,
          cwd: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
          icon: path.join(__dirname, 'assets', 'icon.ico'), iconIndex: 0,
          appUserModelId: 'nl.twocode.assistent',
          description: 'Twenty-One: Robo, the Dynamic Island for Windows'
        });
        // Twenty-One on the desktop, like any app: made once, at the first start (userData/desktop-shortcut remembers that),
        // and after that never written again. One you deleted stays deleted, and a desktop kept in OneDrive got a copy
        // ("Twenty-One-LAPTOP.lnk") every time Twenty-One rewrote it: a user had a new shortcut after every start. Copies of
        // Twenty-One's own shortcut next to Twenty-One.lnk go to the Recycle Bin.
        if (app.isPackaged) {
          const fsx = require('node:fs'), deskDir = app.getPath('desktop'), desk = path.join(deskDir, 'Twenty-One.lnk'), made = path.join(app.getPath('userData'), 'desktop-shortcut');
          const same = (x, y) => path.resolve(String(x || '')).toLowerCase() === path.resolve(y).toLowerCase();
          const ours = name => { try { return same(shell.readShortcutLink(path.join(deskDir, name)).target, process.execPath); } catch { return false; } };
          let names = []; try { names = fsx.readdirSync(deskDir).filter(n => /^(?:twocode|twenty-one).*\.lnk$/i.test(n)); } catch {}
          if (!fsx.existsSync(made)) { // the first start (a Twenty-One.lnk of an older copy that points somewhere else is fixed)
            if (!names.some(ours)) shell.writeShortcutLink(desk, fsx.existsSync(desk) ? 'replace' : 'create', { target: process.execPath, cwd: path.dirname(process.execPath),
              icon: path.join(__dirname, 'assets', 'icon.ico'), iconIndex: 0, appUserModelId: 'nl.twocode.assistent', description: 'Twenty-One: Robo, the Dynamic Island for Windows' });
            try { fsx.writeFileSync(made, new Date().toISOString()); } catch {}
          }
          if (fsx.existsSync(desk) && ours('Twenty-One.lnk')) // "Twenty-One-LAPTOP.lnk", "Twenty-One (2).lnk", "Twenty-One - Copy.lnk"
            for (const n of names) if (/^(?:twocode|twenty-one)(-.+| \(\d+\)| - .+)\.lnk$/i.test(n) && ours(n)) shell.trashItem(path.join(deskDir, n)).catch(() => {});
        }
        // The second app: Twenty-One Instellingen, with its own icon and app id (its own button on the taskbar).
        const settingsLink = path.join(programs, 'Twenty-One Instellingen.lnk');
        shell.writeShortcutLink(settingsLink, require('node:fs').existsSync(settingsLink) ? 'replace' : 'create', {
          target: process.execPath,
          args: (app.isPackaged ? '' : `"${app.getAppPath()}" `) + '--settings',
          cwd: app.isPackaged ? path.dirname(process.execPath) : app.getAppPath(),
          icon: path.join(__dirname, 'assets', 'settings-icon.ico'), iconIndex: 0,
          appUserModelId: 'nl.twocode.instellingen',
          description: 'Twenty-One Instellingen: verbindingen, Robo, kledingkast en meer'
        });
      } catch {}
      // The shortcut alone was not enough: Windows also reads the name and icon of notifications from
      // HKCU\Software\Classes\AppUserModelId\<app id>. Only Twenty-One's own key, in the user's own registry part.
      try {
        const { execFile } = require('node:child_process');
        const key = 'HKCU\\Software\\Classes\\AppUserModelId\\nl.twocode.assistent';
        const set = (name, value) => execFile('reg.exe', ['add', key, '/v', name, '/t', 'REG_SZ', '/d', value, '/f'], { windowsHide: true }, () => {});
        set('DisplayName', 'Twenty-One');
        set('IconUri', path.join(__dirname, 'assets', 'icon-256.png'));
        const key2 = 'HKCU\\Software\\Classes\\AppUserModelId\\nl.twocode.instellingen';
        execFile('reg.exe', ['add', key2, '/v', 'DisplayName', '/t', 'REG_SZ', '/d', 'Twenty-One Instellingen', '/f'], { windowsHide: true }, () => {});
        execFile('reg.exe', ['add', key2, '/v', 'IconUri', '/t', 'REG_SZ', '/d', path.join(__dirname, 'assets', 'settings-icon.png'), '/f'], { windowsHide: true }, () => {});
      } catch {}
    }
    const image = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(image);
    tray.setToolTip('Twenty-One');
    tray.on('click', openIsland);
    buildMenu();
    app.on('twocode-display-changed', buildMenu); app.on('twocode-displays-changed', buildMenu); // tray → Screen
  });
  app.on('twocode-shortcuts-changed', buildMenu); // the menu shows the island's keys (shortcuts-main.cjs)
  // the icon stays during the goodbye and goes when the app really stops
  app.on('will-quit', () => { try { tray?.destroy(); } catch {} tray = null; });

  // only the island itself may change these
  const fromIsland = e => /mascot\.html/.test(e.senderFrame?.url || '');
  ipcMain.handle('app:login-get', e => fromIsland(e) ? { ok: true, on: startsWithWindows() } : { ok: false });
  ipcMain.handle('app:login-set', (e, on) => { if (!fromIsland(e)) return { ok: false }; setStartsWithWindows(on); return { ok: true, on: startsWithWindows() }; });
  ipcMain.on('app:restart', e => { if (fromIsland(e)) restart(); });
}

module.exports = { openIsland };
