// The notification card (notice.html): it gets what to show and sends back how big it is and what you pressed.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('noticeCard', {
  onData: fn => ipcRenderer.on('notice:data', (_e, d) => fn(d)),
  size: height => ipcRenderer.send('notice:size', height),
  choose: index => ipcRenderer.send('notice:choice', index),
});
