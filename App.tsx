// App.tsx

import React, { useState, useEffect, useMemo } from 'react';
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
import { Client, LegalEntity } from './types';
import { DUMMY_CLIENTS } from './dummy-data';
import { ClientEditForm } from './components/ClientEditForm';
import { useTasks } from './hooks/useTasks'; // <<<===== ИМПОРТИРУЕМ НАШ НОВЫЙ ХУК

type View = 'calendar' | 'tasks' | 'clients' | 'archive' | 'settings';

interface ConfirmationProps {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmButtonText?: string;
    confirmButtonClass?: string;
}

const App: React.FC = () => {
    // ======== STATE MANAGEMENT - CLIENTS ========
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

    const [activeView, setActiveView] = useState<View>('calendar');
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [tasksViewKey, setTasksViewKey] = useState(0);
    
    // Modal States - Clients
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isClientEditModalOpen, setIsClientEditModalOpen] = useState(false);
    const [clientToEdit, setClientToEdit] = useState<Client | null>(null);
    
    // Confirmation Modal
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [confirmationProps, setConfirmationProps] = useState<ConfirmationProps>({
        title: '', message: '', onConfirm: () => {},
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
            client.legalEntities?.forEach(le => {
                map.set(le.id, { legalEntity: le, clientName: client.name, clientId: client.id });
            });
        });
        return map;
    }, [clients]);
    
    // <<<===== ВСЯ ЛОГИКА ЗАДАЧ ТЕПЕРЬ ЗДЕСЬ =====>>>
    const {
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
    } = useTasks(activeClients, legalEntityMap);
    // <<<=======================================>>>

    // ======== EFFECTS ========
    useEffect(() => { localStorage.setItem('clients', JSON.stringify(clients)); }, [clients]);
    
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
            
            {/* Модальное окно для РЕДАКТИРОВАНИЯ ИМЕНИ КЛИЕНТА */}
            {clientToEdit && (
                <Modal isOpen={isClientEditModalOpen} onClose={() => { setIsClientEditModalOpen(false); setClientToEdit(null); }} title={`Редактирование: ${clientToEdit.name}`}>
                    <ClientEditForm client={clientToEdit} onSave={handleSaveClientName} onCancel={() => { setIsClientEditModalOpen(false); setClientToEdit(null); }} />
                </Modal>
            )}

            {/* Модальные окна для задач (теперь управляются из хука) */}
            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={taskToEdit ? 'Редактировать задачу' : 'Новая задача'}>
                <TaskForm clients={activeClients} onSave={handleSaveTask} onCancel={() => { setIsTaskModalOpen(false); setTaskToEdit(null); }} taskToEdit={taskToEdit} defaultDate={taskModalDefaultDate}/>
            </Modal>

            <TaskDetailModal isOpen={isTaskDetailModalOpen} onClose={() => setIsTaskDetailModalOpen(false)} tasks={tasksForDetailView} clients={activeClients} onToggleComplete={handleToggleComplete} onEdit={handleEditTaskFromDetail} onDelete={handleDeleteTask} onSelectClient={(client: Client) => { const c = clients.find(c => c.id === client.id); if (c) { setIsTaskDetailModalOpen(false); setSelectedClient(c); setActiveView('clients'); } }} />

            <ConfirmationModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={confirmationProps.onConfirm} title={confirmationProps.title} message={confirmationProps.message} confirmButtonText={confirmationProps.confirmButtonText} confirmButtonClass={confirmationProps.confirmButtonClass}/>
        </div>
    );
};

export default App;