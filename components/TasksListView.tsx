// src/components/TasksListView.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, LegalEntity, TaskStatus } from '../types';
import { TaskItem } from './TaskItem';
import { FilterModal, FilterState } from './FilterModal';
import { isTaskLocked } from '../services/taskGenerator';

const toLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

interface TasksListViewProps {
    tasks: Task[];
    legalEntities: LegalEntity[];
    onOpenDetail: (tasks: Task[], date: Date) => void;
    onBulkUpdate: (taskIds: string[]) => void;
    onDeleteTask: (taskId: string) => void;
    customAddTaskButton?: React.ReactNode; 
}

export const TasksListView: React.FC<TasksListViewProps> = ({ 
    tasks, 
    legalEntities, 
    onOpenDetail, 
    onBulkUpdate, 
    onDeleteTask, 
    customAddTaskButton 
}) => {
    const [filters, setFilters] = useState<FilterState>({
        searchText: '', selectedClients: [], selectedYear: 'all', selectedStatuses: [],
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const scrollTargetRef = useRef<HTMLDivElement | null>(null);
    const todayRef = useRef<HTMLDivElement | null>(null);

    const legalEntityMap = useMemo(() => {
        return new Map(legalEntities.map(le => [le.id, le]));
    }, [legalEntities]);

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

    const selectableTaskIds = useMemo(() => new Set(
        filteredTasks.filter(task => !isTaskLocked(task) && task.status !== TaskStatus.Completed).map(t => t.id)
    ), [filteredTasks]);

    const groupedTasksByDate = useMemo(() => {
        const groups = new Map<string, Task[]>();
        filteredTasks.forEach(task => {
            const dateKey = toLocalDateString(new Date(task.dueDate));
            if (!groups.has(dateKey)) groups.set(dateKey, []);
            groups.get(dateKey)!.push(task);
        });
        return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
    }, [filteredTasks]);

    const todayISO = toLocalDateString(new Date());
    const initialScrollTargetKey = useMemo(() => {
        if (groupedTasksByDate.has(todayISO)) return todayISO;
        for (const dateKey of groupedTasksByDate.keys()) {
            if (dateKey >= todayISO) return dateKey;
        }
        return null;
    }, [groupedTasksByDate, todayISO]);

    useEffect(() => {
        setTimeout(() => scrollTargetRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }), 100);
    }, [initialScrollTargetKey]);

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
        onBulkUpdate(Array.from(selectedTasks));
        setSelectedTasks(new Set());
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md flex flex-col h-full">
                <div className="sticky top-0 bg-white p-4 border-b z-20 rounded-t-lg flex items-center justify-between gap-4"> {/* Подняли z-index у шапки на всякий случай */}
                    <div className="flex items-center gap-4">
                        {selectedTasks.size > 0 ? (
                             <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-700">Выбрано: {selectedTasks.size}</span>
                                <button onClick={handleBulkComplete} className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">Выполнить</button>
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
                
                <div className="overflow-y-auto flex-1 p-4">
                    {Array.from(groupedTasksByDate.entries()).map(([date, dateTasks]) => {
                        const [y, m, d] = date.split('-').map(Number);
                        const displayDate = new Date(y, m - 1, d);
                        return (
                            <div key={date} ref={el => {  if (date === initialScrollTargetKey) scrollTargetRef.current = el; if (date === todayISO) todayRef.current = el; }} className="mb-6 bg-white">
                                {/* ИЗМЕНЕНИЕ ЗДЕСЬ: z-10 */}
                                <h3 className={`text-lg font-bold text-slate-700 border-b pb-2 mb-3 sticky top-[73px] bg-white py-2 z-10 ${date === todayISO ? 'text-indigo-600' : ''}`} style={{ transform: 'translateZ(0)' }}>
                                    {displayDate.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </h3>
                                <div className="flex flex-col gap-3">
                                    {dateTasks.map(task => {
                                        const entity = legalEntityMap.get(task.legalEntityId);
                                        const clientName = entity ? `${entity.legalForm} «${entity.name}»` : 'Юр. лицо не найдено';
                                        return (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                clientName={clientName}
                                                isSelected={selectedTasks.has(task.id)}
                                                onTaskSelect={handleTaskSelect}
                                                onOpenDetail={() => onOpenDetail(dateTasks.filter(t => new Date(t.dueDate).toDateString() === displayDate.toDateString()), displayDate)}
                                                onDeleteTask={onDeleteTask}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                     {filteredTasks.length === 0 && (
                        <div className="text-center py-16">
                            <p className="text-slate-500">Задачи по заданным критериям не найдены.</p>
                        </div>
                     )}
                </div>
            </div>
            
            <FilterModal 
                isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)}
                clients={legalEntities} availableYears={availableYears} filters={filters} onApplyFilters={setFilters}
            />
        </>
    );
};