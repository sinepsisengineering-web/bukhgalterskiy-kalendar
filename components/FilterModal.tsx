// components/FilterModal.tsx

import React from 'react';
import { Modal } from './Modal';
// <<< ИЗМЕНЕНО: Импортируем LegalEntity вместо Client >>>
import { LegalEntity, TaskStatus } from '../types';

export interface FilterState {
  searchText: string;
  selectedClients: string[]; // Оставим имя поля для простоты, но теперь это ID юрлиц
  selectedYear: string;
  selectedStatuses: TaskStatus[];
}

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  // <<< ИЗМЕНЕНО: Тип пропа clients заменен на LegalEntity[] >>>
  clients: LegalEntity[]; 
  availableYears: number[];
  filters: FilterState;
  onApplyFilters: (newFilters: FilterState) => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ isOpen, onClose, clients, availableYears, filters, onApplyFilters }) => {
  const [localFilters, setLocalFilters] = React.useState<FilterState>(filters);

  React.useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleClientToggle = (entityId: string) => {
    setLocalFilters(prev => {
      const newClients = new Set(prev.selectedClients);
      if (newClients.has(entityId)) {
        newClients.delete(entityId);
      } else {
        newClients.add(entityId);
      }
      return { ...prev, selectedClients: Array.from(newClients) };
    });
  };
  
  const handleStatusToggle = (status: TaskStatus) => { /* ... без изменений ... */ };
  const handleApply = () => { /* ... без изменений ... */ };
  const handleReset = () => { /* ... без изменений ... */ };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Настроить фильтры">
      <div className="p-4 space-y-6">
        
        {/* ... остальные поля фильтра без изменений ... */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Поиск по названию или ИНН</label>
          <input
            type="text"
            placeholder="Введите название задачи, юрлица или ИНН..."
            value={localFilters.searchText}
            onChange={e => setLocalFilters(prev => ({ ...prev, searchText: e.target.value }))}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Год</label>
          <select 
            onChange={e => setLocalFilters(prev => ({...prev, selectedYear: e.target.value}))} 
            value={localFilters.selectedYear} 
            className="w-full mt-1 p-2 bg-white border border-slate-300 rounded-md text-slate-900">
              <option value="all">Все года</option>
              {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Статус</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(TaskStatus).map(status => (
                <button
                    key={status}
                    onClick={() => handleStatusToggle(status)}
                    className={`px-3 py-1 text-sm rounded-full border ${localFilters.selectedStatuses.includes(status) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-700 border-slate-300'}`}
                >{status}</button>
            ))}
          </div>
        </div>


        {/* <<< ИЗМЕНЕН БЛОК ФИЛЬТРА ПО КЛИЕНТАМ >>> */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Клиенты (юр. лица)</label>
          <div className="max-h-40 overflow-y-auto space-y-2 border p-2 rounded-md">
            {clients.map(entity => (
              <div key={entity.id} className="flex items-center">
                <input
                  type="checkbox"
                  id={`client-filter-${entity.id}`}
                  checked={localFilters.selectedClients.includes(entity.id)}
                  onChange={() => handleClientToggle(entity.id)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor={`client-filter-${entity.id}`} className="ml-2 text-sm text-slate-800">
                  {`${entity.legalForm} «${entity.name}»`}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-between items-center">
          <button onClick={handleReset} className="text-sm text-red-600 hover:underline">
            Сбросить все фильтры
          </button>
          <div className="flex gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
            <button type="button" onClick={handleApply} className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Применить</button>
          </div>
        </div>

      </div>
    </Modal>
  );
};