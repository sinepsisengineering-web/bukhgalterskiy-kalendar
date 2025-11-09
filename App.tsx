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
import { LegalEntity } from './types';
import { DUMMY_CLIENTS } from './dummy-data';
import { useTasks } from './hooks/useTasks';

type View = 'calendar' | 'tasks' | 'clients' | 'archive' | 'settings';

interface ConfirmationProps {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmButtonText?: string;
    confirmButtonClass?: string;
}

const parseLegalEntityDates = (le: any): LegalEntity => ({
    ...le,
    ogrnDate: le.ogrnDate ? new Date(le.ogrnDate) : undefined,
    patents: le.patents ? le.patents.map((p: any) => ({ ...p, startDate: new Date(p.startDate), endDate: new Date(p.endDate) })) : []
});

const App: React.FC = () => {
    const [legalEntities, setLegalEntities] = useState<LegalEntity[]>(() => {
        try {
            const savedLegalEntities = localStorage.getItem('legalEntities');
            if (savedLegalEntities) {
                const parsed = JSON.parse(savedLegalEntities);
                return parsed.map(parseLegalEntityDates);
            }

            const savedClients = localStorage.getItem('clients');
            if (savedClients) {
                console.log("Migrating old 'clients' data structure to 'legalEntities'...");
                const oldClients: any[] = JSON.parse(savedClients);
                const migratedEntities: LegalEntity[] = oldClients.flatMap(client =>
                    (client.legalEntities || []).map((le: any) => parseLegalEntityDates({ // <<< ИСПРАВЛЕНО: Добавлен тип (le: any)
                        ...le,
                        isArchived: client.isArchived || false,
                    }))
                );
                localStorage.setItem('legalEntities', JSON.stringify(migratedEntities));
                localStorage.removeItem('clients');
                return migratedEntities;
            }

            return DUMMY_CLIENTS.flatMap(client =>
                client.legalEntities.map((le: any) => ({ // <<< ИСПРАВЛЕНО: Добавлен тип (le: any)
                    ...le,
                    isArchived: client.isArchived || false,
                }))
            );
        } catch (error) {
            console.error("Failed to load or migrate data from localStorage", error);
            return DUMMY_CLIENTS.flatMap(client =>
                client.legalEntities.map((le: any) => ({ // <<< ИСПРАВЛЕНО: Добавлен тип (le: any)
                    ...le,
                    isArchived: client.isArchived || false,
                }))
            );
        }
    });

    const [selectedLegalEntity, setSelectedLegalEntity] = useState<LegalEntity | null>(null);
    const [tasksViewKey, setTasksViewKey] = useState(0);
    const [activeView, setActiveView] = useState<View>('calendar'); // <<< ИСПРАВЛЕНО: Возвращена строка состояния
    
    const [isLegalEntityModalOpen, setIsLegalEntityModalOpen] = useState(false);
    const [legalEntityToEdit, setLegalEntityToEdit] = useState<LegalEntity | null>(null);
    
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [confirmationProps, setConfirmationProps] = useState<ConfirmationProps>({
        title: '', message: '', onConfirm: () => {},
    });

    const { activeLegalEntities, archivedLegalEntities } = useMemo(() => {
        const active: LegalEntity[] = [];
        const archived: LegalEntity[] = [];
        legalEntities.forEach(le => le.isArchived ? archived.push(le) : active.push(le));
        return { activeLegalEntities: active, archivedLegalEntities: archived };
    }, [legalEntities]);

    const legalEntityMap = useMemo(() => {
        const map = new Map<string, LegalEntity>();
        legalEntities.forEach(le => {
            map.set(le.id, le);
        });
        return map;
    }, [legalEntities]);
    
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
    } = useTasks(activeLegalEntities, legalEntityMap);

    useEffect(() => {
        localStorage.setItem('legalEntities', JSON.stringify(legalEntities));
    }, [legalEntities]);
    
    const handleSaveLegalEntity = (entityData: LegalEntity) => {
        const updatedEntities = legalEntities.find(le => le.id === entityData.id)
          ? legalEntities.map(le => le.id === entityData.id ? entityData : le)
          : [...legalEntities, { ...entityData, id: entityData.id || `le-${Date.now()}` }];
        setLegalEntities(updatedEntities);
        if (selectedLegalEntity && selectedLegalEntity.id === entityData.id) {
            setSelectedLegalEntity(entityData);
        }
        setIsLegalEntityModalOpen(false);
        setLegalEntityToEdit(null);
    };
    
    const handleArchiveLegalEntity = (entity: LegalEntity) => {
        setLegalEntities(prev => prev.map(le => le.id === entity.id ? { ...le, isArchived: true } : le));
        if (selectedLegalEntity?.id === entity.id) setSelectedLegalEntity(null);
    };

    const handleUnarchiveLegalEntity = (entityId: string) => {
        setLegalEntities(prev => prev.map(le => le.id === entityId ? { ...le, isArchived: false } : le));
    };

    const handleDeleteLegalEntity = (entity: LegalEntity) => {
        setLegalEntities(prev => prev.filter(le => le.id !== entity.id));
        if (selectedLegalEntity?.id === entity.id) setSelectedLegalEntity(null);
    };
    
    const handlePermanentDeleteClient = (clientId: string) => { /* ... */ };

    const handleOpenLegalEntityForm = (entity: LegalEntity | null = null) => {
        setLegalEntityToEdit(entity);
        setIsLegalEntityModalOpen(true);
    };

    const handleClearData = () => { /* ... */ };

    const renderContent = () => {
        if (selectedLegalEntity && activeView === 'clients') {
            const entityTasks = tasks.filter(task => task.legalEntityId === selectedLegalEntity.id);
            return <ClientDetailCard 
                legalEntity={selectedLegalEntity} 
                tasks={entityTasks}
                onClose={() => setSelectedLegalEntity(null)}
                onEdit={handleOpenLegalEntityForm}
                onArchive={handleArchiveLegalEntity}
                onDelete={handleDeleteLegalEntity}
            />;
        }
        switch(activeView) {
            case 'calendar': return <Calendar tasks={tasks} legalEntities={activeLegalEntities} onUpdateTaskStatus={() => {}} onAddTask={handleOpenTaskForm} onOpenDetail={handleOpenTaskDetail} onDeleteTask={handleDeleteTask} />;
            case 'tasks': return <TasksListView key={tasksViewKey} tasks={tasks} legalEntities={activeLegalEntities} onOpenDetail={handleOpenTaskDetail} onBulkUpdate={handleBulkComplete} onDeleteTask={handleDeleteTask} />;
            case 'clients': return <ClientList legalEntities={activeLegalEntities} onSelectLegalEntity={setSelectedLegalEntity} onAddLegalEntity={() => handleOpenLegalEntityForm(null)} />;
            case 'archive': return <ArchiveView archivedLegalEntities={archivedLegalEntities} onUnarchive={handleUnarchiveLegalEntity} onDelete={handlePermanentDeleteClient} />;
            case 'settings': return <SettingsView onClearData={handleClearData} />;
            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            <Sidebar activeView={activeView} setActiveView={(v) => { setSelectedLegalEntity(null); if (v === 'tasks') { setTasksViewKey(prev => prev + 1); } setActiveView(v as View); }} />
            <main className="flex-1 p-8 overflow-y-auto relative">{renderContent()}</main>

            <Modal isOpen={isLegalEntityModalOpen} onClose={() => { setIsLegalEntityModalOpen(false); setLegalEntityToEdit(null); }} title={legalEntityToEdit ? 'Редактировать юр. лицо' : 'Новое юр. лицо'}>
                <ClientForm legalEntity={legalEntityToEdit} onSave={handleSaveLegalEntity} onCancel={() => { setIsLegalEntityModalOpen(false); setLegalEntityToEdit(null); }} />
            </Modal>
            
            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={taskToEdit ? 'Редактировать задачу' : 'Новая задача'}>
                <TaskForm legalEntities={activeLegalEntities} onSave={handleSaveTask} onCancel={() => { setIsTaskModalOpen(false); setTaskToEdit(null); }} taskToEdit={taskToEdit} defaultDate={taskModalDefaultDate}/>
            </Modal>
            
            <TaskDetailModal 
                isOpen={isTaskDetailModalOpen} 
                onClose={() => setIsTaskDetailModalOpen(false)} 
                tasks={tasksForDetailView} 
                legalEntities={activeLegalEntities} 
                onToggleComplete={handleToggleComplete} 
                onEdit={handleEditTaskFromDetail} 
                onDelete={handleDeleteTask} 
                onSelectLegalEntity={(entity: LegalEntity) => { 
                    const le = legalEntities.find(le => le.id === entity.id); 
                    if (le) { 
                        setIsTaskDetailModalOpen(false); 
                        setSelectedLegalEntity(le); 
                        setActiveView('clients'); 
                    } 
                }} 
            />

            <ConfirmationModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={confirmationProps.onConfirm} title={confirmationProps.title} message={confirmationProps.message} confirmButtonText={confirmationProps.confirmButtonText} confirmButtonClass={confirmationProps.confirmButtonClass}/>
        </div>
    );
};

export default App;