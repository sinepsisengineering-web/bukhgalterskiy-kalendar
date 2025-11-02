// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Запрос версии
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Отправка команды на проверку обновлений
  checkUpdates: () => ipcRenderer.send('check-for-updates'),
  
  // Отправка команды на перезапуск
  restartApp: () => ipcRenderer.send('restart_app'),

  // Прослушивание событий от главного процесса
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (_event, progressInfo) => callback(progressInfo)),
  onUpdateMessage: (callback) => ipcRenderer.on('update-message', (_event, message) => callback(message)),
});