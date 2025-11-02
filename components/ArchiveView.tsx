import React from 'react';
import { Client } from '../types';

interface ArchiveViewProps {
  archivedClients: Client[];
  onUnarchive: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({ archivedClients, onUnarchive, onDelete }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-slate-800 mb-6">Архив клиентов</h2>
      {archivedClients.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg">
          <p className="text-slate-500">Архив пуст.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {archivedClients.map(client => (
            <div
              key={client.id}
              className="p-4 border border-slate-200 rounded-lg bg-slate-50"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                  <h3 className="font-semibold text-lg text-slate-700">{client.legalForm} «{client.name}»</h3>
                  <p className="text-sm text-slate-500">ИНН: {client.inn}</p>
                </div>
                <div className="flex items-center gap-4 mt-3 sm:mt-0">
                  <button
                    onClick={() => onUnarchive(client.id)}
                    className="px-3 py-1.5 text-sm font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors"
                  >
                    Восстановить
                  </button>
                  <button
                    onClick={() => onDelete(client.id)}
                    className="px-3 py-1.5 text-sm font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200 transition-colors"
                  >
                    Удалить навсегда
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
