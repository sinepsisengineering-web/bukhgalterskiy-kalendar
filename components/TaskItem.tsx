// src/components/TaskItem.tsx

import React from 'react';
import { Task, TaskStatus } from '../types';
import { TASK_STATUS_STYLES } from '../constants';
import { isTaskLocked } from '../services/taskGenerator';
import { useConfirmation } from '../contexts/ConfirmationProvider';

interface TaskItemProps {
  task: Task;
  clientName: string;
  isSelected: boolean;
  onTaskSelect: (taskId: string, isSelected: boolean) => void;
  onOpenDetail: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, clientName, isSelected, onTaskSelect, onOpenDetail, onDeleteTask }) => {
  const confirm = useConfirmation();

  if (!task) {
    return null;
  }

  const locked = isTaskLocked(task);
  const statusStyle = TASK_STATUS_STYLES[task.status];

  const handleSelectToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (locked) return;
    onTaskSelect(task.id, e.target.checked);
  };

  const handleDeleteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
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
      onDeleteTask(task.id);
    }
  };
  
  const isCompleted = task.status === TaskStatus.Completed;

  return (
    <div
      onClick={() => onOpenDetail(task)}
      className={`p-3 flex items-center gap-4 border-l-4 rounded cursor-pointer transition-shadow hover:shadow-md ${statusStyle.bg} ${statusStyle.border}`}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleSelectToggle}
        onClick={(e) => e.stopPropagation()}
        disabled={locked}
        className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      
      <div className="flex-1 min-w-0">
        <p className={`font-semibold truncate ${statusStyle.text} ${isCompleted ? 'line-through text-slate-500' : ''}`}>
          {task.title}
        </p>
        <p className="text-sm text-slate-500 truncate">{clientName}</p>
      </div>
      
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="hidden sm:flex flex-col items-end text-right">
          <p className={`text-sm font-medium ${statusStyle.text}`}>{task.status}</p>
          <p className="text-sm text-slate-600">
            {/* ====== ВОТ ИСПРАВЛЕННАЯ СТРОКА ====== */}
            {new Date(task.dueDate).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </p>
        </div>
        <button 
          onClick={handleDeleteClick}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Удалить задачу"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};