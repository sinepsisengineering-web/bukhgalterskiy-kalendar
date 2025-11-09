// App.tsx

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
import { Client, LegalEntity, Task, TaskStatus, ReminderSetting } from './types';
import { generateAllTasks, updateTaskStatuses, getTaskStatus } from './services/taskGenerator';
import { DUMMY_CLIENTS } from './dummy-data';
import { ClientEditForm } from './components/ClientEditForm';

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
                    legalEntities: c.legalEntities.map((le: LegalEntity) => ({
                        ...le,
                        ogrnDate: le.ogrnDate ? new Date(le.ogrnDate) : undefined,
                        patents: le.patents ? le.patents.map(p => ({...p, startDate: new Date(p.startDate), endDate: new Date(p.endDate)})) : []
                    }))
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
    const [isClientModalOpen, setIsClientModalOpen] = useState(false); // Для создания/полного редактирования
    const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false); // Для редактирования имени
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
    const [taskModalDefaultDate, setTaskModalDefaultDate] = useState<Date | null>(null);
    const [isTaskDetailModalOpen, setIsTaskDetailModalOpen] = useState(false);
    const [tasksForDetailView, setTasksForDetailView] = useState<Task[]>([]);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    
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

    const legalEntityMap = useMemo(() => {
        const map = new Map<string, { legalEntity: LegalEntity, clientName: string, clientId: string }>();
        clients.forEach(client => {
            if (client.legalEntities) {
                client.legalEntities.forEach(le => {
                    map.set(le.id, { legalEntity: le, clientName: client.name, clientId: client.id });
                });
            }
        });
        return map;
    }, [clients]);


    // ======== EFFECTS ========
    useEffect(() => { localStorage.setItem('clients', JSON.stringify(clients)); }, [clients]);
    useEffect(() => { localStorage.setItem('tasks', JSON.stringify(tasks)); }, [tasks]);

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

   

    // ======== HANDLERS - CLIENTS ========
    const handleSaveClient = (clientData: Client) => {
        const updatedClients = clients.find(c => c.id === clientData.id)
          ? clients.map(c => c.id === clientData.id ? clientData : c)
          : [...clients, { ...clientData, id: clientData.id || `client-${Date.now()}` }];
        setClients(updatedClients);
        if (selectedClient && selectedClient.id === clientData.id) {
            setSelectedClient(clientData);
        }
        setIsClientModalOpen(false);
        setClientToEdit(null);
    };

    const handleSaveClientName = (clientData: Pick<Client, 'id' | 'name'>) => {
        const updatedClients = clients.map(c => c.id === clientData.id ? { ...c, name: clientData.name } : c);
        setClients(updatedClients);
        if (selectedClient && selectedClient.id === clientData.id) {
            setSelectedClient(prev => prev ? { ...prev, name: clientData.name } : null);
        }
        setIsClientEditModalOpen(false);
        setClientToEdit(null);
    };
    
    const handleArchiveClient = (client: Client) => { /* ... */ };
    const handleUnarchiveClient = (clientId: string) => { /* ... */ };
    const handleDeleteClient = (client: Client) => { /* ... */ };
    const handlePermanentDeleteClient = (clientId: string) => { /* ... */ };

    const handleOpenClientForm = (client: Client | null = null) => {
        setClientToEdit(client);
        setIsClientModalOpen(true);
    };

    const handleOpenClientEditForm = (client: Client) => {
        setClientToEdit(client);
        setIsClientEditModalOpen(true);
    };

    // ======== HANDLERS - TASKS ========
    const handleSaveTask = (taskData: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => { /* ... */ };
    const handleOpenTaskForm = useCallback((date: Date) => { /* ... */ }, []);
    const handleOpenTaskDetail = useCallback((tasksForDetail: Task[]) => { /* ... */ }, []);

    const handleToggleComplete = useCallback((taskId: string, currentStatus: TaskStatus) => {
        setTasks(prevTasks => {
            const newTasks = prevTasks.map(task => {
                if (task.id === taskId) {
                    if (currentStatus === TaskStatus.Completed) {
                        const recalculatedTask = { ...task, status: TaskStatus.InProgress };
                        return { ...recalculatedTask, status: getTaskStatus(recalculatedTask.dueDate) };
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

    const handleBulkComplete = useCallback((taskIds: string[]) => { /* ... */ }, []);
    const handleEditTaskFromDetail = (task: Task) => { /* ... */ };
    const handleDeleteTask = (taskId: string) => { /* ... */ };

    // ======== HANDLERS - SETTINGS ========
    const handleClearData = () => { /* ... */ };

    // ======== RENDER LOGIC ========
    const renderContent = () => {
        if (selectedClient && activeView === 'clients') {
            const clientLegalEntityIds = new Set(selectedClient.legalEntities.map(le => le.id));
            const clientTasks = tasks.filter(task => clientLegalEntityIds.has(task.legalEntityId));
            return <ClientDetailCard 
                client={selectedClient} 
                tasks={clientTasks}
                onClose={() => setSelectedClient(null)}
                onEdit={handleOpenClientEditForm}
                onArchive={handleArchiveClient}
                onDelete={handleDeleteClient}
                onSave={handleSaveClient}
            />;
        }
        switch(activeView) {
            case 'calendar': return <Calendar tasks={tasks} clients={activeClients} onUpdateTaskStatus={() => {}} onAddTask={handleOpenTaskForm} onOpenDetail={handleOpenTaskDetail} onDeleteTask={handleDeleteTask} />;
            case 'tasks': return <TasksListView key={tasksViewKey} tasks={tasks} clients={activeClients} onOpenDetail={handleOpenTaskDetail} onBulkUpdate={handleBulkComplete} onDeleteTask={handleDeleteTask} />;
            case 'clients': return <ClientList clients={activeClients} onSelectClient={setSelectedClient} onAddClient={() => handleOpenClientForm(null)} />;
            case 'archive': return <ArchiveView archivedClients={archivedClients} onUnarchive={handleUnarchiveClient} onDelete={handlePermanentDeleteClient} />;
            case 'settings': return <SettingsView onClearData={handleClearData} />;
            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <Sidebar activeView={activeView} setActiveView={(v) => { setSelectedClient(null); if (v === 'tasks') { setTasksViewKey(prev => prev + 1); } setActiveView(v as View); }} />
            <main className="flex-1 p-8 overflow-y-auto relative">{renderContent()}</main>

            {/* Модальное окно для СОЗДАНИЯ/ПОЛНОГО РЕДАКТИРОВАНИЯ клиента */}
            <Modal isOpen={isClientModalOpen} onClose={() => { setIsClientModalOpen(false); setClientToEdit(null); }} title={clientToEdit ? 'Редактировать клиента' : 'Новый клиент'}>
                <ClientForm client={clientToEdit} onSave={handleSaveClient} onCancel={() => { setIsClientModalOpen(false); setClientToEdit(null); }} />
            </Modal>
            
            {/* НОВОЕ: Модальное окно для РЕДАКТИРОВАНИЯ ИМЕНИ КЛИЕНТА */}
            {clientToEdit && (
                <Modal isOpen={isClientEditModalOpen} onClose={() => { setIsClientEditModalOpen(false); setClientToEdit(null); }} title={`Редактирование: ${clientToEdit.name}`}>
                    <ClientEditForm client={clientToEdit} onSave={handleSaveClientName} onCancel={() => { setIsClientEditModalOpen(false); setClientToEdit(null); }} />
                </Modal>
            )}

            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={taskToEdit ? 'Редактировать задачу' : 'Новая задача'}>
                <TaskForm clients={activeClients} onSave={handleSaveTask} onCancel={() => { setIsTaskModalOpen(false); setTaskToEdit(null); }} taskToEdit={taskToEdit} defaultDate={taskModalDefaultDate}/>
            </Modal>

            <TaskDetailModal isOpen={isTaskDetailModalOpen} onClose={() => setIsTaskDetailModalOpen(false)} tasks={tasksForDetailView} clients={activeClients} onToggleComplete={handleToggleComplete} onEdit={handleEditTaskFromDetail} onDelete={handleDeleteTask} onSelectClient={(client: Client) => { const c = clients.find(c => c.id === client.id); if (c) { setIsTaskDetailModalOpen(false); setSelectedClient(c); setActiveView('clients'); } }} />

            <ConfirmationModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={confirmationProps.onConfirm} title={confirmationProps.title} message={confirmationProps.message} confirmButtonText={confirmationProps.confirmButtonText} confirmButtonClass={confirmationProps.confirmButtonClass}/>
        </div>
    );
};

export default App;