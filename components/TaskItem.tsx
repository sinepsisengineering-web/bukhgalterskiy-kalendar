// components/TaskItem.tsx

import React from 'react';
import { Task, TaskStatus } from '../types';
import { TASK_STATUS_STYLES } from '../constants';
import { isTaskLocked } from '../services/taskGenerator';

interface TaskItemProps {
  task: Task;
  clientName: string;
  isSelected: boolean;
  onTaskSelect: (taskId: string, isSelected: boolean) => void;
  onOpenDetail: (task: Task) => void; // Изменено на (task: Task) для единообразия
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, clientName, isSelected, onTaskSelect, onOpenDetail }) => {
  if (!task) {
    return null;
  }

  const locked = isTaskLocked(task);
  const statusStyle = TASK_STATUS_STYLES[task.status];

  const handleSelectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // <<<===== ВОТ ГЛАВНОЕ ИСПРАВЛЕНИЕ: Добавляем логическую проверку!
    if (locked || task.status === TaskStatus.Completed) return;
    
    onTaskSelect(task.id, e.target.checked);
  };
  
  const isCompleted = task.status === TaskStatus.Completed;

  return (
    <div
      onClick={() => onOpenDetail(task)} // Передаем одну задачу
      className={`p-3 flex items-center justify-between gap-4 border-l-4 rounded cursor-pointer transition-shadow hover:shadow-md ${statusStyle.bg} ${statusStyle.border}`}
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelectToggle}
          onClick={(e) => e.stopPropagation()}
          disabled={locked || isCompleted}
          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <div className="flex-1">
          <p className={`font-semibold ${statusStyle.text} ${isCompleted ? 'line-through text-slate-500' : ''}`}>
            {task.title}
          </p>
          <p className="text-sm text-slate-500">{clientName}</p>
        </div>
      </div>
      
      <div className="flex flex-col items-end text-right">
        <p className={`text-sm font-medium ${statusStyle.text}`}>{task.status}</p>
        <p className="text-sm text-slate-600">
          {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
};