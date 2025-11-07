import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Calendar } from './components/Calendar';
import { ClientList } from './components/ClientList';
import { Modal } from './components/Modal';
import { ClientForm } from './components/ClientForm';
import { ClientDetailCard } from './components/ClientDetailCard';
import { TaskForm } from './components/TaskForm';
import { TaskDetailModal } from './components/TaskDetailModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { TasksListView } from './components/TasksListView';
import { ArchiveView } from './components/ArchiveView';
import { SettingsView } from './components/SettingsView';
import { Client, Task, TaskStatus, LegalForm, TaxSystem, ReminderSetting } from './types';
import { generateTasksForClient, updateTaskStatuses } from './services/taskGenerator';



// Dummy Data for initial load
const DUMMY_CLIENTS: Client[] = [
    {
      id: 'client-1',
      legalForm: LegalForm.OOO,
      name: 'Ромашка',
      inn: '7701234567',
      kpp: '770101001',
      ogrn: '1027700123456',
      ogrnDate: new Date('2002-08-15'),
      legalAddress: 'г. Москва, ул. Цветочная, д. 1',
      actualAddress: 'г. Москва, ул. Цветочная, д. 1',
      contactPerson: 'Иванов Иван Иванович',
      phone: '+7 (495) 123-45-67',
      email: 'info@romashka.ru',
      taxSystems: [TaxSystem.USN_DOHODY_RASHODY],
      hasEmployees: true,
      credentials: [
        { id: 'cred-1-1', service: 'ФНС', login: '7701234567', password: 'password1' },
        { id: 'cred-1-2', service: 'Госуслуги', login: 'ivanov@romashka.ru', password: 'password2' },
      ],
      patents: [],
      isArchived: false
    },
    {
      id: 'client-2',
      legalForm: LegalForm.IP,
      name: 'Сидоров Сидор Сидорович',
      inn: '7702345678',
      ogrn: '304770001234567',
      ogrnDate: new Date('2004-05-20'),
      legalAddress: 'г. Москва, ул. Строителей, д. 15, кв. 5',
      actualAddress: 'г. Москва, ул. Строителей, д. 15, кв. 5',
      contactPerson: 'Сидоров Сидор Сидорович',
      phone: '+7 (916) 123-45-67',
      email: 'sidorov@mail.ru',
      taxSystems: [TaxSystem.USN_DOHODY, TaxSystem.PATENT],
      hasEmployees: false,
      credentials: [],
      patents: [
        {
          id: 'patent-1-24',
          name: 'Разработка ПО',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          autoRenew: true,
        },
        {
          id: 'patent-2-24',
          name: 'Розничная торговля',
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-09-30'),
          autoRenew: false,
        }
      ],
      isArchived: false,
    },
    {
        id: 'client-3',
        legalForm: LegalForm.OOO,
        name: 'ТехноСтрой',
        inn: '7703456789',
        kpp: '770301001',
        ogrn: '1157746012345',
        ogrnDate: new Date('2015-01-25'),
        legalAddress: 'г. Москва, Проспект Мира, д. 101',
        actualAddress: 'г. Москва, Проспект Мира, д. 101',
        contactPerson: 'Петров Петр Петрович',
        phone: '+7 (495) 987-65-43',
        email: 'info@technostroy.com',
        taxSystems: [TaxSystem.OSNO],
        hasEmployees: true,
        credentials: [
          { id: 'cred-3-1', service: 'ФНС', login: '7703456789', password: 'password3' },
        ],
        patents: [],
        isArchived: true
      },
];

type View = 'calendar' | 'tasks' | 'clients' | 'archive' | 'settings';

interface ConfirmationProps {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmButtonText?: string;
    confirmButtonClass?: string;
}

const notificationSound = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');

const App: React.FC = () => {
    // ======== STATE MANAGEMENT ========
    const [clients, setClients] = useState<Client[]>(() => {
        try {
            const savedClients = localStorage.getItem('clients');
            if (savedClients) {
                const parsed = JSON.parse(savedClients);
                return parsed.map((c: Client) => ({
                    ...c,
                    ogrnDate: c.ogrnDate ? new Date(c.ogrnDate) : undefined,
                    patents: c.patents ? c.patents.map(p => ({...p, startDate: new Date(p.startDate), endDate: new Date(p.endDate)})) : []
                }));
            }
            return DUMMY_CLIENTS;
        } catch (error) {
            console.error("Failed to load clients from localStorage", error);
            return DUMMY_CLIENTS;
        }
    });

    const [tasks, setTasks] = useState<Task[]>(() => {
        try {
            const savedTasks = localStorage.getItem('tasks');
            if (savedTasks) {
                const parsedTasks = JSON.parse(savedTasks);
                return parsedTasks.map((t: Task) => ({...t, dueDate: new Date(t.dueDate)}));
            }
            return [];
        } catch (error) {
            console.error("Failed to load tasks from localStorage", error);
            return [];
        }
    });

    const [activeView, setActiveView] = useState<View>('calendar');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [tasksViewKey, setTasksViewKey] = useState(0);
    const [notifiedTaskIds, setNotifiedTaskIds] = useState(new Set<string>());
    
    // Modal States
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<Date | null>(null);
    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
    const [tasksForDetailView, setTasksForDetailView] = useState<Task[]>([]);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    
    // Confirmation Modal Props
    const [confirmationProps, setConfirmationProps] = useState<ConfirmationProps>({
        title: '',
        message: '',
        onConfirm: () => {},
        confirmButtonText: 'Confirm',
        confirmButtonClass: 'bg-indigo-600',
    });


    // ======== DATA DERIVATION ========
    const { activeClients, archivedClients } = useMemo(() => {
        const active: Client[] = [];
        const archived: Client[] = [];
        clients.forEach(c => c.isArchived ? archived.push(c) : active.push(c));
        return { activeClients: active, archivedClients: archived };
    }, [clients]);


    // ======== EFFECTS ========
    useEffect(() => {
        localStorage.setItem('clients', JSON.stringify(clients));
    }, [clients]);

    useEffect(() => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }, [tasks]);

    useEffect(() => {
        // 1. Получаем текущие задачи, созданные вручную. Их мы не трогаем.
        const currentManualTasks = tasks.filter(t => !t.isAutomatic);
        
        // 2. Получаем текущие автоматические задачи, чтобы сравнить их с новыми.
        const currentAutoTasks = tasks.filter(t => t.isAutomatic);
        // Создаем карту для быстрого доступа к существующим задачам по их seriesId.
        const existingAutoTasksMap = new Map(currentAutoTasks.map(t => [t.seriesId, t]));

        // 3. Генерируем "идеальный" список автоматических задач на основе текущих клиентов.
        const newlyGeneratedTasks = activeClients.flatMap(client => generateTasksForClient(client));

        // --- ДОБАВЛЕНА СТРОКА ДЛЯ ДИАГНОСТИКИ ---
        console.log("Сгенерированные seriesId:", newlyGeneratedTasks.map(t => t.seriesId));

        // 4. "Сливаем" новый список со старым, сохраняя статусы.
        const mergedAutoTasks = newlyGeneratedTasks.map(newTask => {
            const existingTask = existingAutoTasksMap.get(newTask.seriesId);
            
            if (existingTask) {
                return { ...newTask, status: existingTask.status };
            }
            
            return newTask;
        });

        // 5. Собираем финальный список и обновляем состояние.
        const allTasks = [...mergedAutoTasks, ...currentManualTasks];
        setTasks(updateTaskStatuses(allTasks));
    }, [activeClients]); // eslint-disable-line react-hooks/exhaustive-deps
    
    // Notification Effect
    useEffect(() => {
        const interval = setInterval(() => {
            if (Notification.permission !== 'granted') return;

            const now = new Date();
            const isSoundEnabled = localStorage.getItem('soundEnabled') === 'true';

            tasks.forEach(task => {
                if (task.status === TaskStatus.Completed || notifiedTaskIds.has(task.id) || task.reminder === ReminderSetting.None) {
                    return;
                }

                const dueDate = new Date(task.dueDate);
                const timeDiff = dueDate.getTime() - now.getTime();

                let reminderMillis = 0;
                switch (task.reminder) {
                    case ReminderSetting.OneHour: reminderMillis = 60 * 60 * 1000; break;
                    case ReminderSetting.OneDay: reminderMillis = 24 * 60 * 60 * 1000; break;
                    case ReminderSetting.OneWeek: reminderMillis = 7 * 24 * 60 * 60 * 1000; break;
                }
                
                if (timeDiff > 0 && timeDiff <= reminderMillis) {
                    const clientNames = task.clientIds.map(id => clients.find(c => c.id === id)?.name).filter(Boolean).join(', ');
                    
                    new Notification('Напоминание о задаче', {
                        body: `${task.title}\nСрок до: ${dueDate.toLocaleDateString('ru-RU')}\n${clientNames ? `Клиент: ${clientNames}` : ''}`,
                    });
                    
                    if (isSoundEnabled) {
                        notificationSound.play().catch(e => console.error("Audio playback failed", e));
                    }

                    setNotifiedTaskIds(prev => new Set(prev).add(task.id));
                }
            });

        }, 60 * 1000);

        return () => clearInterval(interval);
    }, [tasks, clients, notifiedTaskIds]);

   

    // ======== HANDLERS - CLIENTS ========
    const handleSaveClient = (clientData: Client) => {
        const updatedClients = clients.find(c => c.id === clientData.id)
          ? clients.map(c => c.id === clientData.id ? clientData : c)
          : [...clients, clientData];
        
        setClients(updatedClients);
    
        if (selectedClient && selectedClient.id === clientData.id) {
            setSelectedClient(clientData);
        }
        
        setIsClientModalOpen(false);
        setClientToEdit(null);
    };
    
    const handleArchiveClient = (client: Client) => {
        setConfirmationProps({
            title: 'Архивировать клиента?',
            message: `Вы уверены, что хотите архивировать клиента "${client.name}"? Его можно будет восстановить.`,
            onConfirm: () => {
                setClients(prev => prev.map(c => c.id === client.id ? { ...c, isArchived: true } : c));
                setSelectedClient(null);
                setIsConfirmationModalOpen(false);
            },
            confirmButtonText: 'Архивировать',
            confirmButtonClass: 'bg-yellow-600 hover:bg-yellow-700',
        });
        setIsConfirmationModalOpen(true);
    };

     const handleUnarchiveClient = (clientId: string) => {
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, isArchived: false } : c));
    };
    
    const handleDeleteClient = (client: Client) => {
         setConfirmationProps({
            title: 'Удалить клиента?',
            message: <p>Вы уверены, что хотите <strong>навсегда</strong> удалить клиента "{client.name}"? Это действие нельзя отменить.</p>,
            onConfirm: () => {
                setClients(prev => prev.filter(c => c.id !== client.id));
                setSelectedClient(null);
                setIsConfirmationModalOpen(false);
            },
            confirmButtonText: 'Удалить навсегда',
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
        });
        setIsConfirmationModalOpen(true);
    };

    const handlePermanentDeleteClient = (clientId: string) => {
         const client = clients.find(c => c.id === clientId);
         if (!client) return;
         handleDeleteClient(client);
    };

    const handleOpenClientForm = (client: Client | null = null) => {
        setClientToEdit(client);
        setIsClientModalOpen(true);
    };


    // ======== HANDLERS - TASKS ========
    const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => {
        const newTask: Task = {
            ...taskData,
            id: taskToEdit?.id || `task-${Date.now()}`,
            status: taskToEdit?.status || TaskStatus.InProgress,
            isAutomatic: false,
        };
        newTask.status = updateTaskStatuses([newTask])[0].status;

        setTasks(prev => {
             const existing = prev.find(t => t.id === newTask.id);
            if (existing) {
                return prev.map(t => t.id === newTask.id ? newTask : t);
            }
            return [...prev, newTask];
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
        setTasksForDetailView(tasksForDetail);
        setIsTaskDetailModalOpen(true);
    }, []);

    const handleToggleComplete = useCallback((taskId: string, currentStatus: TaskStatus) => {
        const newStatus = currentStatus === TaskStatus.Completed ? TaskStatus.InProgress : TaskStatus.Completed;
        setTasks(prevTasks => {
            const newTasks = prevTasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
            const updatedDetailTasks = tasksForDetailView.map(t => t.id === taskId ? {...t, status: newStatus} : t);
            setTasksForDetailView(updatedDetailTasks);
            if (updatedDetailTasks.every(t => t.status === TaskStatus.Completed)) {
                setTimeout(() => setIsTaskDetailModalOpen(false), 500);
            }
            return updateTaskStatuses(newTasks);
        });
    }, [tasksForDetailView]);

    const handleBulkComplete = useCallback((taskIds: string[]) => {
        setTasks(prevTasks => {
            const newTasks = prevTasks.map(t => taskIds.includes(t.id) ? { ...t, status: TaskStatus.Completed } : t);
            return updateTaskStatuses(newTasks);
        });
    }, []);
    
    const handleEditTaskFromDetail = (task: Task) => {
        setIsTaskDetailModalOpen(false);
        setTaskToEdit(task);
        setIsTaskModalOpen(true);
    };

    // ======== HANDLERS - SETTINGS ========
    const handleClearData = () => {
        setConfirmationProps({
            title: 'Очистить все данные?',
            message: 'Это действие удалит всех клиентов и задачи из локального хранилища. Восстановить их будет невозможно. Вы уверены?',
            onConfirm: () => {
                localStorage.clear();
                window.location.reload();
            },
            confirmButtonText: 'Очистить навсегда',
            confirmButtonClass: 'bg-red-600 hover:bg-red-700',
        });
        setIsConfirmationModalOpen(true);
    };

    // ======== RENDER LOGIC ========
    const renderContent = () => {
        if (selectedClient && activeView === 'clients') {
            return <ClientDetailCard 
                client={selectedClient} 
                tasks={tasks}
                onClose={() => setSelectedClient(null)}
                onEdit={handleOpenClientForm}
                onArchive={handleArchiveClient}
                onDelete={handleDeleteClient}
            />;
        }

        switch(activeView) {
            case 'calendar':
                return <Calendar tasks={tasks} clients={activeClients} onUpdateTaskStatus={() => {}} onAddTask={handleOpenTaskForm} onOpenDetail={handleOpenTaskDetail} />;
            case 'tasks':
                return <TasksListView key={tasksViewKey} tasks={tasks} clients={activeClients} onOpenDetail={handleOpenTaskDetail} onBulkUpdate={handleBulkComplete} />;
            case 'clients':
                return <ClientList clients={activeClients} onSelectClient={setSelectedClient} onAddClient={() => handleOpenClientForm()} />;
            case 'archive':
                return <ArchiveView archivedClients={archivedClients} onUnarchive={handleUnarchiveClient} onDelete={handlePermanentDeleteClient} />;
            case 'settings':
                return <SettingsView onClearData={handleClearData} />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <Sidebar 
                activeView={activeView} 
                setActiveView={(v) => { 
                    setSelectedClient(null); 
                    if (v === 'tasks') {
                        setTasksViewKey(prev => prev + 1);
                    }
                    setActiveView(v as View); 
                }} 
            />
            <main className="flex-1 p-8 overflow-y-auto relative">
                {renderContent()}
            </main>

            {/* Client Form Modal */}
            <Modal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} title={clientToEdit ? 'Редактировать клиента' : 'Новый клиент'}>
                <ClientForm 
                    client={clientToEdit} 
                    onSave={handleSaveClient} 
                    onCancel={() => { setIsClientModalOpen(false); setClientToEdit(null); }} 
                />
            </Modal>
            
            {/* Task Form Modal */}
            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={taskToEdit ? 'Редактировать задачу' : 'Новая задача'}>
                <TaskForm
                    clients={activeClients}
                    onSave={handleSaveTask}
                    onCancel={() => { setIsTaskModalOpen(false); setTaskToEdit(null); }}
                    taskToEdit={taskToEdit}
                    defaultDate={taskModalDefaultDate}
                />
            </Modal>

            {/* Task Detail Modal */}
            <TaskDetailModal
                isOpen={isTaskDetailModalOpen}
                onClose={() => setIsTaskDetailModalOpen(false)}
                tasks={tasksForDetailView}
                clients={activeClients}
                onToggleComplete={handleToggleComplete}
                onEdit={handleEditTaskFromDetail}
                onSelectClient={(client) => {
                    setIsTaskDetailModalOpen(false);
                    setSelectedClient(client);
                    setActiveView('clients');
                }}
            />

            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={isConfirmationModalOpen}
                onClose={() => setIsConfirmationModalOpen(false)}
                onConfirm={confirmationProps.onConfirm}
                title={confirmationProps.title}
                message={confirmationProps.message}
                confirmButtonText={confirmationProps.confirmButtonText}
                confirmButtonClass={confirmationProps.confirmButtonClass}
            />
        </div>
    );
};

export default App;