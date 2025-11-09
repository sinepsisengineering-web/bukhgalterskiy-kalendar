// components/TasksListView.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, Client, TaskStatus } from '../types';
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
    clients: Client[];
    onOpenDetail: (tasks: Task[]) => void;
    onBulkUpdate: (taskIds: string[]) => void;
    onDeleteTask: (taskId: string) => void;
}

export const TasksListView: React.FC<TasksListViewProps> = ({ tasks, clients, onOpenDetail, onBulkUpdate }) => {
    const [filters, setFilters] = useState<FilterState>({
        searchText: '', selectedClients: [], selectedYear: 'all', selectedStatuses: [],
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const scrollTargetRef = useRef<HTMLDivElement | null>(null);
    const todayRef = useRef<HTMLDivElement | null>(null);

    const legalEntityClientMap = useMemo(() => {
        const map = new Map<string, { clientId: string, clientName: string, legalEntityName: string }>();
        clients.forEach(client => {
            client.legalEntities?.forEach(le => {
                map.set(le.id, { clientId: client.id, clientName: client.name, legalEntityName: le.name });
            });
        });
        return map;
    }, [clients]);

    const availableYears = useMemo(() => Array.from(new Set(tasks.map(task => new Date(task.dueDate).getFullYear()))).sort((a, b) => a - b), [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const searchLower = filters.searchText.toLowerCase();
            const entityInfo = legalEntityClientMap.get(task.legalEntityId);
            return (
                task.title.toLowerCase().includes(searchLower) &&
                (filters.selectedClients.length === 0 || (entityInfo && filters.selectedClients.includes(entityInfo.clientId))) &&
                (filters.selectedYear === 'all' || new Date(task.dueDate).getFullYear() === parseInt(filters.selectedYear, 10)) &&
                (filters.selectedStatuses.length === 0 || filters.selectedStatuses.includes(task.status))
            );
        });
    }, [tasks, filters, legalEntityClientMap]);

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
        onBulkUpdate(Array.from(selectedTasks));
        setSelectedTasks(new Set());
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md flex flex-col h-full">
                <div className="sticky top-0 bg-white p-4 border-b z-10 rounded-t-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* <<<===== ИСПРАВЛЕНА ЛОГИКА КНОПОК ВЫДЕЛЕНИЯ =====>>> */}
                        <button onClick={handleSelectAll} disabled={selectableTaskIds.size === 0} className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            Выбрать все
                        </button>
                        {selectedTasks.size > 0 && (
                            <button onClick={handleDeselectAll} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 rounded-md hover:bg-slate-300">
                                Снять выделение
                            </button>
                        )}
                        <span className="text-sm text-slate-500">Выбрано: {selectedTasks.size}</span>
                    </div>
                     <div className="flex items-center gap-4">
                        <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm">
                           Фильтры
                        </button>
                        <button onClick={handleBulkComplete} disabled={selectedTasks.size === 0} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-300">
                            Выполнить
                        </button>
                    </div>
                </div>
                
                <div className="overflow-y-auto flex-1 p-4">
                    {Array.from(groupedTasksByDate.entries()).map(([date, dateTasks]) => {
                        const [y, m, d] = date.split('-').map(Number);
                        const displayDate = new Date(y, m - 1, d);
                        return (
                            <div key={date} ref={el => { if (date === initialScrollTargetKey) scrollTargetRef.current = el; if (date === todayISO) todayRef.current = el; }} className="mb-6">
                                <h3 className={`text-lg font-bold text-slate-700 border-b pb-2 mb-3 sticky top-0 bg-white py-2 ${date === todayISO ? 'text-indigo-600' : ''}`}>
                                    {displayDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="space-y-3">
                                    {dateTasks.map(task => {
                                        const entityInfo = legalEntityClientMap.get(task.legalEntityId);
                                        return (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                clientName={entityInfo ? `${entityInfo.clientName} (${entityInfo.legalEntityName})` : '...'}
                                                isSelected={selectedTasks.has(task.id)}
                                                onTaskSelect={handleTaskSelect}
                                                onOpenDetail={() => onOpenDetail([task])}
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
                clients={clients} availableYears={availableYears} filters={filters} onApplyFilters={setFilters}
            />
        </>
    );
};