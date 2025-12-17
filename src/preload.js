const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
    focusWindow: () => ipcRenderer.send('focusWindow')
})