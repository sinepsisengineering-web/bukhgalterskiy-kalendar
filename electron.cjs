// electron.cjs

const { app, BrowserWindow } = require('electron');
const path = require('path');

// Определяем, запущено ли приложение в режиме разработки или оно собрано
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    // В режиме разработки загружаем с Vite-сервера
    win.loadURL('http://localhost:5173');
    // Можно раскомментировать, чтобы инструменты разработчика открывались автоматически
    win.webContents.openDevTools();
  } else {
    // В собранном приложении загружаем локальный файл index.html
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});