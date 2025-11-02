import React from 'react';
import { Task, Client, TaskStatus } from '../types';
import { Modal } from './Modal';
import { TASK_STATUS_STYLES } from '../constants';
import { isTaskCompletable } from '../services/taskGenerator';

interface TaskDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    tasks: Task[];
    clients: Client[];
    onToggleComplete: (taskId: string, currentStatus: TaskStatus) => void;
    onEdit: (task: Task) => void;
    onSelectClient: (client: Client) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ isOpen, onClose, tasks, clients, onToggleComplete, onEdit, onSelectClient }) => {
    if (!isOpen || tasks.length === 0) return null;

    const mainTask = tasks[0];
    const uncompletedTasks = tasks.filter(task => task.status !== TaskStatus.Completed);
    const totalTaskCount = tasks.length;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Информация о задаче">
            <div className="space-y-6">
                <div>
                    <h3 className="text-2xl font-bold text-slate-800">{mainTask.title}</h3>
                    <p className="text-sm text-slate-500">
                        Срок: {mainTask.dueDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>

                {mainTask.description && (
                    <div>
                        <h4 className="font-semibold text-slate-700">Описание</h4>
                        <p className="mt-1 text-slate-600 whitespace-pre-wrap">{mainTask.description}</p>
                    </div>
                )}
                
                <div>
                    <h4 className="font-semibold text-slate-700 mb-2">
                        Клиенты ({uncompletedTasks.length} из {totalTaskCount})
                    </h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2 border-t pt-2">
                        {uncompletedTasks.length > 0 ? uncompletedTasks.map(task => {
                            const client = clients.find(c => c.id === task.clientIds[0]);
                            if (!client) return null;

                            const statusStyle = TASK_STATUS_STYLES[task.status];
                            const canComplete = isTaskCompletable(task);

                            return (
                                <div key={task.id} className={`p-3 flex items-center justify-between gap-4 rounded-md ${statusStyle.bg}`}>
                                    <div>
                                        <button onClick={() => onSelectClient(client)} className="font-semibold text-indigo-700 hover:underline text-left">
                                            {client.name}
                                        </button>
                                        <p className={`text-xs font-medium ${statusStyle.text}`}>{task.status}</p>
                                    </div>
                                    <button 
                                        onClick={() => onToggleComplete(task.id, task.status)}
                                        disabled={!canComplete}
                                        title={!canComplete ? 'Выполнение будет доступно в соответствующем отчетном периоде' : `Выполнить для ${client.name}`}
                                        className="px-4 py-1.5 text-sm font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors shadow-sm disabled:bg-slate-200 disabled:text-slate-500 disabled:cursor-not-allowed"
                                        aria-label={`Выполнить для ${client.name}`}
                                    >
                                        Выполнить
                                    </button>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-6 text-slate-500">
                                <p className="font-semibold text-lg text-green-600">Все задачи по клиентам выполнены!</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4 flex justify-end gap-4 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Закрыть</button>
                    <button type="button" onClick={() => onEdit(mainTask)} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Редактировать</button>
                </div>
            </div>
        </Modal>
    );
};