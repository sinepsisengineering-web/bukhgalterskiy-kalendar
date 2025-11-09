// components/ClientEditForm.tsx

import React, { useState, useEffect } from 'react';
import { Client } from '../types';

interface ClientEditFormProps {
  client: Client;
  onSave: (updatedClient: Pick<Client, 'id' | 'name'>) => void;
  onCancel: () => void;
}

export const ClientEditForm: React.FC<ClientEditFormProps> = ({ client, onSave, onCancel }) => {
  const [name, setName] = useState(client.name);

  useEffect(() => {
    setName(client.name);
  }, [client]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
        alert('Имя клиента не может быть пустым.');
        return;
    }
    onSave({ id: client.id, name });
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-6">
      <div>
        <label htmlFor="clientName" className="block text-sm font-medium text-slate-700">Наименование клиента</label>
        <input
          type="text"
          id="clientName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"
        />
      </div>
      <div className="pt-4 flex justify-end gap-4">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
        <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
      </div>
    </form>
  );
};