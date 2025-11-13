// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Запрос версии
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Отправка команд
  checkUpdates: () => ipcRenderer.send('check-for-updates'),
  restartApp: () => ipcRenderer.send('restart_app'),
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),

  // ==================== ВАШЕ НОВОЕ ДОПОЛНЕНИЕ ====================
  /**
   * Показывает нативное диалоговое окно подтверждения.
   * @param {object} options - Опции для диалога.
   * @param {string} options.message - Основное сообщение/вопрос в диалоге.
   * @param {string} [options.detail] - Дополнительное, более подробное описание.
   * @returns {Promise<boolean>} - Возвращает Promise, который разрешается в true, если пользователь нажал 'Удалить', и в false в противном случае.
   */
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  // ===============================================================

  // Прослушивание событий
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