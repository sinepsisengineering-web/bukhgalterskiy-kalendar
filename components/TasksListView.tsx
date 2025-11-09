// components/TasksListView.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, Client, TaskStatus } from '../types';
import { TaskItem } from './TaskItem';
import { FilterModal, FilterState } from './FilterModal';

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

export const TasksListView: React.FC<TasksListViewProps> = ({ tasks, clients, onOpenDetail, onBulkUpdate, onDeleteTask }) => {
    const [filters, setFilters] = useState<FilterState>({
        searchText: '',
        selectedClients: [],
        selectedYear: 'all',
        selectedStatuses: [],
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const scrollTargetRef = useRef<HTMLDivElement | null>(null);
    const todayRef = useRef<HTMLDivElement | null>(null);

    const legalEntityClientMap = useMemo(() => {
        const map = new Map<string, { clientId: string, clientName: string, legalEntityName: string }>();
        clients.forEach(client => {
            if (client.legalEntities) {
                client.legalEntities.forEach(le => {
                    map.set(le.id, { clientId: client.id, clientName: client.name, legalEntityName: le.name });
                });
            }
        });
        return map;
    }, [clients]);

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        tasks.forEach(task => years.add(new Date(task.dueDate).getFullYear()));
        return Array.from(years).sort((a, b) => a - b);
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const searchLower = filters.searchText.toLowerCase();
            const titleMatch = task.title.toLowerCase().includes(searchLower);
            const entityInfo = legalEntityClientMap.get(task.legalEntityId);
            const clientMatch = filters.selectedClients.length === 0 || (entityInfo && filters.selectedClients.includes(entityInfo.clientId));
            const yearMatch = filters.selectedYear === 'all' || new Date(task.dueDate).getFullYear() === parseInt(filters.selectedYear, 10);
            const statusMatch = filters.selectedStatuses.length === 0 || filters.selectedStatuses.includes(task.status);
            return titleMatch && clientMatch && yearMatch && statusMatch;
        });
    }, [tasks, filters, legalEntityClientMap]);

    const groupedTasksByDate = useMemo(() => {
        const groups = new Map<string, Task[]>();
        filteredTasks.forEach(task => {
            const dateKey = toLocalDateString(new Date(task.dueDate));
            if (!groups.has(dateKey)) {
                groups.set(dateKey, []);
            }
            groups.get(dateKey)!.push(task);
        });
        return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
    }, [filteredTasks]);

    const todayISO = toLocalDateString(new Date());

    const initialScrollTargetKey = useMemo(() => {
        if (groupedTasksByDate.has(todayISO)) return todayISO;
        const currentMonthPrefix = todayISO.substring(0, 7);
        const keysInCurrentMonth = Array.from(groupedTasksByDate.keys()).filter((key: string) => key.startsWith(currentMonthPrefix));
        if (keysInCurrentMonth.length > 0) return keysInCurrentMonth[keysInCurrentMonth.length - 1];
        for (const dateKey of groupedTasksByDate.keys()) {
            if (dateKey >= todayISO) return dateKey;
        }
        return null;
    }, [groupedTasksByDate, todayISO]);

    useEffect(() => {
        setTimeout(() => {
            scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, [initialScrollTargetKey]);

    const handleSelectAll = () => {
        if (selectedTasks.size === filteredTasks.length) {
            setSelectedTasks(new Set());
        } else {
            setSelectedTasks(new Set(filteredTasks.map(t => t.id)));
        }
    };
    
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
    
    const hasTodayTasks = useMemo(() => groupedTasksByDate.has(todayISO), [groupedTasksByDate, todayISO]);

    const handleScrollToToday = () => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md flex flex-col h-full">
                <div className="sticky top-0 bg-white p-4 border-b z-10 rounded-t-lg flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={handleSelectAll} className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200">
                            {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0 ? 'Снять выделение' : 'Выбрать все'}
                        </button>
                        <span className="text-sm text-slate-500">Выбрано: {selectedTasks.size}</span>
                    </div>
                     <div className="flex items-center gap-4">
                        <button onClick={() => setIsFilterModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" /></svg>
                            Фильтры
                        </button>
                        {hasTodayTasks && ( 
                            <button onClick={handleScrollToToday} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm" title="Перейти к сегодняшней дате">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    <circle cx="12" cy="13" r="1.5" fill="currentColor" />
                                </svg>
                                Сегодня
                            </button> 
                        )}
                        <button onClick={handleBulkComplete} disabled={selectedTasks.size === 0} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-slate-300">
                            Выполнить
                        </button>
                    </div>
                </div>
                
                <div className="overflow-y-auto flex-1 p-4">
                    {Array.from(groupedTasksByDate.entries()).map(([date, dateTasks]) => {
                        const [y, m, d] = date.split('-').map(Number);
                        const displayDate = new Date(y, m - 1, d);
                        const isToday = date === todayISO;
                        return (
                            <div key={date} ref={(el : HTMLDivElement | null) => { if (date === initialScrollTargetKey) scrollTargetRef.current = el; if (date === todayISO) todayRef.current = el; }} className="mb-6">
                                <h3 className={`text-lg font-bold text-slate-700 border-b pb-2 mb-3 sticky top-0 bg-white py-2 ${isToday ? 'text-indigo-600' : ''}`}>
                                    {displayDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="space-y-3">
                                    {dateTasks.map(task => {
                                        const entityInfo = legalEntityClientMap.get(task.legalEntityId);
                                        const clientDisplayName = entityInfo ? `${entityInfo.clientName} (${entityInfo.legalEntityName})` : '...';
                                        return (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                clientName={clientDisplayName}
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
                            <p className="text-sm text-slate-400">Попробуйте изменить или сбросить фильтры.</p>
                        </div>
                     )}
                </div>
            </div>
            
            <FilterModal 
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                clients={clients}
                availableYears={availableYears}
                filters={filters}
                onApplyFilters={setFilters}
            />
        </>
    );
};