// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Запрос версии
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Отправка команд
  checkUpdates: () => ipcRenderer.send('check-for-updates'),
  restartApp: () => ipcRenderer.send('restart_app'),
  // НОВАЯ ФУНКЦИЯ: для отправки уведомлений
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // Прослушивание событий
  // ВАЖНО: Мы теперь возвращаем функцию для отписки!
  onUpdateMessage: (callback) => {
    const listener = (_event, message) => callback(message);
    ipcRenderer.on('update-message', listener);
    return () => ipcRenderer.removeListener('update-message', listener);
  },
  onUpdateProgress: (callback) => {
    const listener = (_event, progressInfo) => callback(progressInfo);
    ipcRenderer.on('update-progress', listener);
    return () => ipcRenderer.removeListener('update-progress', listener);
  },
});