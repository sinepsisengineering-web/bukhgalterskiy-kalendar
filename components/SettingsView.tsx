// components/SettingsView.tsx

import React, { useState, useEffect } from 'react';
import { useConfirmation } from '../contexts/ConfirmationProvider';
// ==================== ФИНАЛЬНОЕ ИЗМЕНЕНИЕ: Импортируем типы ====================
import { UpdateMessage, ProgressInfo } from '../types';

export const SettingsView = ({ onClearData }: { onClearData: () => void; }) => {
  const confirm = useConfirmation();
  
  const [appVersion, setAppVersion] = useState('');
  const [updateMessage, setUpdateMessage] = useState<UpdateMessage | null>(null); 
  const [progressInfo, setProgressInfo] = useState<ProgressInfo | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(Notification.permission);
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => localStorage.getItem('soundEnabled') === 'true');

  useEffect(() => {
    window.electronAPI.getVersion().then(version => setAppVersion(version));

    const removeMessageListener = window.electronAPI.onUpdateMessage((message) => {
      setUpdateMessage(message);
      if (message.status !== 'checking' && message.status !== 'available') setIsChecking(false);
      if (message.status !== 'available') setProgressInfo(null);
    });

    const removeProgressListener = window.electronAPI.onUpdateProgress((info) => {
      setProgressInfo(info);
    });

    return () => {
      removeMessageListener();
      removeProgressListener();
    };
  }, []);

  const handleRequestPermission = () => {
    Notification.requestPermission().then(setPermissionStatus);
  };
  
  const handleToggleSound = (e: React.ChangeEvent<HTMLInputElement>) => {
    const enabled = e.target.checked;
    setIsSoundEnabled(enabled);
    localStorage.setItem('soundEnabled', String(enabled));
  };

  const handleCheckForUpdate = () => {
    setIsChecking(true);
    setProgressInfo(null);
    setUpdateMessage({ status: 'checking', text: 'Инициализация...' });
    window.electronAPI.checkUpdates();
  };
  
  const handleRestart = () => window.electronAPI.restartApp();
  
  const handleClearData = async () => {
    const isConfirmed = await confirm({
 title: 'Подтверждение удаления',
  message: (
    <>
      <p>Вы уверены, что хотите удалить задачу?</p>
      <p className="text-sm text-slate-500 mt-2">Связанный клиент: ...</p>
    </>
  ),
  confirmButtonText: 'Удалить',
  confirmButtonClass: 'bg-red-600 hover:bg-red-700'    });

    if (isConfirmed) {
      onClearData();
    }
  };

  // JSX остается без изменений
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">Уведомления</h2>
        <p className="text-sm text-gray-500 mb-4">Настройте напоминания о задачах на рабочем столе.</p>
        <div className="flex items-center space-x-4 mb-4">
          <button onClick={handleRequestPermission} disabled={permissionStatus === 'granted'} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
            {permissionStatus === 'granted' ? 'Разрешение есть' : 'Запросить разрешение'}
          </button>
          <span className={`text-sm font-medium ${permissionStatus === 'granted' ? 'text-green-600' : 'text-gray-500'}`}>
            Статус: {permissionStatus === 'granted' ? 'Разрешение получено' : 'Разрешение не предоставлено'}
          </span>
        </div>
        <label className="flex items-center cursor-pointer">
          <input type="checkbox" checked={isSoundEnabled} onChange={handleToggleSound} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          <span className="ml-2 text-sm text-gray-600">Включить звуковые оповещения</span>
        </label>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-xl font-semibold text-gray-800">Обновление приложения</h2>
                <p className="text-sm text-gray-500 mt-1">{appVersion ? `Текущая версия: ${appVersion}` : 'Загрузка версии...'}</p>
            </div>
            <button onClick={handleCheckForUpdate} disabled={isChecking} className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed">
              {isChecking ? 'Проверяем...' : 'Проверить обновления'}
            </button>
        </div>
        {(updateMessage || progressInfo) && <div className="mt-4 border-t pt-4">
            {updateMessage && <p className="text-sm text-center text-gray-600 mb-2">{updateMessage.text}</p>}
            {progressInfo && <div className="w-full bg-gray-200 rounded-full h-2.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progressInfo.percent.toFixed(2)}%` }}></div></div>}
            {updateMessage?.status === 'downloaded' && <button onClick={handleRestart} className="mt-4 w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-md shadow-sm hover:bg-green-700">Перезапустить и установить</button>}
        </div>}
      </div>
      <div className="bg-red-50 p-6 rounded-lg border border-red-200">
        <h2 className="text-xl font-semibold mb-2 text-red-800">Управление данными</h2>
        <p className="text-sm text-red-700 mb-4">Это действие приведет к сбросу приложения к исходному состоянию. Все ваши клиенты и задачи будут <strong>безвозвратно</strong> удалены.</p>
        <button onClick={handleClearData} className="px-5 py-2 bg-red-600 text-white font-semibold rounded-md shadow-sm hover:bg-red-700">Очистить локальные данные</button>
      </div>
    </div>
  );
};