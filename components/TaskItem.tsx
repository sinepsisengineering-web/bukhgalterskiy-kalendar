// components/TaskItem.tsx

import React from 'react';
import { Task, TaskStatus } from '../types';
import { TASK_STATUS_STYLES } from '../constants';

interface TaskItemProps {
  task: Task;
  clientName: string;
  isSelected: boolean; // Новый пропс: выбрана ли задача
  onTaskSelect: (taskId: string, isSelected: boolean) => void; // Новый пропс: обработчик выбора
  onOpenDetail: (task: Task) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, clientName, isSelected, onTaskSelect, onOpenDetail }) => {
  const statusStyle = TASK_STATUS_STYLES[task.status];

  const handleSelectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Эта функция теперь ТОЛЬКО для чекбокса
    e.stopPropagation(); // ВАЖНО: останавливаем всплытие события
    onTaskSelect(task.id, e.target.checked);
  };
  
  const isCompleted = task.status === TaskStatus.Completed;

  return (
    // Клик на div теперь открывает детали
    <div
      onClick={() => onOpenDetail(task)}
      className={`p-3 flex items-center justify-between gap-4 border-l-4 rounded cursor-pointer transition-shadow hover:shadow-md ${statusStyle.bg} ${statusStyle.border}`}
    >
      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleSelectToggle}
          onClick={(e) => e.stopPropagation()} // Дополнительная защита для некоторых браузеров
          className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
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