// Local / offline auto-update stub for Twenty-One
// Telemetry and auto-updates disabled to preserve local modifications.
const { app, ipcMain } = require('electron');

function state() {
  return {
    current: app.getVersion(),
    ready: null,
    full: null,
    page: ''
  };
}

async function check() {
  return true;
}

const ours = e => {
  try { return String(e.senderFrame?.url || '').startsWith('file:'); }
  catch (x) { return false; }
};

ipcMain.handle('update:state', e => ours(e) ? state() : null);
ipcMain.on('update:install', () => {});
ipcMain.handle('update:check', async e => ours(e) ? { ...state(), failed: false } : null);

app.whenReady().then(() => {
  app.twocodeFreshChecked = true;
  app.emit('twocode-fresh-checked');
});

module.exports = { check, state };
