// renderer.d.ts

// Импортируем типы, которые использует electron-updater, для полноты картины
import { ProgressInfo } from 'electron-updater';

// Создадим простой тип для наших сообщений об обновлении
export interface UpdateMessage {
  status: string;
  text: string;
}

// Описываем ВСЕ функции, которые мы "пробрасываем" через preload.js
export interface IElectronAPI {
  getVersion: () => Promise<string>;
  checkUpdates: () => void;
  restartApp: () => void;
  // Вот наша новая функция!
  showNotification: (title: string, body: string) => void; 
  onUpdateMessage: (callback: (message: UpdateMessage) => void) => () => void;
  onUpdateProgress: (callback: (progressInfo: ProgressInfo) => void) => () => void;
}

// Расширяем глобальный объект Window, добавляя к нему наше API
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}