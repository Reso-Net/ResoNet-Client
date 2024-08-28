const { app, BrowserWindow } = require('electron')
const path = require('path');

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1920,
        height: 1080,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
        icon: path.join(__dirname, 'src', 'resources', 'logo.ico'), 
        autoHideMenuBar: true,
    });
    
    mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
}

app.whenReady().then(async () => {
    createWindow();
    
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