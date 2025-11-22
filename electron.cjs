// electron.cjs
const { app, BrowserWindow, ipcMain, Notification, dialog, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

const isDev = !app.isPackaged;
let win;
let tray = null;

// === ПРОВЕРКА НА ЕДИНСТВЕННЫЙ ЭКЗЕМПЛЯР ===
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // Если блокировку получить не удалось, значит приложение уже запущено.
  // Просто выходим.
  app.quit();
} else {
  // Если мы здесь — это ГЛАВНЫЙ и ЕДИНСТВЕННЫЙ процесс.
  // Начинаем выполнение кода...

  /* --- Секция настройки логирования --- */
  log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'logs/main.log');
  log.transports.file.level = "info";
  autoUpdater.logger = log;
  log.info('Приложение запускается...');

  // Слушаем попытку запуска второй копии
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Кто-то пытался запустить вторую копию (например, кликнул ярлык).
    // Мы должны развернуть наше окно.
    if (win) {
      if (win.isMinimized()) win.restore(); // Если свернуто - развернуть
      if (!win.isVisible()) win.show();     // Если спрятано в трей - показать
      win.focus();                          // Перевести фокус на окно
    }
  });

  const sendUpdateMessage = (message) => {
    log.info(`Отправка сообщения в UI: ${JSON.stringify(message)}`);
    if (win) {
      win.webContents.send('update-message', message);
    }
  };

  function createTray() {
    const iconPath = path.join(__dirname, 'icon.ico');
    const icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      log.error('ОШИБКА: Иконка не найдена или файл пустой!');
    }
    
    tray = new Tray(icon);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Открыть', 
        click: () => {
          if (win) win.show();
        } 
      },
      { 
        label: 'Выход', 
        click: () => {
          app.isQuitting = true;
          app.quit();
        } 
      }
    ]);

    tray.setToolTip('Бухгалтерский календарь');
    tray.setContextMenu(contextMenu);

    tray.on('double-click', () => {
      if (win) win.show();
    });
  }

  function createWindow() {
    const startHidden = process.argv.includes('--hidden');

    win = new BrowserWindow({
      width: 800,
      height: 600,
      show: false,
      icon: path.join(__dirname, 'icon.ico'),
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      }
    });

    win.on('close', (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        win.hide();
        return false;
      }
    });

    if (isDev) {
      win.loadURL('http://localhost:5173');
      win.webContents.openDevTools();
      win.show(); 
    } else {
      win.loadFile(path.join(__dirname, 'dist', 'index.html'));
      
      // Если НЕ скрытый запуск, то показываем окно
      if (!startHidden) {
        win.show();
      }
    }
  }

  app.whenReady().then(() => {
    createWindow();
    createTray(); 
    
    if (!isDev) {
      setTimeout(() => {
          log.info('Запуск автоматической проверки обновлений...');
          autoUpdater.checkForUpdates();
      }, 5000);
    }
  });

  /* --- Секция обработчиков IPC --- */

  ipcMain.handle('get-auto-launch', () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });

  ipcMain.handle('set-auto-launch', (event, enable) => {
    if (!app.isPackaged) {
      log.info('Автозапуск работает только в упакованном приложении.');
      return;
    }

    app.setLoginItemSettings({
      openAtLogin: enable,
      openAsHidden: true, 
      path: app.getPath('exe'),
      args: ['--hidden']
    });
    
    log.info(`Автозапуск установлен в значение: ${enable}`);
  });

  ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const focusedWindow = BrowserWindow.fromWebContents(event.sender);
    if (!focusedWindow) {
      return false;
    }
    
    const result = await dialog.showMessageBox(focusedWindow, {
      type: 'question',
      buttons: ['Отмена', 'Удалить'],
      defaultId: 0,
      cancelId: 0,
      title: options.title || 'Подтверждение действия',
      message: options.message || 'Вы уверены?',
      detail: options.detail || 'Это действие нельзя будет отменить.',
    });

    return result.response === 1; 
  });

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
      app.isQuitting = true;
      autoUpdater.quitAndInstall();
  });

  ipcMain.on('show-notification', (event, { title, body }) => {
    if (!Notification.isSupported()) {
      return;
    }
    const notification = new Notification({ title, body });
    notification.show();
  });


  /* --- Секция логики обновлений --- */
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
  app.on('before-quit', () => {
    app.isQuitting = true;
  });

  app.on('window-all-closed', () => { 
    if (process.platform !== 'darwin') {
      // Пусто
    }
  });

  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
} // Закрывающая скобка блока else (gotTheLock)