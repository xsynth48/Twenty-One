// The focus guard's calm screen (guard.html): only one thing to send back, your choice.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('guard', { choose: kind => ipcRenderer.send('guard:choice', kind === 'anyway' ? 'anyway' : 'back') });
