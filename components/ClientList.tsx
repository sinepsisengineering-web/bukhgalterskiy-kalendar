
import React from 'react';
import { Client } from '../types';

interface ClientListProps {
  clients: Client[];
  onSelectClient: (client: Client) => void;
  onAddClient: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({ clients, onSelectClient, onAddClient }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Клиенты</h2>
        <button
          onClick={onAddClient}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors shadow"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Добавить клиента
        </button>
      </div>
      
      {clients.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
          <p className="text-slate-500">Список клиентов пуст.</p>
          <p className="text-slate-500">Нажмите "Добавить клиента", чтобы начать.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map(client => (
            <div
              key={client.id}
              onClick={() => onSelectClient(client)}
              className="p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:shadow-lg cursor-pointer transition-all duration-200"
            >
              <div className="flex justify-between items-start">
                  <div>
                      <h3 className="font-semibold text-lg text-indigo-700">{client.legalForm} «{client.name}»</h3>
                      <p className="text-sm text-slate-600">ИНН: {client.inn}</p>
                  </div>
                  <span className="text-xs font-medium bg-slate-200 text-slate-700 px-2 py-1 rounded-full">{client.taxSystems.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};