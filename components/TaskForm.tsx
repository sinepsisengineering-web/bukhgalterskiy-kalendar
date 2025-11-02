import React, { useState, useEffect } from 'react';
import { Task, Client, TaskDueDateRule, RepeatFrequency, ReminderSetting } from '../types';

interface TaskFormProps {
    clients: Client[];
    onSave: (task: Omit<Task, 'id' | 'status' | 'isAutomatic' | 'seriesId'>) => void;
    onCancel: () => void;
    taskToEdit: Task | null;
    defaultDate: Date | null;
}

type FormData = {
    title: string;
    description: string;
    dueDate: string; // YYYY-MM-DD format
    dueTime: string;
    showTime: boolean;
    dueDateRule: TaskDueDateRule;
    clientIds: string[];
    repeat: RepeatFrequency;
    reminder: ReminderSetting;
};

const toInputDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const TaskForm: React.FC<TaskFormProps> = ({ clients, onSave, onCancel, taskToEdit, defaultDate }) => {
    
    const getInitialState = (): FormData => {
        if (taskToEdit) {
            return {
                title: taskToEdit.title,
                description: taskToEdit.description || '',
                dueDate: toInputDateString(taskToEdit.dueDate),
                dueTime: taskToEdit.dueTime || '',
                showTime: !!taskToEdit.dueTime,
                dueDateRule: taskToEdit.dueDateRule,
                clientIds: taskToEdit.clientIds,
                repeat: taskToEdit.repeat,
                reminder: taskToEdit.reminder,
            };
        }
        return {
            title: '',
            description: '',
            dueDate: toInputDateString(defaultDate || new Date()),
            dueTime: '',
            showTime: false,
            dueDateRule: TaskDueDateRule.NextBusinessDay,
            clientIds: [],
            repeat: RepeatFrequency.None,
            reminder: ReminderSetting.OneDay,
        };
    };
    
    const [formData, setFormData] = useState<FormData>(getInitialState());

    useEffect(() => {
        setFormData(getInitialState());
    }, [taskToEdit, defaultDate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
             const { checked } = e.target as HTMLInputElement;
             setFormData(prev => ({...prev, [name]: checked}));
             if(name === 'showTime' && !checked) {
                setFormData(prev => ({...prev, dueTime: ''}));
             }
        } else {
             setFormData(prev => ({...prev, [name]: value}));
        }
    };

    const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>, index: number) => {
        const newClientIds = [...formData.clientIds];
        newClientIds[index] = e.target.value;
        setFormData(prev => ({ ...prev, clientIds: newClientIds.filter(id => id) })); // Filter out empty strings
    };

    const addClientSelector = () => {
        if (formData.clientIds.length < clients.length) {
            setFormData(prev => ({ ...prev, clientIds: [...prev.clientIds, ''] }));
        }
    };
    
    const removeClientSelector = (index: number) => {
        setFormData(prev => ({ ...prev, clientIds: prev.clientIds.filter((_, i) => i !== index) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!formData.title) {
            alert("Название задачи не может быть пустым.");
            return;
        }

        const [year, month, day] = formData.dueDate.split('-').map(Number);

        onSave({
            title: formData.title,
            description: formData.description,
            dueDate: new Date(year, month - 1, day),
            dueTime: formData.showTime ? formData.dueTime : undefined,
            dueDateRule: formData.dueDateRule,
            clientIds: formData.clientIds,
            repeat: formData.repeat,
            reminder: formData.reminder,
        });
    };
    
    const availableClients = clients.filter(c => !formData.clientIds.includes(c.id));

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-slate-700">Название задачи *</label>
                <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900" />
            </div>

            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-700">Описание</label>
                <textarea name="description" id="description" value={formData.description} onChange={handleChange} rows={3} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900"></textarea>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                     <label htmlFor="dueDate" className="block text-sm font-medium text-slate-700">Дата выполнения</label>
                     <input type="date" name="dueDate" id="dueDate" value={formData.dueDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900" />
                </div>
                 <div>
                    <label htmlFor="dueDateRule" className="block text-sm font-medium text-slate-700">Правило переноса</label>
                    <select name="dueDateRule" id="dueDateRule" value={formData.dueDateRule} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                        <option value={TaskDueDateRule.NextBusinessDay}>На следующий рабочий день</option>
                        <option value={TaskDueDateRule.PreviousBusinessDay}>На предыдущий рабочий день</option>
                        <option value={TaskDueDateRule.NoTransfer}>Не переносить</option>
                    </select>
                </div>
            </div>

             <div className="flex items-center">
                <input type="checkbox" name="showTime" id="showTime" checked={formData.showTime} onChange={handleChange} className="h-4 w-4 bg-white text-slate-900 focus:ring-slate-500 border-slate-400 rounded" />
                <label htmlFor="showTime" className="ml-2 block text-sm text-slate-900">Указать время</label>
                {formData.showTime && (
                    <input type="time" name="dueTime" value={formData.dueTime} onChange={handleChange} className="ml-4 px-3 py-1 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900" />
                )}
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Клиенты</label>
                <div className="space-y-2">
                    {formData.clientIds.map((clientId, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <select value={clientId} onChange={(e) => handleClientChange(e, index)} className="flex-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                                <option value="">- Выберите клиента -</option>
                                {clientId && !clients.find(c => c.id === clientId) && <option value={clientId} disabled>{`Клиент (ID: ${clientId})`}</option>}
                                {clients.map(c => (
                                    <option key={c.id} value={c.id} disabled={formData.clientIds.includes(c.id) && c.id !== clientId}>{c.name}</option>
                                ))}
                            </select>
                            <button type="button" onClick={() => removeClientSelector(index)} className="p-2 text-red-500 hover:text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                            </button>
                        </div>
                    ))}
                    {formData.clientIds.length === 0 && (
                         <select onChange={(e) => handleClientChange(e, 0)} className="flex-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                             <option value="">- Без клиента -</option>
                             {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                    )}
                </div>
                {availableClients.length > 0 && formData.clientIds.length > 0 && (
                    <button type="button" onClick={addClientSelector} className="mt-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800">+ Добавить клиента</button>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="repeat" className="block text-sm font-medium text-slate-700">Повторение</label>
                    <select name="repeat" id="repeat" value={formData.repeat} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                       <option value={RepeatFrequency.None}>Не повторять</option>
                       <option value={RepeatFrequency.Daily}>Ежедневно</option>
                       <option value={RepeatFrequency.Weekly}>Еженедельно</option>
                       <option value={RepeatFrequency.Monthly}>Ежемесячно</option>
                       <option value={RepeatFrequency.Quarterly}>Ежеквартально</option>
                       <option value={RepeatFrequency.Yearly}>Ежегодно</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="reminder" className="block text-sm font-medium text-slate-700">Напомнить</label>
                    <select name="reminder" id="reminder" value={formData.reminder} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white border border-slate-300 rounded-md text-slate-900">
                       <option value={ReminderSetting.None}>Никогда</option>
                       <option value={ReminderSetting.OneHour}>За 1 час</option>
                       <option value={ReminderSetting.OneDay}>За 1 день</option>
                       <option value={ReminderSetting.OneWeek}>За 1 неделю</option>
                    </select>
                </div>
            </div>

            <div className="pt-4 flex justify-end gap-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
                <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
            </div>
        </form>
    );
};