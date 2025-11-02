// electron.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
let win;

// Функция для отправки сообщений в UI
const sendUpdateMessage = (message) => {
  if (win) {
    win.webContents.send('update-message', message);
  }
};

function createWindow() {
  win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
});

/* --- Секция логики обновлений --- */

// Запрос версии приложения
ipcMain.handle('get-app-version', () => app.getVersion());

// Запуск проверки обновлений вручную из UI
ipcMain.on('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates();
  } else {
    sendUpdateMessage({ status: 'info', text: 'Проверка обновлений не работает в режиме разработки.' });
  }
});

// Перезапуск для установки
ipcMain.on('restart_app', () => autoUpdater.quitAndInstall());

// Обработчики событий autoUpdater
autoUpdater.on('checking-for-update', () => sendUpdateMessage({ status: 'checking', text: 'Поиск обновлений...' }));
autoUpdater.on('update-available', () => sendUpdateMessage({ status: 'available', text: 'Найдено обновление. Начинается скачивание...' }));
autoUpdater.on('update-not-available', () => sendUpdateMessage({ status: 'info', text: 'У вас установлена последняя версия.' }));
autoUpdater.on('error', (err) => sendUpdateMessage({ status: 'error', text: `Ошибка обновления: ${err.message}` }));
autoUpdater.on('download-progress', (progressInfo) => {
  if (win) {
    win.webContents.send('update-progress', progressInfo);
  }
});
autoUpdater.on('update-downloaded', () => sendUpdateMessage({ status: 'downloaded', text: 'Обновление скачано и готово к установке.' }));


/* --- Стандартная секция для окон --- */
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });