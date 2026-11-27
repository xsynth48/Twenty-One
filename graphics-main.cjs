// Safe graphics (tray → "Safe graphics (fixes a black box)"). On some PCs, mostly with older or unusual graphics
// drivers, Windows draws the see-through part of the island window as a big black box (a user saw that). Without
// the graphics card's help (hardware acceleration off) Windows draws see-through windows another way, and that
// works everywhere. It costs a little more of the processor, so it is only on when you turn it on. Read before
// Electron is ready (it can only be switched at the start), so changing it restarts Twenty-One.
const { app } = require('electron');
const fs = require('node:fs'), path = require('node:path');

const file = () => path.join(app.getPath('userData'), 'graphics.json');
function read() { try { return JSON.parse(fs.readFileSync(file(), 'utf8')) || {}; } catch { return {}; } }

const safe = read().safe === true;
if (safe) app.disableHardwareAcceleration();

// Which graphics card (tray → Graphics card). A user's Twenty-One froze at the start and lagged after resting: his screen
// hangs on the Intel (integrated) graphics, but Electron picked the NVIDIA card, so every frame went across from one card
// to the other and waited for the NVIDIA card to wake up. On a laptop the screen is wired to the integrated graphics, and
// a small window like the island needs nothing more: Twenty-One uses the power-saving card unless you choose otherwise
// ('high': the strong card, 'auto': let Windows decide). A PC with one graphics card is not affected.
const gpu = ['low', 'high', 'auto'].includes(read().gpu) ? read().gpu : 'low';
if (!safe && gpu === 'low') app.commandLine.appendSwitch('force_low_power_gpu');
if (!safe && gpu === 'high') app.commandLine.appendSwitch('force_high_performance_gpu');

// Memory (people found Twenty-One's use too high): Chromium keeps a spare renderer process ready for the next window
// (tens of MB, all day). Twenty-One opens few windows and can wait the moment it takes to start one.
// (Added to what was already switched off on the command line, never instead of it.)
app.commandLine.appendSwitch('disable-features', [app.commandLine.getSwitchValue('disable-features'), 'SpareRendererForSitePerProcess', 'CalculateNativeWinOcclusion'].filter(Boolean).join(','));
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows'); // (beta 80) a big Chrome window may never make Chromium pause the island as "covered"

/** Turns safe graphics on or off and restarts Twenty-One with it. */
function setSafe(on) {
  try { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file(), JSON.stringify({ ...read(), safe: !!on, at: new Date().toISOString() })); } catch {}
  app.relaunch(); app.quit();
}

/** Picks the graphics card ('low', 'high' or 'auto') and restarts Twenty-One with it. */
function setGpu(choice) {
  if (!['low', 'high', 'auto'].includes(choice) || choice === gpu) return;
  try { fs.mkdirSync(path.dirname(file()), { recursive: true }); fs.writeFileSync(file(), JSON.stringify({ ...read(), gpu: choice, at: new Date().toISOString() })); } catch {}
  app.relaunch(); app.quit();
}

module.exports = { safe, setSafe, gpu, setGpu };
