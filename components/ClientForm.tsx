// components/ClientForm.tsx

import React, { useState, useEffect } from 'react';
import { Client, LegalEntity, LegalForm, TaxSystem } from '../types';
import { LegalEntityForm } from './LegalEntityForm';

interface ClientFormProps {
  client: Client | null;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

const createNewLegalEntity = (): LegalEntity => ({
  id: `le-${Date.now()}`,
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

const createNewClient = (): Omit<Client, 'id'> => ({
    name: '',
    legalEntities: [createNewLegalEntity()],
    isArchived: false,
});


export const ClientForm: React.FC<ClientFormProps> = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState(createNewClient());

  useEffect(() => {
    if (client) {
      setFormData({ ...createNewClient(), ...client });
    } else {
      setFormData(createNewClient());
    }
  }, [client]);

  const handleClientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, name: e.target.value }));
  };
  
  const handleLegalEntityChange = (index: number, updatedLegalEntity: LegalEntity) => {
    const newLegalEntities = [...formData.legalEntities];
    newLegalEntities[index] = updatedLegalEntity;
    setFormData(prev => ({ ...prev, legalEntities: newLegalEntities }));
  };

  const addLegalEntity = () => {
    setFormData(prev => ({
        ...prev,
        legalEntities: [...prev.legalEntities, createNewLegalEntity()]
    }));
  };

  const removeLegalEntity = (index: number) => {
    if (formData.legalEntities.length <= 1) {
        alert("Должен быть как минимум один представитель (юрлицо/ИП).");
        return;
    }
    const newLegalEntities = formData.legalEntities.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, legalEntities: newLegalEntities }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
        alert('Пожалуйста, введите наименование клиента.');
        return;
    }
    onSave({ id: client?.id || `client-${Date.now()}`, ...formData });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div>
         <label htmlFor="clientName" className="block text-xl font-medium text-slate-700">Наименование клиента</label>
         <p className="text-sm text-slate-500 mb-2">Это общее название для группы юрлиц, например, "ИП Иванов" или "ГК Ромашка".</p>
         <input 
            type="text" 
            id="clientName" 
            name="clientName" 
            value={formData.name} 
            onChange={handleClientNameChange} 
            required 
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900 text-lg"
            placeholder="Например, Группа компаний 'Вектор'"
         />
       </div>

      <div className="space-y-4">
        <h3 className="text-xl font-medium text-slate-900">Юридические лица / ИП клиента</h3>
        {formData.legalEntities.map((le, index) => (
            <LegalEntityForm
                key={le.id}
                legalEntity={le}
                onChange={(updated) => handleLegalEntityChange(index, updated)}
                onRemove={() => removeLegalEntity(index)}
            />
        ))}
      </div>
        
      <button 
        type="button" 
        onClick={addLegalEntity} 
        className="w-full text-center px-4 py-2 border-2 border-dashed border-slate-300 text-slate-600 rounded-md hover:border-indigo-500 hover:text-indigo-600 transition-colors"
      >
        + Добавить еще одно юрлицо / ИП
      </button>

      <div className="pt-4 flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить клиента</button>
      </div>
    </form>
  );
};