import { useState, useEffect, useCallback } from 'react';
import { Task, Client, TaskStatus, ReminderSetting } from '../types';
// <<<===== ИМПОРТИРУЕМ isTaskLocked
import { generateAllTasks, updateTaskStatuses, getTaskStatus, isTaskLocked } from '../services/taskGenerator';

// Функция для воспроизведения звука, вынесенная из App.tsx
const notificationSound = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');

export const useTasks = (activeClients: Client[], legalEntityMap: Map<string, any>) => {
    // ======== STATE MANAGEMENT ========
    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const savedTasks = localStorage.getItem('tasks');
            if (savedTasks) {
                const parsedTasks = JSON.parse(savedTasks);
                return parsedTasks.map((t: Task) => ({ ...t, dueDate: new Date(t.dueDate) }));
            }
            return [];
        } catch (error) {
            console.error("Failed to load tasks from localStorage", error);
            return [];
        }
    });

    const [notifiedTaskIds, setNotifiedTaskIds] = useState(new Set<string>());

    // Modal States
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<Date | null>(null);
    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
    const [tasksForDetailView, setTasksForDetailView] = useState<Task[]>([]);

    // ======== EFFECTS ========
    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        const currentManualTasks = tasks.filter(t => !t.isAutomatic);
        const currentAutoTasks = tasks.filter(t => t.isAutomatic);
        const existingAutoTasksMap = new Map(currentAutoTasks.map(t => [t.seriesId, t]));
        const newlyGeneratedTasks = generateAllTasks(activeClients);
        const mergedAutoTasks = newlyGeneratedTasks.map(newTask => {
            const existingTask = existingAutoTasksMap.get(newTask.seriesId);
            return existingTask ? { ...newTask, status: existingTask.status } : newTask;
        });
        const allTasks = [...mergedAutoTasks, ...currentManualTasks];
        setTasks(updateTaskStatuses(allTasks));
    }, [activeClients]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const interval = setInterval(() => {
            if (Notification.permission !== 'granted') return;
            const now = new Date();
            const isSoundEnabled = localStorage.getItem('soundEnabled') === 'true';
            tasks.forEach(task => {
                if (task.status === TaskStatus.Completed || notifiedTaskIds.has(task.id) || task.reminder === ReminderSetting.None) return;
                const dueDate = new Date(task.dueDate);
                const timeDiff = dueDate.getTime() - now.getTime();
                let reminderMillis = 0;
                switch (task.reminder) {
                    case ReminderSetting.OneHour: reminderMillis = 60 * 60 * 1000; break;
                    case ReminderSetting.OneDay: reminderMillis = 24 * 60 * 60 * 1000; break;
                    case ReminderSetting.OneWeek: reminderMillis = 7 * 24 * 60 * 60 * 1000; break;
                }
                if (timeDiff > 0 && timeDiff <= reminderMillis) {
                    const entityInfo = legalEntityMap.get(task.legalEntityId);
                    const clientName = entityInfo ? `${entityInfo.clientName} (${entityInfo.legalEntity.name})` : 'Неизвестный клиент';
                    new Notification('Напоминание о задаче', {
                        body: `${task.title}\nСрок до: ${dueDate.toLocaleDateString('ru-RU')}\nКлиент: ${clientName}`,
                    });
                    if (isSoundEnabled) notificationSound.play().catch(e => console.error("Audio playback failed", e));
                    setNotifiedTaskIds(prev => new Set(prev).add(task.id));
                }
            });
        }, 60 * 1000);
        return () => clearInterval(interval);
    }, [tasks, legalEntityMap, notifiedTaskIds]);


    // ======== HANDLERS - TASKS ========
    const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => {
        setTasks(prevTasks => {
            if (taskToEdit) {
                return prevTasks.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t);
            } else {
                const newTask: Task = {
                    ...taskData,
                    id: `task-${Date.now()}`,
                    isAutomatic: false,
                    status: getTaskStatus(taskData.dueDate),
                };
                return [...prevTasks, newTask];
            }
        });
        setIsTaskModalOpen(false);
        setTaskToEdit(null);
    };

    const handleOpenTaskForm = useCallback((date: Date) => {
        setTaskToEdit(null);
        setTaskModalDefaultDate(date);
        setIsTaskModalOpen(true);
    }, []);
    
    const handleOpenTaskDetail = useCallback((tasksForDetail: Task[]) => {
        if (tasksForDetail && tasksForDetail.length > 0) {
            setTasksForDetailView(tasksForDetail);
            setIsTaskDetailModalOpen(true);
        }
    }, []);
    
    // <<<===== НАЧАЛО ИЗМЕНЕНИЙ =====>>>
    const handleToggleComplete = useCallback((taskId: string, currentStatus: TaskStatus) => {
        setTasks(prevTasks => {
            const taskToToggle = prevTasks.find(t => t.id === taskId);
            if (!taskToToggle) return prevTasks;

            if (currentStatus !== TaskStatus.Completed && isTaskLocked(taskToToggle)) {
                console.warn(`Attempted to complete a locked task: ${taskToToggle.title}`);
                return prevTasks; 
            }

            const newTasks = prevTasks.map(task => {
                if (task.id === taskId) {
                    if (currentStatus === TaskStatus.Completed) {
                        const recalculatedTask = { ...task, status: TaskStatus.InProgress };
                        return { ...recalculatedTask, status: getTaskStatus(new Date(recalculatedTask.dueDate)) };
                    }
                    return { ...task, status: TaskStatus.Completed };
                }
                return task;
            });

            const updatedDetailTasks = tasksForDetailView.map(t => newTasks.find(nt => nt.id === t.id) || t);
            setTasksForDetailView(updatedDetailTasks);
            if (updatedDetailTasks.every(t => t.status === TaskStatus.Completed)) {
                setTimeout(() => setIsTaskDetailModalOpen(false), 500);
            }
            return newTasks;
        });
    }, [tasksForDetailView]);

    const handleBulkComplete = useCallback((taskIds: string[]) => {
      setTasks(prevTasks => {
          const tasksById = new Map(prevTasks.map(t => [t.id, t]));
          
          return prevTasks.map(task => {
              if (taskIds.includes(task.id)) {
                  const originalTask = tasksById.get(task.id);
                  if (originalTask && !isTaskLocked(originalTask)) {
                      return { ...task, status: TaskStatus.Completed };
                  }
              }
              return task;
          });
      });
    }, []);
    // <<<===== КОНЕЦ ИЗМЕНЕНИЙ =====>>>

    const handleEditTaskFromDetail = (task: Task) => {
        setIsTaskDetailModalOpen(false);
        setTimeout(() => {
            setTaskToEdit(task);
            setIsTaskModalOpen(true);
        }, 300);
    };
    
    const handleDeleteTask = (taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
        setIsTaskDetailModalOpen(false);
    };

    // Возвращаем все состояния и функции, которые понадобятся в App.tsx
    return {
        tasks,
        isTaskModalOpen,
        setIsTaskModalOpen,
        taskToEdit,
        setTaskToEdit,
        taskModalDefaultDate,
        isTaskDetailModalOpen,
        setIsTaskDetailModalOpen,
        tasksForDetailView,
        handleSaveTask,
        handleOpenTaskForm,
        handleOpenTaskDetail,
        handleToggleComplete,
        handleEditTaskFromDetail,
        handleDeleteTask,
        handleBulkComplete,
    };
};