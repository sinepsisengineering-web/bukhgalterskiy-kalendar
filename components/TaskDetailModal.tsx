// components/TaskDetailModal.tsx

import React, { useMemo } from 'react';
import { Modal } from './Modal';
import { Client, Task, TaskStatus } from '../types';
import { TASK_STATUS_STYLES } from '../constants';
import { isTaskLocked } from '../services/taskGenerator'; // <<<===== ШАГ 1: ИМПОРТИРУЕМ ЛОГИКУ

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  clients: Client[];
  onToggleComplete: (taskId: string, currentStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onSelectClient: (client: Client) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  tasks,
  clients,
  onToggleComplete,
  onEdit,
  onDelete,
  onSelectClient,
}) => {
  if (!isOpen || tasks.length === 0) return null;

  const legalEntityMap = useMemo(() => {
    const map = new Map<string, { legalEntityName: string, clientName: string, clientId: string }>();
    clients.forEach(client => {
      if (client.legalEntities) {
        client.legalEntities.forEach(le => {
          map.set(le.id, { 
              legalEntityName: le.name, 
              clientName: client.name, 
              clientId: client.id 
          });
        });
      }
    });
    return map;
  }, [clients]);

  const mainTask = tasks[0];
  const isGrouped = tasks.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isGrouped ? `Задачи на ${new Date(mainTask.dueDate).toLocaleDateString('ru-RU')}` : mainTask.title}>
      <div className="p-4 space-y-4">
        {tasks.map(task => {
          const entityInfo = legalEntityMap.get(task.legalEntityId);
          const clientDisplayName = entityInfo ? `${entityInfo.clientName} (${entityInfo.legalEntityName})` : 'Клиент не найден';
          const clientObject = clients.find(c => c.id === entityInfo?.clientId);
          const statusStyle = TASK_STATUS_STYLES[task.status];
          const isCompleted = task.status === TaskStatus.Completed;
          
          // <<<===== ШАГ 2: ПРОВЕРЯЕМ БЛОКИРОВКУ ДЛЯ КАЖДОЙ ЗАДАЧИ
          const locked = isTaskLocked(task);

          return (
            <div key={task.id} className={`p-3 rounded-md border-l-4 ${statusStyle.bg} ${statusStyle.border}`}>
              <div className="flex justify-between items-start">
                <div>
                  {isGrouped && <p className={`font-semibold ${statusStyle.text}`}>{task.title}</p>}
                  <p 
                    className="text-sm text-slate-600 hover:text-indigo-600 cursor-pointer"
                    onClick={() => clientObject && onSelectClient(clientObject)}
                  >
                    {clientDisplayName}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{task.status}</span>
                </div>
              </div>

              {task.description && <p className="mt-2 text-sm text-slate-700">{task.description}</p>}

              <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center">
                 <div>
                    {!task.isAutomatic && (
                        <button 
                            onClick={() => onDelete(task.id)} 
                            className="p-1 text-sm font-semibold text-red-600 hover:text-red-800"
                        >
                            Удалить
                        </button>
                    )}
                 </div>
                 <div className="flex justify-end gap-3">
                     {!task.isAutomatic && (
                        <button onClick={() => onEdit(task)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">
                            Редактировать
                        </button>
                     )}
                     {/* <<<===== ШАГ 3: ОБНОВЛЯЕМ КНОПКУ, ДОБАВЛЯЕМ DISABLED И TITLE =====>>> */}
                     <button 
                        onClick={() => onToggleComplete(task.id, task.status)}
                        disabled={locked && !isCompleted} // Блокируем, только если задача locked И не выполнена
                        title={locked && !isCompleted ? 'Эту задачу нельзя выполнить до начала отчетного периода' : ''}
                        className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors
                          ${isCompleted 
                            ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                          } 
                          disabled:bg-slate-400 disabled:cursor-not-allowed`}
                     >
                        {isCompleted ? 'Вернуть в работу' : 'Выполнить'}
                     </button>
                 </div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};