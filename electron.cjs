// electron.cjs

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// Определяем, запущено ли приложение в режиме разработки или оно собрано
const isDev = !app.isPackaged;

let win; // Объявляем переменную для окна здесь, чтобы она была доступна везде

function createWindow() {
  win = new BrowserWindow({ // Присваиваем значение нашей переменной
    width: 800,
    height: 600,
    webPreferences: {
      // Подключаем preload-скрипт. Это "мост" между Electron и React.
      preload: path.join(__dirname, 'preload.js')
    }
  });

  if (isDev) {
    // В режиме разработки
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    // В собранном приложении
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // После того как окно создано, запускаем проверку обновлений.
  // Это будет работать только в собранном приложении.
  if (!isDev) {
    autoUpdater.checkForUpdates();
  }
});

/* --- Секция логики обновлений --- */

// Событие: "Найдена новая версия, начинается скачивание"
autoUpdater.on('update-available', () => {
  // Отправляем сообщение в наше React-приложение
  win.webContents.send('update_available');
});

// Событие: "Новая версия успешно скачана"
autoUpdater.on('update-downloaded', () => {
  // Отправляем сообщение в наше React-приложение
  win.webContents.send('update_downloaded');
});

// Получаем команду от React-приложения на перезапуск
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

/* --- Стандартная секция для окон --- */

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
