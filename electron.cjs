// electron.cjs
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// ИЗМЕНЕНИЕ 1: Добавляем electron-log
const log = require('electron-log');

const isDev = !app.isPackaged;
let win;

/* --- ИЗМЕНЕНИЕ 2: Секция настройки логирования --- */
log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
log.transports.file.level = "info";
autoUpdater.logger = log;
log.info('Приложение запускается...');
/* --- Конец секции --- */


const sendUpdateMessage = (message) => {
  log.info(`Отправка сообщения в UI: ${JSON.stringify(message)}`); // Добавляем логирование сообщений
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
  
  // ИЗМЕНЕНИЕ 3: Запускаем проверку обновлений сразу после запуска (для теста)
  if (!isDev) {
    setTimeout(() => {
        log.info('Запуск автоматической проверки обновлений...');
        autoUpdater.checkForUpdates();
    }, 5000); // Небольшая задержка, чтобы окно успело появиться
  }
});

/* --- Секция логики обновлений --- */

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('check-for-updates', () => {
  if (!isDev) {
    log.info('Запуск проверки обновлений по кнопке...');
    autoUpdater.checkForUpdates();
  } else {
    sendUpdateMessage({ status: 'info', text: 'Проверка обновлений не работает в режиме разработки.' });
  }
});

ipcMain.on('restart_app', () => {
    log.info('Получена команда перезапуска для установки обновления.');
    autoUpdater.quitAndInstall();
});

autoUpdater.on('checking-for-update', () => sendUpdateMessage({ status: 'checking', text: 'Поиск обновлений...' }));
autoUpdater.on('update-available', (info) => sendUpdateMessage({ status: 'available', text: `Найдено обновление v${info.version}. Начинается скачивание...` }));
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