import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Task, Client, TaskStatus } from '../types';
import { TasksListItem } from './TasksListItem';
import { TASK_STATUS_STYLES } from '../constants';

// Timezone-safe function to get YYYY-MM-DD string from a local date
const toLocalDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// FIX: Define the props interface for the TasksListView component.
interface TasksListViewProps {
    tasks: Task[];
    clients: Client[];
    onOpenDetail: (tasks: Task[]) => void;
    onBulkUpdate: (taskIds: string[]) => void;
}

export const TasksListView: React.FC<TasksListViewProps> = ({ tasks, clients, onOpenDetail, onBulkUpdate }) => {
    // Filter State
    const [searchText, setSearchText] = useState('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>('all');
    const [selectedStatuses, setSelectedStatuses] = useState<TaskStatus[]>([]);
    
    // Selection State
    const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

    const scrollTargetRef = useRef<HTMLDivElement>(null);
    const todayRef = useRef<HTMLDivElement>(null);
    
    const handleStatusToggle = (status: TaskStatus) => {
        setSelectedStatuses(prev => {
            const newSet = new Set(prev);
            if (newSet.has(status)) {
                newSet.delete(status);
            } else {
                newSet.add(status);
            }
            return Array.from(newSet);
        });
    };

    const availableYears = useMemo(() => {
        const years = new Set<number>();
        tasks.forEach(task => years.add(task.dueDate.getFullYear()));
        return Array.from(years).sort((a, b) => a - b);
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const searchLower = searchText.toLowerCase();
            const titleMatch = task.title.toLowerCase().includes(searchLower);

            const clientMatch = selectedClients.length === 0 || task.clientIds.some(cid => selectedClients.includes(cid));

            const yearMatch = selectedYear === 'all' || task.dueDate.getFullYear() === parseInt(selectedYear, 10);

            const statusMatch = selectedStatuses.length === 0 || selectedStatuses.includes(task.status);

            return titleMatch && clientMatch && yearMatch && statusMatch;
        });
    }, [tasks, searchText, selectedClients, selectedYear, selectedStatuses]);

    const groupedTasksByDate = useMemo(() => {
        const dateGroups = new Map<string, Task[]>();
        filteredTasks.forEach(task => {
            const dateKey = toLocalDateString(task.dueDate);
            if (!dateGroups.has(dateKey)) {
                dateGroups.set(dateKey, []);
            }
            dateGroups.get(dateKey)!.push(task);
        });

        const finalGroups = new Map<string, Task[][]>();
        dateGroups.forEach((dateTasks, dateKey) => {
            const taskTitleGroups = new Map<string, Task[]>();
            dateTasks.forEach(task => {
                const titleKey = task.title;
                if (!taskTitleGroups.has(titleKey)) {
                    taskTitleGroups.set(titleKey, []);
                }
                taskTitleGroups.get(titleKey)!.push(task);
            });
            finalGroups.set(dateKey, Array.from(taskTitleGroups.values()));
        });
        
        return new Map([...finalGroups.entries()].sort(([a], [b]) => a.localeCompare(b)));
    }, [filteredTasks]);

    const todayISO = toLocalDateString(new Date());

    const initialScrollTargetKey = useMemo(() => {
        // 1. If today has tasks, target today.
        if (groupedTasksByDate.has(todayISO)) {
            return todayISO;
        }
        
        // 2. Otherwise, find the last task in the current month.
        const currentMonthPrefix = todayISO.substring(0, 7); // "YYYY-MM"
        const keysInCurrentMonth = Array.from(groupedTasksByDate.keys())
          // FIX: Explicitly type `key` as `string` to resolve TypeScript inference issue.
          .filter((key: string) => key.startsWith(currentMonthPrefix));
    
        if (keysInCurrentMonth.length > 0) {
          return keysInCurrentMonth[keysInCurrentMonth.length - 1];
        }
        
        // 3. Fallback if current month is empty: find the first UPCOMING task.
        for (const dateKey of groupedTasksByDate.keys()) {
            if (dateKey >= todayISO) {
                return dateKey;
            }
        }
    
        // 4. Final fallback: If no upcoming tasks, don't scroll.
        return null;
    }, [groupedTasksByDate, todayISO]);

    useEffect(() => {
        // Scroll to the calculated target on initial mount/remount
        setTimeout(() => {
            scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, [initialScrollTargetKey]);

    const handleSelectAll = () => {
        if (selectedTasks.size === filteredTasks.length) {
            setSelectedTasks(new Set()); // Deselect all
        } else {
            setSelectedTasks(new Set(filteredTasks.map(t => t.id))); // Select all filtered
        }
    };
    
    const handleTaskSelect = (taskId: string, isSelected: boolean) => {
        setSelectedTasks(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                newSet.add(taskId);
            } else {
                newSet.delete(taskId);
            }
            return newSet;
        });
    };
    
    const handleBulkComplete = () => {
        onBulkUpdate(Array.from(selectedTasks));
        setSelectedTasks(new Set());
    }
    
    const hasTodayTasks = useMemo(() => groupedTasksByDate.has(todayISO), [groupedTasksByDate, todayISO]);

    const handleScrollToToday = () => {
        todayRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    };

    return (
        <div className="bg-white rounded-lg shadow-md flex flex-col h-[calc(100vh-160px)]">
            {/* Sticky Header */}
            <div className="sticky top-0 bg-white p-4 border-b z-10 rounded-t-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input type="text" placeholder="Поиск по названию..." value={searchText} onChange={e => setSearchText(e.target.value)} className="md:col-span-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 w-full"/>
                    <select multiple onChange={e => setSelectedClients(Array.from(e.target.selectedOptions, option => (option as HTMLOptionElement).value))} className="md:col-span-1 p-2 bg-white border border-slate-300 rounded-md text-slate-900 w-full" defaultValue={[]}>
                        <option value="" disabled>Фильтр по клиентам</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.legalForm} «{c.name}»</option>)}
                    </select>
                     <select onChange={e => setSelectedYear(e.target.value)} value={selectedYear} className="md:col-span-1 p-2 bg-white border border-slate-300 rounded-md text-slate-900 w-full">
                        <option value="all">Все года</option>
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>

                 <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
                    <span className="text-sm font-medium text-slate-600">Статус:</span>
                    {Object.values(TaskStatus).map(status => {
                        const isSelected = selectedStatuses.includes(status);
                        const statusStyle = TASK_STATUS_STYLES[status];
                        return (
                            <button
                                key={status}
                                onClick={() => handleStatusToggle(status)}
                                className={`px-3 py-1 text-xs font-semibold rounded-full border transition-all ${
                                    isSelected
                                        ? `${statusStyle.bg.replace('-100', '-500')} text-white border-transparent shadow-sm`
                                        : `${statusStyle.bg} ${statusStyle.text} ${statusStyle.border} hover:opacity-80`
                                }`}
                            >
                                {status}
                            </button>
                        );
                    })}
                    {selectedStatuses.length > 0 && (
                            <button onClick={() => setSelectedStatuses([])} className="text-xs text-indigo-600 hover:underline">
                            Сбросить
                        </button>
                    )}
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={handleSelectAll} className="px-4 py-2 text-sm font-semibold text-indigo-700 bg-indigo-100 border border-transparent rounded-md hover:bg-indigo-200">
                             {selectedTasks.size === filteredTasks.length && filteredTasks.length > 0 ? 'Снять выделение' : 'Выбрать все'}
                        </button>
                         <span className="text-sm text-slate-500">Выбрано: {selectedTasks.size}</span>
                    </div>
                     <div className="flex items-center gap-4">
                        {hasTodayTasks && (
                            <button
                                onClick={handleScrollToToday}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 shadow-sm"
                                title="Перейти к сегодняшней дате"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    <circle cx="12" cy="13" r="1.5" fill="currentColor" />
                                </svg>
                                Сегодня
                            </button>
                        )}
                        <button onClick={handleBulkComplete} disabled={selectedTasks.size === 0} className="px-4 py-2 text-sm font-semibold text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed">
                            Отметить как выполненные
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Scrollable List */}
            <div className="overflow-y-auto flex-1 p-4">
                {Array.from(groupedTasksByDate.entries()).map(([date, taskGroups]) => {
                    const [y, m, d] = date.split('-').map(Number);
                    const displayDate = new Date(y, m - 1, d);
                    const isToday = date === todayISO;

                    return (
                        <div 
                            key={date} 
                            ref={(el : HTMLDivElement | null) => {
                                if (date === initialScrollTargetKey) scrollTargetRef.current = el;
                                if (date === todayISO) todayRef.current = el;
                            }} 
                            className="mb-6"
                        >
                            <h3 className={`text-lg font-bold text-slate-700 border-b pb-2 mb-3 sticky top-0 bg-white py-2 ${isToday ? 'text-indigo-600' : ''}`}>
                                {displayDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </h3>
                            <div className="space-y-3">
                                {taskGroups.map(group => (
                                    <TasksListItem
                                        key={group[0].seriesId || group[0].id}
                                        tasks={group}
                                        clients={clients}
                                        onOpenDetail={onOpenDetail}
                                        selectedTasks={selectedTasks}
                                        onTaskSelect={handleTaskSelect}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                })}
                 {filteredTasks.length === 0 && (
                    <div className="text-center py-16">
                        <p className="text-slate-500">Задачи по заданным критериям не найдены.</p>
                        <p className="text-sm text-slate-400">Попробуйте изменить или сбросить фильтры.</p>
                    </div>
                 )}
            </div>
        </div>
    );
};