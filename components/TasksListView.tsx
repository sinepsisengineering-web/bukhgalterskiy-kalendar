// src/components/TasksListView.tsx

import React, { useState, useMemo } from 'react';
import { Task, LegalEntity } from '../types';
import { FilterModal, FilterState } from './FilterModal';
import { isTaskLocked, canCompleteTask } from '../services/taskGenerator';
import { ReusableTaskList } from './ReusableTaskList';
import { useConfirmation } from '../contexts/ConfirmationProvider';

interface TasksListViewProps {
    tasks: Task[];
    allTasks: Task[]; // Все задачи для проверки цепочек
    legalEntities: LegalEntity[];
    onOpenDetail: (tasks: Task[], date: Date) => void;
    onBulkUpdate: (taskIds: string[]) => void;
    onBulkDelete: (taskIds: string[]) => void;
    onDeleteTask: (taskId: string) => void;
    customAddTaskButton?: React.ReactNode;
}

export const TasksListView: React.FC<TasksListViewProps> = ({
    tasks,
    allTasks,
    legalEntities,
    onOpenDetail,
    onBulkUpdate,
    onBulkDelete,
    onDeleteTask,
    customAddTaskButton
}) => { // <--- ВОТ ИСПРАВЛЕННАЯ СТРОКА
    const confirm = useConfirmation();

    const [filters, setFilters] = useState<FilterState>({
        searchText: '', selectedClients: [], selectedYear: 'all', selectedStatuses: [],
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

    const legalEntityMap = useMemo(() => new Map(legalEntities.map(le => [le.id, le])), [legalEntities]);
    const availableYears = useMemo(() => Array.from(new Set(tasks.map(task => new Date(task.dueDate).getFullYear()))).sort((a, b) => a - b), [tasks]);

    const filteredTasks = useMemo(() => {
        const shouldFilterClients = legalEntities.length > 1;
        return tasks.filter(task => {
            const searchLower = filters.searchText.toLowerCase();
            const entity = legalEntityMap.get(task.legalEntityId);
            const entityName = entity ? `${entity.legalForm} ${entity.name} ${entity.inn}`.toLowerCase() : '';
            return (
                (task.title.toLowerCase().includes(searchLower) || entityName.includes(searchLower)) &&
                (!shouldFilterClients || filters.selectedClients.length === 0 || filters.selectedClients.includes(task.legalEntityId)) &&
                (filters.selectedYear === 'all' || new Date(task.dueDate).getFullYear() === parseInt(filters.selectedYear, 10)) &&
                (filters.selectedStatuses.length === 0 || filters.selectedStatuses.includes(task.status))
            );
        });
    }, [tasks, filters, legalEntityMap, legalEntities.length]);

    const selectableTaskIds = useMemo(() => {
        return new Set(filteredTasks.map(t => t.id));
    }, [filteredTasks]);

    const handleSelectAll = () => setSelectedTasks(new Set(selectableTaskIds));
    const handleDeselectAll = () => setSelectedTasks(new Set());

    const handleTaskSelect = (taskId: string, isSelected: boolean) => {
        setSelectedTasks(prev => {
            const newSet = new Set(prev);
            if (isSelected) newSet.add(taskId);
            else newSet.delete(taskId);
            return newSet;
        });
    };

    const handleBulkComplete = () => {
        if (selectedTasks.size === 0) return;

        // Filter tasks that can actually be completed
        const tasksToComplete = tasks.filter(t =>
            selectedTasks.has(t.id) &&
            !isTaskLocked(t) &&
            canCompleteTask(t, tasks)
        ).map(t => t.id);

        if (tasksToComplete.length > 0) {
            onBulkUpdate(tasksToComplete);
            // Optionally we could keep selected tasks that weren't completed, 
            // but clearing selection is standard behavior
            setSelectedTasks(new Set());
        }
    };

    const handleBulkDelete = async () => {
        if (selectedTasks.size === 0) return;

        // Filter valid tasks for deletion (e.g. non-automatic)
        const tasksToDelete = tasks.filter(t =>
            selectedTasks.has(t.id) &&
            !t.isAutomatic
        ).map(t => t.id);

        if (tasksToDelete.length === 0) return;

        const isConfirmed = await confirm({
            title: 'Подтверждение удаления',
            message: (
                <>
                    <p>Вы уверены, что хотите удалить выбранные задачи ({tasksToDelete.length})?</p>
                    {tasksToDelete.length < selectedTasks.size && (
                        <p className="text-sm text-yellow-600 mt-2">
                            Некоторые задачи (автоматические) не могут быть удалены и будут пропущены.
                        </p>
                    )}
                </>
            ),
            confirmButtonText: 'Удалить',
            confirmButtonClass: 'bg-red-600 hover:bg-red-700'
        });

        if (isConfirmed) {
            onBulkDelete(tasksToDelete);
            setSelectedTasks(new Set());
        }
    };

    return (
        <>
            <ReusableTaskList
                tasks={filteredTasks}
                allTasks={allTasks}
                legalEntityMap={legalEntityMap}
                selectedTaskIds={selectedTasks}
                selectableTaskIds={selectableTaskIds}
                onTaskSelect={handleTaskSelect}
                onOpenDetail={onOpenDetail}
                onDeleteTask={onDeleteTask}
                emptyStateText="Задачи по заданным критериям не найдены."
                stickyTopOffset={73}
                headerComponent={
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {selectedTasks.size > 0 ? (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-700">Выбрано: {selectedTasks.size}</span>
                                    <button onClick={handleBulkComplete} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">Выполнить</button>
                                    <button onClick={handleBulkDelete} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Удалить</button>
                                    <button onClick={handleDeselectAll} className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200">Снять</button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <button onClick={handleSelectAll} className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200" disabled={selectableTaskIds.size === 0}>Выбрать все</button>
                                    <button onClick={() => setIsFilterModalOpen(true)} className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200 flex items-center gap-2">
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                                        Фильтры
                                    </button>
                                </div>
                            )}
                        </div>
                        <div>
                            {customAddTaskButton}
                        </div>
                    </div>
                }
            />

            <FilterModal
                isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)}
                clients={legalEntities} availableYears={availableYears} filters={filters} onApplyFilters={setFilters}
            />
        </>
    );
};