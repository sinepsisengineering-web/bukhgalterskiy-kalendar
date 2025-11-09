// components/ClientForm.tsx

import React, { useState, useEffect } from 'react';
// <<< ИЗМЕНЕНО: Client больше не нужен >>>
import { LegalEntity, LegalForm, TaxSystem } from '../types';
import { LegalEntityForm } from './LegalEntityForm';

// <<< ИЗМЕНЕНО: Интерфейс пропсов обновлен для работы с LegalEntity >>>
interface ClientFormProps {
  legalEntity: LegalEntity | null;
  onSave: (entity: LegalEntity) => void;
  onCancel: () => void;
}

// <<< Эта функция остается, она идеальна для создания нового пустого юр. лица >>>
const createNewLegalEntity = (): LegalEntity => ({
  id: `le-${Date.now()}-${Math.random()}`, // Добавим Math.random для большей уникальности
  name: '',
  legalForm: LegalForm.OOO,
  inn: '',
  kpp: '',
  ogrn: '',
  ogrnDate: undefined,
  legalAddress: '',
  actualAddress: '',
  contactPerson: '',
  phone: '',
  email: '',
  taxSystem: TaxSystem.USN_DOHODY,
  isNdsPayer: false,
  ndsValue: '',
  hasEmployees: false,
  notes: '',
  credentials: [],
  patents: [],
});

// <<< УДАЛЕНО: Функция createNewClient больше не нужна >>>

// <<< ИЗМЕНЕНО: Название компонента оставляем прежним для простоты, но логика полностью новая >>>
export const ClientForm: React.FC<ClientFormProps> = ({ legalEntity, onSave, onCancel }) => {
  // <<< ИЗМЕНЕНО: Состояние теперь хранит только один объект LegalEntity >>>
  const [formData, setFormData] = useState<LegalEntity>(createNewLegalEntity());

  useEffect(() => {
    if (legalEntity) {
      setFormData(legalEntity);
    } else {
      setFormData(createNewLegalEntity());
    }
  }, [legalEntity]);

  // <<< УДАЛЕНО: Все старые обработчики (add, remove, handleClientNameChange) убраны >>>

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Простая валидация
    if (!formData.name.trim() || !formData.inn.trim()) {
        alert('Пожалуйста, введите наименование и ИНН.');
        return;
    }
    // <<< ИЗМЕНЕНО: Вызываем onSave с одним объектом LegalEntity >>>
    onSave({ ...formData, id: legalEntity?.id || formData.id });
  };
  
  return (
    // <<< ИЗМЕНЕНО: Форма теперь не содержит лишних полей и логики >>>
    <form onSubmit={handleSubmit} className="space-y-6">
       {/* <<< УДАЛЕНО: Поле "Наименование клиента" и его описание убраны >>> */}

      <div className="space-y-4">
        {/* <<< УДАЛЕНО: Цикл .map() и заголовок для списка юрлиц >>> */}
        <LegalEntityForm
            // key больше не нужен, т.к. нет списка
            legalEntity={formData}
            // <<< ИЗМЕНЕНО: onChange теперь напрямую обновляет состояние formData >>>
            onChange={(updated) => setFormData(updated)}
            // onRemove больше не нужен
        />
      </div>
        
      {/* <<< УДАЛЕНО: Кнопка "Добавить еще одно юрлицо" >>> */}

      <div className="pt-4 flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
          {/* <<< ИЗМЕНЕНО: Текст на кнопке сохранения >>> */}
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
      </div>
    </form>
  );
};