// components/TasksListView.tsx

import React, { useState, useMemo, useEffect, useRef } from 'react';
// <<< ИЗМЕНЕНО: Импортируем LegalEntity вместо Client >>>
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

// <<< ИЗМЕНЕНО: Пропсы обновлены >>>
interface TasksListViewProps {
    tasks: Task[];
    legalEntities: LegalEntity[];
    onOpenDetail: (tasks: Task[]) => void;
    onBulkUpdate: (taskIds: string[]) => void;
    onDeleteTask: (taskId: string) => void;
}

export const TasksListView: React.FC<TasksListViewProps> = ({ tasks, legalEntities, onOpenDetail, onBulkUpdate }) => {
    // <<< ИЗМЕНЕНО: Фильтр теперь работает с selectedLegalEntities >>>
    const [filters, setFilters] = useState<FilterState>({
        searchText: '', selectedClients: [], selectedYear: 'all', selectedStatuses: [], // selectedClients будет адаптирован в FilterModal
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
    const scrollTargetRef = useRef<HTMLDivElement | null>(null);
    const todayRef = useRef<HTMLDivElement | null>(null);

    // <<< ИЗМЕНЕНО: Карта стала проще - ищем юр. лицо по ID >>>
    const legalEntityMap = useMemo(() => {
        return new Map(legalEntities.map(le => [le.id, le]));
    }, [legalEntities]);

    const availableYears = useMemo(() => Array.from(new Set(tasks.map(task => new Date(task.dueDate).getFullYear()))).sort((a, b) => a - b), [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const searchLower = filters.searchText.toLowerCase();
            const entity = legalEntityMap.get(task.legalEntityId);
            const entityName = entity ? `${entity.legalForm} ${entity.name} ${entity.inn}`.toLowerCase() : '';
            
            return (
                (task.title.toLowerCase().includes(searchLower) || entityName.includes(searchLower)) &&
                // <<< ИЗМЕНЕНО: Логика фильтрации по юр. лицу >>>
                (filters.selectedClients.length === 0 || filters.selectedClients.includes(task.legalEntityId)) &&
                (filters.selectedYear === 'all' || new Date(task.dueDate).getFullYear() === parseInt(filters.selectedYear, 10)) &&
                (filters.selectedStatuses.length === 0 || filters.selectedStatuses.includes(task.status))
            );
        });
    }, [tasks, filters, legalEntityMap]);

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
    
    const handleTaskSelect = (taskId: string, isSelected: boolean) => { /* ... */ };
    const handleBulkComplete = () => { /* ... */ };

    return (
        <>
            <div className="bg-white rounded-lg shadow-md flex flex-col h-full">
                <div className="sticky top-0 bg-white p-4 border-b z-10 rounded-t-lg flex items-center justify-between">
                    {/* ... блок кнопок ... */}
                </div>
                
                <div className="overflow-y-auto flex-1 p-4">
                    {Array.from(groupedTasksByDate.entries()).map(([date, dateTasks]) => {
                        const [y, m, d] = date.split('-').map(Number);
                        const displayDate = new Date(y, m - 1, d);
                        return (
                            <div key={date} ref={el => { if (date === initialScrollTargetKey) scrollTargetRef.current = el; if (date === todayISO) todayRef.current = el; }} className="mb-6">
                                <h3 className={`text-lg font-bold text-slate-700 border-b pb-2 mb-3 sticky top-0 bg-white py-2 ${date === todayISO ? 'text-indigo-600' : ''}`}>
                                    {displayDate.toLocaleString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                </h3>
                                <div className="space-y-3">
                                    {dateTasks.map(task => {
                                        // <<< ИЗМЕНЕНО: Логика получения имени >>>
                                        const entity = legalEntityMap.get(task.legalEntityId);
                                        const clientName = entity ? `${entity.legalForm} «${entity.name}»` : 'Юр. лицо не найдено';
                                        return (
                                            <TaskItem
                                                key={task.id}
                                                task={task}
                                                clientName={clientName}
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
            
            {/* <<< ИЗМЕНЕНО: Передаем legalEntities в FilterModal >>> */}
            <FilterModal 
                isOpen={isFilterModalOpen} onClose={() => setIsFilterModalOpen(false)}
                clients={legalEntities} availableYears={availableYears} filters={filters} onApplyFilters={setFilters}
            />
        </>
    );
};