import React, { useMemo } from 'react';
import { Task, TaskStatus, Client } from '../types';
import { TASK_STATUS_STYLES } from '../constants';

interface TaskItemProps {
  tasks: Task[];
  clients: Client[];
  onOpenDetail: (tasks: Task[]) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ tasks, clients, onOpenDetail }) => {
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

  return (
    <div
      onClick={() => onOpenDetail(tasks)}
      className={`p-3 flex items-start gap-4 border-l-4 rounded cursor-pointer transition-shadow hover:shadow-md ${statusStyle.bg} ${statusStyle.border}`}
    >
      <div className="flex-1">
        <p className={`font-semibold ${statusStyle.text} ${isAllCompleted ? 'line-through text-slate-500' : ''}`}>
          {mainTask.title}
        </p>
        <p className="text-sm text-slate-500">{clientNames}</p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-medium ${statusStyle.text}`}>{overallStatus}</p>
        <p className="text-sm text-slate-600">
          {mainTask.dueDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
      </div>
    </div>
  );
};
