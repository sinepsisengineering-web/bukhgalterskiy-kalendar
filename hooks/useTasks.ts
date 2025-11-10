// hooks/useTasks.ts
import { useState, useEffect, useRef } from 'react';
import { Task, LegalEntity, TaskStatus } from '../types';
import { generateTasksForLegalEntity, updateTaskStatuses } from '../services/taskGenerator';
import { checkNotificationsOnStartup } from '../services/notificationService';
import { 
  initializeAllTimers,
  scheduleNotificationsForTask,
  cancelNotificationsForTask
} from '../services/timedNotificationService';

export const useTasks = (legalEntities: LegalEntity[], legalEntityMap: Map<string, LegalEntity>) => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const savedTasks = localStorage.getItem('tasks');
    if (!savedTasks) return [];
    const parsedTasks = JSON.parse(savedTasks);
    const validStatuses = Object.values(TaskStatus);
    return parsedTasks.map((task: any) => {
      if (!task.status || !validStatuses.includes(task.status)) {
        task.status = TaskStatus.Upcoming;
      }
      return { ...task, dueDate: new Date(task.dueDate) };
    });
  });

  const notificationCheckRef = useRef(false);

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
    if (tasks.length > 0 && legalEntityMap.size > 0 && !notificationCheckRef.current) {
      checkNotificationsOnStartup(tasks, legalEntityMap);
      initializeAllTimers(tasks);
      notificationCheckRef.current = true;
    }
  }, [tasks, legalEntityMap]);

  // --- НОВЫЙ БЛОК: Периодическое обновление статусов ---
  useEffect(() => {
    // Устанавливаем интервал, который будет срабатывать каждую минуту
    const intervalId = setInterval(() => {
      console.log('Плановая проверка и обновление статусов задач...');
      // Используем функциональную форму setTasks, чтобы всегда работать с актуальным состоянием
      setTasks(currentTasks => updateTaskStatuses(currentTasks));
    }, 60 * 1000); // 60 000 миллисекунд = 1 минута

    // Эта функция будет вызвана, когда компонент "умирает".
    // Она остановит таймер, чтобы избежать утечек памяти и лишних вызовов.
    return () => clearInterval(intervalId);
  }, []); // Пустой массив зависимостей означает, что этот эффект запустится только один раз

  // --- Остальной код остается без изменений ---

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => {
    let savedTask: Task | undefined;
    let updatedTasks;
    if (taskToEdit && taskToEdit.id) {
      updatedTasks = tasks.map(t => {
        if (t.id === taskToEdit.id) {
          savedTask = { ...t, ...taskData, reminder: taskData.reminder };
          return savedTask;
        }
        return t;
      });
    } else {
      const newTask: Task = {
        id: `task-${Date.now()}`,
        status: TaskStatus.Upcoming,
        isAutomatic: false,
        ...taskData,
      };
      savedTask = newTask;
      updatedTasks = [...tasks, newTask];
    }
    setTasks(updateTaskStatuses(updatedTasks));
    if (savedTask) {
      scheduleNotificationsForTask(savedTask);
    }
    setIsTaskModalOpen(false);
    setTaskToEdit(null);
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks(currentTasks => {
      let targetTask: Task | undefined;
      const newTasks = currentTasks.map(t => {
        if (t.id === taskId) {
          const temporaryStatus = t.status === TaskStatus.Completed 
            ? TaskStatus.Upcoming
            : TaskStatus.Completed;
          targetTask = { ...t, status: temporaryStatus };
          return targetTask;
        }
        return t;
      });
      if (targetTask) {
        if (targetTask.status === TaskStatus.Completed) {
          cancelNotificationsForTask(targetTask.id);
        } else {
          scheduleNotificationsForTask(targetTask);
        }
      }
      return updateTaskStatuses(newTasks);
    });
  };

  const handleDeleteTask = (taskId: string) => {
    cancelNotificationsForTask(taskId);
    setTasks(tasks.filter(t => t.id !== taskId));
    setIsTaskDetailModalOpen(false);
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
  
  const handleEditTaskFromDetail = (task: Task) => {
    setIsTaskDetailModalOpen(false);
    setTimeout(() => {
      setTaskToEdit(task);
      setIsTaskModalOpen(true);
    }, 200);
  };

  const handleBulkComplete = (taskIds: string[]) => {
    const updatedTasks = tasks.map(t => {
      if (taskIds.includes(t.id)) {
        cancelNotificationsForTask(t.id);
        return { ...t, status: TaskStatus.Completed };
      }
      return t;
    });
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