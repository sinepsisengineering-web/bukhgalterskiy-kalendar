// components/TaskDetailModal.tsx

import React, { useMemo } from 'react';
import { Modal } from './Modal';
// <<< ИЗМЕНЕНО: Импортируем LegalEntity вместо Client >>>
import { LegalEntity, Task, TaskStatus } from '../types';
import { TASK_STATUS_STYLES } from '../constants';
import { isTaskLocked } from '../services/taskGenerator';

// <<< ИЗМЕНЕНО: Пропсы обновлены >>>
interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  legalEntities: LegalEntity[];
  onToggleComplete: (taskId: string, currentStatus: TaskStatus) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onSelectLegalEntity: (entity: LegalEntity) => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  onClose,
  tasks,
  legalEntities,
  onToggleComplete,
  onEdit,
  onDelete,
  onSelectLegalEntity,
}) => {
  if (!isOpen || tasks.length === 0) return null;

  // <<< ИЗМЕНЕНО: Карта стала проще >>>
  const legalEntityMap = useMemo(() => {
    return new Map(legalEntities.map(le => [le.id, le]));
  }, [legalEntities]);

  const mainTask = tasks[0];
  const isGrouped = tasks.length > 1;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isGrouped ? `Задачи на ${new Date(mainTask.dueDate).toLocaleDateString('ru-RU')}` : mainTask.title}>
      <div className="p-4 space-y-4">
        {tasks.map(task => {
          // <<< ИЗМЕНЕНО: Логика получения юр. лица и его имени >>>
          const legalEntity = legalEntityMap.get(task.legalEntityId);
          const clientDisplayName = legalEntity ? `${legalEntity.legalForm} «${legalEntity.name}»` : 'Юр. лицо не найдено';
          
          const statusStyle = TASK_STATUS_STYLES[task.status];
          const isCompleted = task.status === TaskStatus.Completed;
          const locked = isTaskLocked(task);

          return (
            <div key={task.id} className={`p-3 rounded-md border-l-4 ${statusStyle.bg} ${statusStyle.border}`}>
              <div className="flex justify-between items-start">
                <div>
                  {isGrouped && <p className={`font-semibold ${statusStyle.text}`}>{task.title}</p>}
                  {/* <<< ИЗМЕНЕНО: Обработчик клика теперь работает с legalEntity >>> */}
                  <p 
                    className="text-sm text-slate-600 hover:text-indigo-600 cursor-pointer"
                    onClick={() => legalEntity && onSelectLegalEntity(legalEntity)}
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
                        <button onClick={() => onDelete(task.id)} className="p-1 text-sm font-semibold text-red-600 hover:text-red-800">
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
                     <button 
                        onClick={() => onToggleComplete(task.id, task.status)}
                        disabled={locked && !isCompleted}
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