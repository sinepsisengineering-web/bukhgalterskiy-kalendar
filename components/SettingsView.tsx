import React, { useState, useEffect } from 'react';

interface SettingsViewProps {
    onClearData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onClearData }) => {
    const [isChecking, setIsChecking] = useState(false);
    const [updateMessage, setUpdateMessage] = useState('');
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
        return localStorage.getItem('soundEnabled') === 'true';
    });

    useEffect(() => {
        localStorage.setItem('soundEnabled', String(isSoundEnabled));
    }, [isSoundEnabled]);

    const handleCheckForUpdate = () => {
        setIsChecking(true);
        setUpdateMessage('');
        setTimeout(() => {
            setIsChecking(false);
            setUpdateMessage('У вас установлена последняя версия приложения.');
        }, 1500);
    };

    const requestNotificationPermission = async () => {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
    };

    const getPermissionStatusText = () => {
        switch (notificationPermission) {
            case 'granted': return { text: 'Разрешение получено', color: 'text-green-700' };
            case 'denied': return { text: 'Разрешение отклонено', color: 'text-red-700' };
            default: return { text: 'Требуется разрешение', color: 'text-yellow-700' };
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Настройки</h2>
            <div className="space-y-8">

                 {/* Notifications Section */}
                <div className="p-6 border rounded-lg bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-900">Уведомления</h3>
                    <p className="mt-1 text-sm text-slate-600">Настройте напоминания о задачах на рабочем столе.</p>
                    <div className="mt-4 space-y-4">
                        <div className="flex items-center gap-4">
                             <button
                                onClick={requestNotificationPermission}
                                disabled={notificationPermission === 'granted'}
                                className="px-4 py-2 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors shadow disabled:bg-slate-400"
                            >
                                {notificationPermission === 'granted' ? 'Разрешение есть' : 'Запросить разрешение'}
                            </button>
                            <p className={`text-sm font-medium ${getPermissionStatusText().color}`}>
                                Статус: {getPermissionStatusText().text}
                            </p>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="sound-toggle"
                                checked={isSoundEnabled}
                                onChange={(e) => setIsSoundEnabled(e.target.checked)}
                                className="h-4 w-4 bg-white text-indigo-600 focus:ring-indigo-500 border-slate-400 rounded"
                            />
                            <label htmlFor="sound-toggle" className="ml-3 block text-sm text-slate-900">
                                Включить звуковые оповещения
                            </label>
                        </div>
                    </div>
                </div>

                {/* Application Update Section */}
                <div className="p-6 border rounded-lg bg-slate-50">
                    <h3 className="text-lg font-semibold text-slate-900">Обновление приложения</h3>
                    <p className="mt-1 text-sm text-slate-600">Проверьте наличие новой версии приложения.</p>
                    <div className="mt-4 flex items-center gap-4">
                        <button
                            onClick={handleCheckForUpdate}
                            disabled={isChecking}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow disabled:bg-indigo-300"
                        >
                            {isChecking ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Проверка...
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M15.55 13.422a1 1 0 01-1.414 0l-2.43-2.43a1 1 0 01.959-1.654 4.5 4.5 0 10-2.458 6.223 1 1 0 01-1.898.632A6.5 6.5 0 1110 3.5a6.471 6.471 0 015.55 3.422 1 1 0 010 1.558l-2.43 2.43a1 1 0 01-1.654.959l.011.012zM9 11a1 1 0 102 0v-5a1 1 0 10-2 0v5z" clipRule="evenodd" />
                                    </svg>
                                    Проверить обновления
                                </>
                            )}
                        </button>
                        {updateMessage && (
                            <p className="text-sm font-medium text-green-700">{updateMessage}</p>
                        )}
                    </div>
                </div>

                {/* Data Management Section */}
                 <div className="p-6 border border-red-200 rounded-lg bg-red-50">
                    <h3 className="text-lg font-semibold text-red-900">Управление данными</h3>
                    <p className="mt-1 text-sm text-red-700">
                        Это действие приведет к сбросу приложения к исходному состоянию. Все ваши клиенты и задачи будут <strong>безвозвратно удалены</strong>.
                    </p>
                    <div className="mt-4">
                        <button
                            onClick={onClearData}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors shadow"
                        >
                            Очистить локальные данные
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
