// src/hooks/useTasks.ts
import { useState, useMemo, useEffect } from 'react';
import { Task, LegalEntity, TaskStatus } from '../types';
// ИСПРАВЛЕНИЕ 1: Импортируем правильную функцию
import { generateTasksForLegalEntity, getTaskStatus } from '../services/taskGenerator'; 

// Функция для уведомлений
const showNotification = (title: string, options: NotificationOptions) => {
  if (Notification.permission === 'granted') {
    new Notification(title, options);
    if (localStorage.getItem('soundEnabled') === 'true') {
      const audio = new Audio('./notification.mp3');
      audio.play().catch(e => console.error("Audio play failed:", e));
    }
  }
};

export const useTasks = (legalEntities: LegalEntity[], legalEntityMap: Map<string, LegalEntity>) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem('tasks');
    return savedTasks ? JSON.parse(savedTasks).map((t: any) => ({ ...t, dueDate: new Date(t.dueDate) })) : [];
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<Date | null>(null);

  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [tasksForDetailView, setTasksForDetailView] = useState<Task[]>([]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  // Этот useEffect теперь полностью соответствует логике вашего taskGenerator.ts
  useEffect(() => {
    if (legalEntities.length === 0) return;
    
    // Генерируем полный набор ожидаемых авто-задач для всех активных клиентов
    const expectedAutoTasks = legalEntities.flatMap(le => generateTasksForLegalEntity(le));
    
    setTasks(currentTasks => {
      // 1. Сохраняем все задачи, созданные вручную
      const manualTasks = currentTasks.filter(t => !t.isAutomatic);
      
      // 2. Создаем карту существующих авто-задач для быстрого доступа
      const existingAutoTasksMap = new Map<string, Task>();
      currentTasks.forEach(t => {
        if (t.isAutomatic && t.seriesId) {
            existingAutoTasksMap.set(`${t.seriesId}-${t.legalEntityId}`, t);
        }
      });

      // 3. Обновляем или добавляем авто-задачи
      const updatedAutoTasks = expectedAutoTasks.map((expectedTask: Task) => {
        const existingTask = existingAutoTasksMap.get(`${expectedTask.seriesId}-${expectedTask.legalEntityId}`);
        if (existingTask) {
          // Если задача уже существует, сохраняем ее ID и статус, но обновляем все остальное
          return { ...expectedTask, id: existingTask.id, status: existingTask.status };
        }
        // Если задачи нет, просто возвращаем новую сгенерированную
        return expectedTask;
      });

      return [...manualTasks, ...updatedAutoTasks];
    });
  }, [legalEntities]);

  useEffect(() => {
    const checkTasks = () => {
      let changed = false;
      const updatedTasks = tasks.map(task => {
        if (task.status === TaskStatus.Completed) return task;
        
        const newStatus = getTaskStatus(task.dueDate);
        if (task.status !== newStatus) {
            changed = true;
            const entity = legalEntityMap.get(task.legalEntityId);
            if (newStatus === TaskStatus.Overdue) {
                showNotification('Задача просрочена!', { body: `${task.title}\n${entity?.name || ''}` });
            } else if (newStatus === TaskStatus.DueSoon) {
                showNotification('Скоро срок задачи!', { body: `${task.title}\n${entity?.name || ''}` });
            }
            return { ...task, status: newStatus };
        }
        return task;
      });
      if (changed) {
        setTasks(updatedTasks);
      }
    };

    const intervalId = setInterval(checkTasks, 1000 * 60 * 60); // Проверка каждый час
    return () => clearInterval(intervalId);
  }, [tasks, legalEntityMap]);

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => {
    if (taskToEdit && taskToEdit.id) {
      setTasks(tasks.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t));
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        status: getTaskStatus(taskData.dueDate),
        isAutomatic: false,
        ...taskData,
      };
      setTasks(prev => [...prev, newTask]);
    }
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
  };
  
  const handleOpenNewTaskForm = (defaultValues?: Partial<Task>) => {
    const date = defaultValues?.dueDate instanceof Date ? defaultValues.dueDate : new Date();
    const newTaskScaffold: Partial<Task> = {
      dueDate: date,
      ...defaultValues
    };
    setTaskModalDefaultDate(date);
    setTaskToEdit(newTaskScaffold as Task);
    setIsTaskModalOpen(true);
  };

  const handleOpenTaskDetail = (tasks: Task[], date: Date) => {
    setTasksForDetailView(tasks);
    setIsTaskDetailModalOpen(true);
  };

  const handleToggleComplete = (taskId: string, currentStatus: TaskStatus) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newStatus = currentStatus === TaskStatus.Completed ? getTaskStatus(task.dueDate) : TaskStatus.Completed;
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };
  
  const handleEditTaskFromDetail = (task: Task) => {
    setIsTaskDetailModalOpen(false);
    setTimeout(() => {
      setTaskToEdit(task);
      setIsTaskModalOpen(true);
    }, 200);
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks(tasks.filter(t => t.id !== taskId));
    setIsTaskDetailModalOpen(false);
  };

  const handleBulkComplete = (taskIds: string[]) => {
    setTasks(tasks.map(t => taskIds.includes(t.id) ? { ...t, status: TaskStatus.Completed } : t));
  };

  return {
    tasks, isTaskModalOpen, setIsTaskModalOpen, taskToEdit, setTaskToEdit, taskModalDefaultDate,
    isTaskDetailModalOpen, setIsTaskDetailModalOpen, tasksForDetailView,
    handleSaveTask,
    handleOpenNewTaskForm,
    handleOpenTaskDetail, handleToggleComplete, handleEditTaskFromDetail, handleDeleteTask, handleBulkComplete,
  };
};