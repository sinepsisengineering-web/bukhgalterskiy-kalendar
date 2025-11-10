// src/hooks/useTasks.ts
import { useState, useMemo, useEffect } from 'react';
import { Task, LegalEntity, TaskStatus } from '../types';
import { generateTasksForLegalEntity, getTaskStatus, updateTaskStatuses } from '../services/taskGenerator'; 

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
  // <<< ИЗМЕНЕНО: Реализована "пуленепробиваемая" логика миграции статусов >>>
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem('tasks');
    if (!savedTasks) return [];

    const parsedTasks = JSON.parse(savedTasks);
    
    // Получаем массив всех ДОПУСТИМЫХ значений статуса из нашего enum
    const validStatuses = Object.values(TaskStatus);

    return parsedTasks.map((task: any) => {
      // ПРОВЕРКА: Если у задачи нет статуса или ее статус НЕ является одним из допустимых...
      if (!task.status || !validStatuses.includes(task.status)) {
        // ...мы присваиваем ей безопасный статус по умолчанию.
        // Дальше функция updateTaskStatuses все равно вычислит правильный.
        task.status = TaskStatus.Upcoming;
      }
      
      // Преобразуем строку даты в объект Date
      return { ...task, dueDate: new Date(task.dueDate) };
    });
  });

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<Date | null>(null);

  const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
  const [tasksForDetailView, setTasksForDetailView] = useState<Task[]>([]);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (legalEntities.length === 0) return;
    
    const expectedAutoTasks = legalEntities.flatMap(le => generateTasksForLegalEntity(le));
    
    setTasks(currentTasks => {
      const manualTasks = currentTasks.filter(t => !t.isAutomatic);
      const existingAutoTasksMap = new Map<string, Task>();
      currentTasks.forEach(t => {
        if (t.isAutomatic && t.id) {
            existingAutoTasksMap.set(t.id, t);
        }
      });

      const updatedAutoTasks = expectedAutoTasks.map((expectedTask: Task) => {
        const existingTask = existingAutoTasksMap.get(expectedTask.id);
        if (existingTask) {
          return { ...expectedTask, status: existingTask.status };
        }
        return expectedTask;
      });

      const allTasks = [...manualTasks, ...updatedAutoTasks];
      return updateTaskStatuses(allTasks);
    });
  }, [legalEntities]);

  useEffect(() => {
    const checkTasks = () => {
      setTasks(currentTasks => {
        const newTasks = updateTaskStatuses(currentTasks);
        
        newTasks.forEach((newTask, index) => {
          const oldTask = currentTasks[index];
          if (oldTask && oldTask.status !== newTask.status) {
            const entity = legalEntityMap.get(newTask.legalEntityId);
            const entityName = entity?.name || '';
            
            if (newTask.status === TaskStatus.Overdue && oldTask.status !== TaskStatus.Overdue) {
                showNotification('Задача просрочена!', { body: `${newTask.title}\n${entityName}` });
            } else if (newTask.status === TaskStatus.DueToday && oldTask.status !== TaskStatus.DueToday) {
                showNotification('Срок задачи сегодня!', { body: `${newTask.title}\n${entityName}` });
            }
          }
        });
        
        return newTasks;
      });
    };

    checkTasks(); 

    const intervalId = setInterval(checkTasks, 1000 * 60 * 30);
    return () => clearInterval(intervalId);
  }, [legalEntityMap]);

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => {
    let updatedTasks;
    if (taskToEdit && taskToEdit.id) {
      updatedTasks = tasks.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t);
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        status: TaskStatus.Upcoming,
        isAutomatic: false,
        ...taskData,
      };
      updatedTasks = [...tasks, newTask];
    }
    setTasks(updateTaskStatuses(updatedTasks));
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

  const handleToggleComplete = (taskId: string) => {
    setTasks(currentTasks => {
      const task = currentTasks.find(t => t.id === taskId);
      if (!task) return currentTasks;

      const newTasks = currentTasks.map(t => {
        if (t.id === taskId) {
          const temporaryStatus = t.status === TaskStatus.Completed 
            ? TaskStatus.Upcoming
            : TaskStatus.Completed;
          return { ...t, status: temporaryStatus };
        }
        return t;
      });

      return updateTaskStatuses(newTasks);
    });
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
    const updatedTasks = tasks.map(t => taskIds.includes(t.id) ? { ...t, status: TaskStatus.Completed } : t)
    setTasks(updateTaskStatuses(updatedTasks));
  };

  return {
    tasks, isTaskModalOpen, setIsTaskModalOpen, taskToEdit, setTaskToEdit, taskModalDefaultDate,
    isTaskDetailModalOpen, setIsTaskDetailModalOpen, tasksForDetailView,
    handleSaveTask,
    handleOpenNewTaskForm,
    handleOpenTaskDetail, handleToggleComplete, handleEditTaskFromDetail, handleDeleteTask, handleBulkComplete,
  };
};