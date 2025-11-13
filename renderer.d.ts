// renderer.d.ts

import { ProgressInfo, UpdateMessage } from './types';


export interface IElectronAPI {
  getVersion: () => Promise<string>;
  checkUpdates: () => void;
  restartApp: () => void;
  showNotification: (title: string, body: string) => void;
  showConfirmDialog: (options: { message: string; detail?: string }) => Promise<boolean>;
  
  // Теперь эти коллбэки используют импортированные типы
  onUpdateMessage: (callback: (message: UpdateMessage) => void) => () => void;
  onUpdateProgress: (callback: (progressInfo: ProgressInfo) => void) => () => void;
}

// Расширяем глобальный объект Window, добавляя к нему наше API
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}