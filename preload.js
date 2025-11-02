// preload.js

const { contextBridge, ipcRenderer } = require('electron');

// Мы создаем глобальный объект 'electronAPI' в окне нашего React-приложения.
// Через этот объект React сможет отправлять и получать сообщения.
contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Слушает событие 'update_available' от главного процесса.
   * @param {function} callback - Функция, которая будет вызвана, когда обновление станет доступно.
   */
  onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),

  /**
   * Слушает событие 'update_downloaded' от главного процесса.
   * @param {function} callback - Функция, которая будет вызвана, когда обновление будет скачано.
   */
  onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback),
  
  /**
   * Отправляет команду 'restart_app' главному процессу для перезапуска и установки обновления.
   */
  restartApp: () => ipcRenderer.send('restart_app')
});