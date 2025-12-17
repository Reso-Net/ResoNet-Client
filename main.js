const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            preload: path.join(__dirname, 'src', 'preload.js')
        },
        icon: path.join(__dirname, 'src', 'resources', 'logo.ico'), 
        autoHideMenuBar: true,
    });
    
    mainWindow.on('blur', () => { mainWindow.webContents.send('updateFocus', false) });
    mainWindow.on('focus', () => { mainWindow.webContents.send('updateFocus', true) });

    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(async () => {
    createWindow();
    app.setAppUserModelId(app.name);
    ipcMain.on('focusWindow', () => {
        console.log("Focusing?");
        mainWindow.focus();
    });
    
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
  
app.on('window-all-closed', async () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});