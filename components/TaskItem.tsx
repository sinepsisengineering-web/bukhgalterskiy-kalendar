import React, { useMemo } from 'react';
import { Task, TaskStatus, Client } from '../types';
import { TASK_STATUS_STYLES } from '../constants';

interface TaskItemProps {
  tasks: Task[];
  clients: Client[];
  onOpenDetail: (tasks: Task[]) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ tasks, clients, onOpenDetail, onDeleteTask }) => {
  if (tasks.length === 0) return null;

  const mainTask = tasks[0];
  const isGrouped = tasks.length > 1;

  const uncompletedTasks = useMemo(() => tasks.filter(t => t.status !== TaskStatus.Completed), [tasks]);
  const isAllCompleted = uncompletedTasks.length === 0;

  const overallStatus = useMemo(() => {
    if (isAllCompleted) return TaskStatus.Completed;
    if (uncompletedTasks.some(t => t.status === TaskStatus.Overdue)) return TaskStatus.Overdue;
    if (uncompletedTasks.some(t => t.status === TaskStatus.DueSoon)) return TaskStatus.DueSoon;
    return TaskStatus.InProgress;
  }, [uncompletedTasks, isAllCompleted]);

  const statusStyle = TASK_STATUS_STYLES[overallStatus];

  const clientNames = isGrouped
    ? `Невыполнено для ${uncompletedTasks.length} из ${tasks.length} клиентов`
    : tasks[0].clientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(', ') || 'Общая задача';
  
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteTask(mainTask.id);
  };

  return (
    <div
      onClick={() => onOpenDetail(tasks)}
      className={`p-3 flex items-start justify-between gap-4 border-l-4 rounded cursor-pointer transition-shadow hover:shadow-md ${statusStyle.bg} ${statusStyle.border}`}
    >
      <div className="flex-1">
        <p className={`font-semibold ${statusStyle.text} ${isAllCompleted ? 'line-through text-slate-500' : ''}`}>
          {mainTask.title}
        </p>
        <p className="text-sm text-slate-500">{clientNames}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex flex-col items-end">
          <p className={`text-sm font-medium ${statusStyle.text}`}>{overallStatus}</p>
          <p className="text-sm text-slate-600">
            {mainTask.dueDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        {!mainTask.isAutomatic && (
            <button 
                type="button" 
                onClick={handleDeleteClick} 
                className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-full"
                title="Удалить задачу"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                </svg>
            </button>
        )}
      </div>
    </div>
  );
};