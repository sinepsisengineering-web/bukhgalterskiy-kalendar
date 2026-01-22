// hooks/useTasks.ts
import { useState, useEffect, useRef } from 'react';
import { Task, LegalEntity, TaskStatus } from '../types';
import { generateTasksForLegalEntity, updateTaskStatuses, adjustDate, generateRepeatingDates, getSeriesDeletionCandidates } from '../services/taskGenerator';
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

  // <<< ВОЗВРАЩАЕМ ЭТОТ useEffect К ЕГО ПРОСТОЙ И ОРИГИНАЛЬНОЙ ВЕРСИИ >>>
  useEffect(() => {
    if (legalEntities.length === 0) return;

    // Генератор теперь сам знает, как правильно обработать каждого клиента, используя его `createdAt`
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
          // Сохраняем статус, особенно 'Completed'
          return { ...expectedTask, status: existingTask.status };
        }
        return expectedTask;
      });
      const allTasks = [...manualTasks, ...updatedAutoTasks];
      return updateTaskStatuses(allTasks);
    });
  }, [legalEntities]); // Зависимость от legalEntities остается, это правильно

  useEffect(() => {
    if (tasks.length > 0 && legalEntityMap.size > 0 && !notificationCheckRef.current) {
      checkNotificationsOnStartup(tasks, legalEntityMap);
      initializeAllTimers(tasks);
      notificationCheckRef.current = true;
    }
  }, [tasks, legalEntityMap]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('Плановая проверка и обновление статусов задач...');
      setTasks(currentTasks => updateTaskStatuses(currentTasks));
    }, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => {
    let savedTask: Task | undefined;



    if (taskToEdit && taskToEdit.id) {
      // --- РЕДАКТИРОВАНИЕ ---

      const wasManualSeries = !taskToEdit.isAutomatic && !!taskToEdit.seriesId;
      const willBeSeries = taskData.repeat !== 'none';

      if (wasManualSeries) {
        // --- РЕДАКТИРОВАНИЕ СУЩЕСТВУЮЩЕЙ СЕРИИ ---

        if (taskData.repeat !== taskToEdit.repeat) {
          // 1. Изменилась частота повторения (например, Месяц -> Неделя, или Месяц -> Нет)

          if (!willBeSeries) {
            // 1.1 Серия превращается в одиночную задачу (repeat = 'none') (М -> Нет)
            // Удаляем все задачи серии, КРОМЕ текущей. Текущую обновляем и убираем seriesId.
            const tasksToKeep = tasks.filter(t => t.seriesId !== taskToEdit.seriesId || t.id === taskToEdit.id);

            const updatedSingleTask = {
              ...tasks.find(t => t.id === taskToEdit.id)!,
              ...taskData,
              dueDate: adjustDate(taskData.dueDate, taskData.dueDateRule),
              seriesId: undefined
            };

            // Заменяем старую версию текущей задачи на новую
            const finalTasks = tasksToKeep.map(t => t.id === updatedSingleTask.id ? updatedSingleTask : t);
            setTasks(updateTaskStatuses(finalTasks));
            savedTask = updatedSingleTask;

          } else {
            // 1.2 Частота изменилась, но это всё ещё серия (Месяц -> Неделя)
            // ПЕРЕСОЗДАЕМ БУДУЩУЮ ЧАСТЬ СЕРИИ

            const tasksToKeep = tasks.filter(t => {
              if (t.seriesId !== taskToEdit.seriesId) return true;
              return new Date(t.dueDate) < new Date(taskToEdit.dueDate) && t.id !== taskToEdit.id;
            });

            const newSeriesDates = generateRepeatingDates(taskData.dueDate, taskData.repeat);
            const newSeriesTasks = newSeriesDates.map((date, idx) => {
              const adjustedDate = adjustDate(date, taskData.dueDateRule);
              return {
                id: idx === 0 ? taskToEdit.id : `task-${Date.now()}-${idx}`,
                status: idx === 0 ? taskToEdit.status : TaskStatus.Upcoming,
                isAutomatic: false,
                seriesId: taskToEdit.seriesId,
                ...taskData,
                dueDate: adjustedDate
              } as Task;
            });

            setTasks(updateTaskStatuses([...tasksToKeep, ...newSeriesTasks]));
            savedTask = newSeriesTasks[0];
          }

        } else {
          // 2. Частота НЕ изменилась -> ОБНОВЛЯЕМ ВСЮ СЕРИЮ (Свойства + Сдвиг дат)

          const oldDate = new Date(taskToEdit.dueDate);
          const newDate = new Date(taskData.dueDate);
          const timeDiff = newDate.getTime() - oldDate.getTime();
          const isDateChanged = timeDiff !== 0;

          const updatedTasks = tasks.map(t => {
            if (t.seriesId === taskToEdit.seriesId) {
              const baseUpdate = {
                ...t,
                title: taskData.title,
                description: taskData.description,
                reminder: taskData.reminder,
                dueDateRule: taskData.dueDateRule
              };

              const tDate = new Date(t.dueDate);
              // Сдвигаем даты
              if (isDateChanged && (tDate >= oldDate || t.id === taskToEdit.id)) {
                const shiftedDate = new Date(tDate.getTime() + timeDiff);
                baseUpdate.dueDate = adjustDate(shiftedDate, taskData.dueDateRule);
              } else {
                // Если дата не менялась, пересчитываем правило только если дата >= текущей
                if (tDate >= oldDate || t.id === taskToEdit.id) {
                  baseUpdate.dueDate = adjustDate(t.dueDate, taskData.dueDateRule);
                }
              }
              return baseUpdate;
            }
            return t;
          });

          setTasks(updateTaskStatuses(updatedTasks));
          savedTask = updatedTasks.find(t => t.id === taskToEdit.id);
        }

      } else {
        // --- РЕДАКТИРОВАНИЕ ОДИНОЧНОЙ ЗАДАЧИ ---

        if (willBeSeries && !taskToEdit.isAutomatic) {
          // 3. Одиночная задача ПРЕВРАЩАЕТСЯ в серию (Нет -> Месяц)
          const seriesId = `manual-series-${Date.now()}`;
          const dates = generateRepeatingDates(taskData.dueDate, taskData.repeat);

          const newSeriesTasks = dates.map((date, idx) => {
            const adjustedDate = adjustDate(date, taskData.dueDateRule);
            const isFirst = idx === 0;
            return {
              id: isFirst ? taskToEdit.id : `task-${Date.now()}-${idx}`,
              status: isFirst ? taskToEdit.status : TaskStatus.Upcoming,
              isAutomatic: false,
              seriesId: seriesId,
              ...taskData,
              dueDate: adjustedDate
            } as Task;
          });

          // Заменяем редактируемую задачу на новую серию (удаляем старую, добавляем новую серию)
          // (так как первый элемент серии имеет тот же ID, что и старая задача, дубликата не будет, если старую убрать)
          const otherTasks = tasks.filter(t => t.id !== taskToEdit.id);
          setTasks(updateTaskStatuses([...otherTasks, ...newSeriesTasks]));
          savedTask = newSeriesTasks[0];

        } else {
          // 4. Обычное редактирование одиночной задачи
          const updatedTasks = tasks.map(t => {
            if (t.id === taskToEdit.id) {
              const adjustedDueDate = t.isAutomatic ? taskData.dueDate : adjustDate(taskData.dueDate, taskData.dueDateRule);
              savedTask = { ...t, ...taskData, dueDate: adjustedDueDate, reminder: taskData.reminder };
              return savedTask;
            }
            return t;
          });
          setTasks(updateTaskStatuses(updatedTasks));
        }
      }

    } else {
      // --- СОЗДАНИЕ НОВОЙ ЗАДАЧИ ---

      const dates = generateRepeatingDates(taskData.dueDate, taskData.repeat);
      const seriesId = taskData.repeat !== 'none' ? `manual-series-${Date.now()}` : undefined;

      const newTasks = dates.map((date, index) => {
        const adjustedDueDate = adjustDate(date, taskData.dueDateRule);
        return {
          id: `task-${Date.now()}-${index}`,
          status: TaskStatus.Upcoming,
          isAutomatic: false,
          seriesId: seriesId,
          ...taskData,
          dueDate: adjustedDueDate,
        } as Task;
      });

      savedTask = newTasks[0];
      setTasks(updateTaskStatuses([...tasks, ...newTasks]));
    }

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

  // --- Управление модальным окном удаления серии ---
  const [deleteSeriesModal, setDeleteSeriesModal] = useState<{ isOpen: boolean; task: Task | null }>({
    isOpen: false,
    task: null
  });

  const handleDeleteTask = (taskId: string) => {
    const taskToDelete = tasks.find(t => t.id === taskId);
    if (!taskToDelete) return;

    // Автоматические задачи или одиночные задачи удаляем сразу
    if (taskToDelete.isAutomatic || (!taskToDelete.seriesId && taskToDelete.repeat === 'none')) {
      cancelNotificationsForTask(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      setIsTaskDetailModalOpen(false);
      return;
    }

    // Если это ручная задача с повторением — спрашиваем пользователя
    setDeleteSeriesModal({ isOpen: true, task: taskToDelete });
  };

  const handleConfirmDeletion = (mode: 'single' | 'series') => {
    const { task } = deleteSeriesModal;
    if (!task) return;

    const idsToDelete = getSeriesDeletionCandidates(tasks, task, mode);

    idsToDelete.forEach(id => cancelNotificationsForTask(id));
    setTasks(prev => prev.filter(t => !idsToDelete.includes(t.id)));

    setDeleteSeriesModal({ isOpen: false, task: null });
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

  const handleBulkDelete = (taskIds: string[]) => {
    const idsToDelete = new Set(taskIds);
    taskIds.forEach(id => cancelNotificationsForTask(id));
    setTasks(prevTasks => prevTasks.filter(task => !idsToDelete.has(task.id)));
  };

  const handleDeleteTasksForLegalEntity = (legalEntityId: string) => {
    setTasks(prevTasks => {
      const tasksToDelete = prevTasks.filter(task => task.legalEntityId === legalEntityId);
      tasksToDelete.forEach(task => cancelNotificationsForTask(task.id));
      return prevTasks.filter(task => task.legalEntityId !== legalEntityId);
    });
  };

  return {
    tasks, isTaskModalOpen, setIsTaskModalOpen, taskToEdit, setTaskToEdit, taskModalDefaultDate,
    isTaskDetailModalOpen, setIsTaskDetailModalOpen, tasksForDetailView, setTasksForDetailView,
    handleSaveTask,
    handleOpenNewTaskForm,
    handleOpenTaskDetail, handleToggleComplete, handleEditTaskFromDetail, handleDeleteTask, handleBulkComplete,
    handleBulkDelete,
    handleDeleteTasksForLegalEntity,
    deleteSeriesModal, setDeleteSeriesModal, handleConfirmDeletion
  };
};