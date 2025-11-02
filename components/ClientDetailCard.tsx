import React, { useState } from 'react';
import { Client, Credential, Task, TaskStatus } from '../types';

interface ClientDetailCardProps {
  client: Client;
  tasks: Task[];
  onClose: () => void;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
  onDelete: (client: Client) => void;
}

const DetailRow: React.FC<{ label: string; value?: string | number | Date | null | React.ReactNode; fullWidth?: boolean }> = ({ label, value, fullWidth = false }) => {
    if (!value && value !== 0) return null;

    const displayValue = value instanceof Date ? value.toLocaleDateString('ru-RU') : value;

    return (
        <div className={fullWidth ? 'col-span-2' : ''}>
            <p className="text-sm font-medium text-slate-500">{label}</p>
            <p className="text-slate-900">{displayValue}</p>
        </div>
    );
};

export const ClientDetailCard: React.FC<ClientDetailCardProps> = ({ client, tasks, onClose, onEdit, onArchive, onDelete }) => {
    const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
    
    const clientTasks = tasks.filter(task => task.clientIds.includes(client.id));
    const taskSummary = clientTasks.reduce((acc, task) => {
        if(task.status !== TaskStatus.Completed) {
            acc[task.status] = (acc[task.status] || 0) + 1;
        }
        return acc;
    }, {} as Record<TaskStatus, number>);

    const togglePasswordVisibility = (credId: string) => {
        setVisiblePasswords(prev => {
            const newSet = new Set(prev);
            if (newSet.has(credId)) {
                newSet.delete(credId);
            } else {
                newSet.add(credId);
            }
            return newSet;
        });
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md max-h-[calc(100vh-160px)] flex flex-col">
            <div className="flex justify-between items-start pb-4 border-b">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">{client.legalForm} «{client.name}»</h2>
                    <p className="text-slate-500">ИНН: {client.inn} {client.kpp && `/ КПП: ${client.kpp}`}</p>
                </div>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="overflow-y-auto flex-1 py-6 space-y-6">
                 {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <DetailRow label="ОГРН/ОГРНИП" value={client.ogrn} />
                    <DetailRow label="Дата ОГРН" value={client.ogrnDate} />
                    <DetailRow label="Юридический адрес" value={client.legalAddress} fullWidth />
                    <DetailRow label="Фактический адрес" value={client.actualAddress} fullWidth />
                    <DetailRow label="Системы налогообложения" value={client.taxSystems.join(', ')} fullWidth />
                     <DetailRow label="Наемные сотрудники" value={client.hasEmployees ? 'Есть' : 'Нет'} />
                </div>
                
                 {/* Contacts */}
                <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-2 border-b pb-1">Контакты</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
                        <DetailRow label="Контактное лицо" value={client.contactPerson} />
                        <DetailRow label="Телефон" value={client.phone} />
                        <DetailRow label="Email" value={client.email} fullWidth />
                    </div>
                </div>

                {/* Task Summary */}
                <div>
                     <h3 className="text-lg font-semibold text-slate-800 mb-2 border-b pb-1">Активные задачи</h3>
                     <div className="flex gap-4 pt-2">
                         {Object.keys(taskSummary).length > 0 ? (
                             Object.entries(taskSummary).map(([status, count]) => (
                                 <div key={status} className="text-center">
                                     <p className="text-2xl font-bold text-slate-800">{count}</p>
                                     <p className="text-sm text-slate-500">{status}</p>
                                 </div>
                             ))
                         ) : (
                             <p className="text-slate-500">Нет активных задач.</p>
                         )}
                     </div>
                </div>

                {/* Patents */}
                {client.patents && client.patents.length > 0 && (
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2 border-b pb-1">Патенты</h3>
                        <div className="space-y-2 pt-2">
                            {client.patents.map((patent) => (
                                <div key={patent.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 bg-slate-50 rounded-md items-center">
                                    <DetailRow label="Название" value={patent.name} />
                                    <DetailRow label="Срок действия" value={`${new Date(patent.startDate).toLocaleDateString('ru-RU')} - ${new Date(patent.endDate).toLocaleDateString('ru-RU')}`} />
                                    <DetailRow label="Автопродление" value={patent.autoRenew ? 'Да' : 'Нет'} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                 {/* Credentials */}
                {client.credentials.length > 0 && (
                     <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2 border-b pb-1">Доступы</h3>
                        <div className="space-y-2 pt-2">
                            {client.credentials.map((cred: Credential) => (
                                <div key={cred.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-2 bg-slate-50 rounded-md items-center">
                                    <DetailRow label="Сервис" value={cred.service} />
                                    <DetailRow label="Логин" value={cred.login} />
                                    <div>
                                        <p className="text-sm font-medium text-slate-500">Пароль</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-slate-900 flex-1 break-all">
                                                {visiblePasswords.has(cred.id) ? cred.password : '********'}
                                            </p>
                                            <button
                                                onClick={() => togglePasswordVisibility(cred.id)}
                                                className="p-1 text-slate-500 hover:text-slate-800"
                                                title={visiblePasswords.has(cred.id) ? 'Скрыть пароль' : 'Показать пароль'}
                                            >
                                                {visiblePasswords.has(cred.id) ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293zM10 12a2 2 0 110-4 2 2 0 010 4z" clipRule="evenodd" />
                                                        <path d="M10 17a9.953 9.953 0 01-4.522-.992l.938-1.126A8.002 8.002 0 0010 15a8.002 8.002 0 004.478-1.118l.938 1.126A9.953 9.953 0 0110 17z" />
                                                    </svg>
                                                ) : (
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Notes */}
                {client.notes && (
                    <div>
                         <h3 className="text-lg font-semibold text-slate-800 mb-2 border-b pb-1">Заметки</h3>
                         <p className="text-slate-700 whitespace-pre-wrap pt-2">{client.notes}</p>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t mt-auto">
                <button onClick={() => onEdit(client)} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Редактировать</button>
                <button onClick={() => onArchive(client)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">В архив</button>
                <button onClick={() => onDelete(client)} className="px-4 py-2 text-sm font-semibold text-red-700 bg-red-100 border border-transparent rounded-md hover:bg-red-200">Удалить</button>
            </div>
        </div>
    );
};