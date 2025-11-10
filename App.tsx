// src/App.tsx

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
import { LegalEntity, Task, Note } from './types';
import { DUMMY_CLIENTS } from './dummy-data';
import { useTasks } from './hooks/useTasks';

type View = 'calendar' | 'tasks' | 'clients' | 'archive' | 'settings';

// ... остальная часть файла (ConfirmationProps, parseLegalEntity) без изменений ...
interface ConfirmationProps {
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
    confirmButtonText?: string;
    confirmButtonClass?: string;
}

const parseLegalEntity = (le: any): LegalEntity => {
    let migratedNotes: Note[] = [];
    if (typeof le.notes === 'string' && le.notes.trim() !== '') {
        migratedNotes = [{
            id: `note-${Date.now()}-${Math.random()}`,
            text: le.notes,
            createdAt: new Date(),
        }];
    } else if (Array.isArray(le.notes)) {
        migratedNotes = le.notes.map((note: any) => ({
            ...note,
            createdAt: new Date(note.createdAt),
        }));
    }

    return {
        ...le,
        ogrnDate: le.ogrnDate ? new Date(le.ogrnDate) : undefined,
        patents: le.patents ? le.patents.map((p: any) => ({ ...p, startDate: new Date(p.startDate), endDate: new Date(p.endDate) })) : [],
        notes: migratedNotes,
    };
};

const App: React.FC = () => {
    // ... все хуки useState остаются без изменений ...
    const [legalEntities, setLegalEntities] = useState<LegalEntity[]>(() => {
        try {
            const savedLegalEntities = localStorage.getItem('legalEntities');
            if (savedLegalEntities) {
                return JSON.parse(savedLegalEntities).map(parseLegalEntity);
            }
            const savedClients = localStorage.getItem('clients');
            if (savedClients) {
                const oldClients: any[] = JSON.parse(savedClients);
                const migratedEntities: LegalEntity[] = oldClients.flatMap(client =>
                    (client.legalEntities || []).map((le: any) => parseLegalEntity({ ...le, isArchived: client.isArchived || false, }))
                );
                localStorage.setItem('legalEntities', JSON.stringify(migratedEntities));
                localStorage.removeItem('clients');
                return migratedEntities;
            }
            return DUMMY_CLIENTS.flatMap(client => client.legalEntities.map((le: any) => parseLegalEntity({ ...le, isArchived: client.isArchived || false, })));
        } catch (error) {
            console.error("Failed to load or migrate data from localStorage", error);
            return DUMMY_CLIENTS.flatMap(client => client.legalEntities.map((le: any) => parseLegalEntity({ ...le, isArchived: client.isArchived || false, })));
        }
    });

    const [selectedLegalEntity, setSelectedLegalEntity] = useState<LegalEntity | null>(null);
    const [tasksViewKey, setTasksViewKey] = useState(0);
    const [activeView, setActiveView] = useState<View>('calendar');
    const [isLegalEntityModalOpen, setIsLegalEntityModalOpen] = useState(false);
    const [legalEntityToEdit, setLegalEntityToEdit] = useState<LegalEntity | null>(null);
    const [isConfirmationModalOpen, setIsConfirmationModalOpen] = useState(false);
    const [confirmationProps, setConfirmationProps] = useState<ConfirmationProps>({ title: '', message: '', onConfirm: () => {}, });

    const { activeLegalEntities, archivedLegalEntities } = useMemo(() => {
        const active: LegalEntity[] = [];
        const archived: LegalEntity[] = [];
        legalEntities.forEach(le => le.isArchived ? archived.push(le) : active.push(le));
        return { activeLegalEntities: active, archivedLegalEntities: archived };
    }, [legalEntities]);

    const legalEntityMap = useMemo(() => new Map(legalEntities.map(le => [le.id, le])), [legalEntities]);
    
    // Получаем нашу новую универсальную функцию из хука
    const {
        tasks, isTaskModalOpen, setIsTaskModalOpen, taskToEdit, setTaskToEdit, taskModalDefaultDate,
        isTaskDetailModalOpen, setIsTaskDetailModalOpen, tasksForDetailView,
        handleSaveTask, handleOpenNewTaskForm, // ИЗМЕНЕНИЕ: Используем handleOpenNewTaskForm
        handleOpenTaskDetail, handleToggleComplete, handleEditTaskFromDetail, handleDeleteTask, handleBulkComplete,
    } = useTasks(activeLegalEntities, legalEntityMap);

    useEffect(() => {
        localStorage.setItem('legalEntities', JSON.stringify(legalEntities));
    }, [legalEntities]);
    
    // ... все остальные обработчики (handleSaveLegalEntity, etc.) остаются без изменений ...
     const handleSaveLegalEntity = (entityData: LegalEntity) => {
        const entityExists = entityData.id && legalEntities.some(le => le.id === entityData.id);
        const updatedEntities = entityExists
            ? legalEntities.map(le => le.id === entityData.id ? entityData : le)
            : [...legalEntities, { ...entityData, id: `le-${Date.now()}-${Math.random()}` }];
        setLegalEntities(updatedEntities);
        if (selectedLegalEntity && selectedLegalEntity.id === entityData.id) {
            setSelectedLegalEntity(entityData);
        }
        setIsLegalEntityModalOpen(false);
        setLegalEntityToEdit(null);
    };

    const handleAddNote = (legalEntityId: string, noteText: string) => {
        const newNote: Note = {
            id: `note-${Date.now()}-${Math.random()}`,
            text: noteText,
            createdAt: new Date(),
        };
        const updatedEntities = legalEntities.map(le => {
            if (le.id === legalEntityId) {
                const updatedNotes = le.notes ? [...le.notes, newNote] : [newNote];
                return { ...le, notes: updatedNotes };
            }
            return le;
        });
        setLegalEntities(updatedEntities);
        if (selectedLegalEntity && selectedLegalEntity.id === legalEntityId) {
            const updatedSelectedEntity = updatedEntities.find(le => le.id === legalEntityId);
            if (updatedSelectedEntity) {
                setSelectedLegalEntity(updatedSelectedEntity);
            }
        }
    };
    
    const handleArchiveLegalEntity = (entity: LegalEntity) => {
        setLegalEntities(prev => prev.map(le => le.id === entity.id ? { ...le, isArchived: true } : le));
        if (selectedLegalEntity?.id === entity.id) setSelectedLegalEntity(null);
    };

    const handleUnarchiveLegalEntity = (entityId: string) => {
        setLegalEntities(prev => prev.map(le => le.id === entityId ? { ...le, isArchived: false } : le));
    };

    const handleDeleteLegalEntity = (entity: LegalEntity) => {
        if (window.confirm(`Вы уверены, что хотите удалить клиента "${entity.name}"? Это действие необратимо.`)) {
            setLegalEntities(prev => prev.filter(le => le.id !== entity.id));
            if (selectedLegalEntity?.id === entity.id) setSelectedLegalEntity(null);
        }
    };
    
    const handleOpenLegalEntityForm = (entity: LegalEntity | null = null) => {
        setLegalEntityToEdit(entity ? { ...entity } : null);
        setIsLegalEntityModalOpen(true);
    };
    
    // Удаляем отсюда локальный обработчик handleAddTaskForClient

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
                onAddTask={() => handleOpenNewTaskForm({ legalEntityId: selectedLegalEntity.id })}
                onOpenTaskDetail={handleOpenTaskDetail}
                onBulkComplete={handleBulkComplete}
                onDeleteTask={handleDeleteTask}
                onAddNote={handleAddNote}
            />;
        }
        switch(activeView) {
            case 'calendar': return <Calendar tasks={tasks} legalEntities={activeLegalEntities} onUpdateTaskStatus={() => {}} onAddTask={(date) => handleOpenNewTaskForm({ dueDate: date })} onOpenDetail={handleOpenTaskDetail} onDeleteTask={handleDeleteTask} />;
            
            // === ВОЗВРАЩАЕМ КНОПКУ "ДОБАВИТЬ ЗАДАЧУ" НА ГЛАВНЫЙ ЭКРАН ===
            case 'tasks': 
                const addTaskButton = (
                    <button
                        onClick={() => handleOpenNewTaskForm()} // Вызываем универсальную функцию без параметров
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                        Добавить задачу
                    </button>
                );
                return <TasksListView 
                    key={tasksViewKey} 
                    tasks={tasks} 
                    legalEntities={activeLegalEntities} 
                    onOpenDetail={handleOpenTaskDetail} 
                    onBulkUpdate={handleBulkComplete} 
                    onDeleteTask={handleDeleteTask}
                    customAddTaskButton={addTaskButton} // Передаем кнопку в пропсы
                />;

            case 'clients': return <ClientList legalEntities={activeLegalEntities} onSelectLegalEntity={setSelectedLegalEntity} onAddLegalEntity={() => handleOpenLegalEntityForm(null)} />;
            case 'archive': return <ArchiveView archivedLegalEntities={archivedLegalEntities} onUnarchive={handleUnarchiveLegalEntity} onDelete={() => {}} />;
            case 'settings': return <SettingsView onClearData={() => {}} />;
            default: return null;
        }
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans">
            {/* ... остальная часть return без изменений ... */}
            <Sidebar activeView={activeView} setActiveView={(v) => { setSelectedLegalEntity(null); if (v === 'tasks') { setTasksViewKey(prev => prev + 1); } setActiveView(v as View); }} />
            
            <main className="flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 p-8 overflow-y-auto">
                    {renderContent()}
                </div>
            </main>

            <Modal isOpen={isLegalEntityModalOpen} onClose={() => { setIsLegalEntityModalOpen(false); setLegalEntityToEdit(null); }} title={legalEntityToEdit ? 'Редактировать юр. лицо' : 'Новое юр. лицо'}>
                <ClientForm legalEntity={legalEntityToEdit} onSave={handleSaveLegalEntity} onCancel={() => { setIsLegalEntityModalOpen(false); setLegalEntityToEdit(null); }} />
            </Modal>
            
            <Modal isOpen={isTaskModalOpen} onClose={() => setIsTaskModalOpen(false)} title={taskToEdit && taskToEdit.id ? 'Редактировать задачу' : 'Новая задача'}>
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
                    if (le) { setIsTaskDetailModalOpen(false); setSelectedLegalEntity(le); setActiveView('clients'); } 
                }} 
            />

            <ConfirmationModal isOpen={isConfirmationModalOpen} onClose={() => setIsConfirmationModalOpen(false)} onConfirm={confirmationProps.onConfirm} title={confirmationProps.title} message={confirmationProps.message} confirmButtonText={confirmationProps.confirmButtonText} confirmButtonClass={confirmationProps.confirmButtonClass}/>
        </div>
    );
};

export default App;