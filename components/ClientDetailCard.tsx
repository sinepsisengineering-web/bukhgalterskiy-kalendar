// components/ClientDetailCard.tsx

import React, { useState } from 'react';
import { Client, Task, LegalEntity, TaskStatus } from '../types';
import { TaskItem } from './TaskItem';
import { Modal } from './Modal';
import { LegalEntityEditForm } from './LegalEntityEditForm';

interface ClientDetailCardProps {
  client: Client;
  tasks: Task[];
  onClose: () => void;
  onEdit: (client: Client) => void;
  onArchive: (client: Client) => void;
  onDelete: (client: Client) => void;
  onSave: (updatedClient: Client) => void;
}

const DetailRow: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{value || '-'}</dd>
    </div>
);

interface LegalEntityDetailsProps {
    entity: LegalEntity;
    onEdit: () => void;
}
const LegalEntityDetails: React.FC<LegalEntityDetailsProps> = ({ entity, onEdit }) => (
    <div className="mb-6 p-4 border border-slate-200 rounded-lg bg-slate-50 relative">
        <button onClick={onEdit} className="absolute top-2 right-2 p-2 text-slate-500 hover:text-indigo-600" title="Редактировать">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg>
        </button>
        <h4 className="text-lg font-semibold text-slate-800 mb-2">{entity.legalForm} «{entity.name}»</h4>
        <dl className="divide-y divide-slate-200">
            <DetailRow label="ИНН / КПП" value={`${entity.inn} / ${entity.kpp || '-'}`} />
            <DetailRow label="ОГРН / ОГРНИП" value={entity.ogrn} />
            <DetailRow label="Дата ОГРН" value={entity.ogrnDate ? new Date(entity.ogrnDate).toLocaleDateString('ru-RU') : '-'} />
            <DetailRow label="Система налогообложения" value={entity.taxSystem} />
            <DetailRow label="Плательщик НДС" value={entity.isNdsPayer ? `Да ${entity.ndsValue ? `(${entity.ndsValue})` : ''}`: 'Нет'} />
            <DetailRow label="Сотрудники" value={entity.hasEmployees ? 'Есть' : 'Нет'} />
            <DetailRow label="Юридический адрес" value={entity.legalAddress} />
            <DetailRow label="Фактический адрес" value={entity.actualAddress} />
            <DetailRow label="Контактное лицо" value={entity.contactPerson} />
            <DetailRow label="Телефон / Email" value={`${entity.phone} / ${entity.email}`} />
        </dl>
    </div>
);

export const ClientDetailCard: React.FC<ClientDetailCardProps> = ({ client, tasks, onClose, onEdit, onArchive, onDelete, onSave }) => {
  const [editingEntity, setEditingEntity] = useState<LegalEntity | null>(null);

  const overdueTasks = tasks.filter(t => t.status === TaskStatus.Overdue).length;
  const dueSoonTasks = tasks.filter(t => t.status === TaskStatus.DueSoon).length;
  const legalEntityNames = new Map(client.legalEntities.map(le => [le.id, le.name]));

  const handleSaveLegalEntity = (updatedEntity: LegalEntity) => {
    const updatedClient = {
        ...client,
        legalEntities: client.legalEntities.map(le => 
            le.id === updatedEntity.id ? updatedEntity : le
        )
    };
    onSave(updatedClient);
    setEditingEntity(null);
  };

  return (
    <>
      <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
          <div className="flex justify-between items-start pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{client.name}</h2>
              <div className="flex gap-4 mt-2">
                {overdueTasks > 0 && <span className="text-sm font-medium text-red-600">{overdueTasks} просрочено</span>}
                {dueSoonTasks > 0 && <span className="text-sm font-medium text-yellow-600">{dueSoonTasks} скоро срок</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => onEdit(client)} className="p-2 text-slate-500 hover:text-indigo-600" title="Редактировать клиента"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
                <button onClick={() => onArchive(client)} className="p-2 text-slate-500 hover:text-yellow-600" title="Архивировать"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></button>
                <button onClick={() => onDelete(client)} className="p-2 text-slate-500 hover:text-red-600" title="Удалить"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800" title="Закрыть"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            <div className="space-y-6">
              <div>
                 <h3 className="text-xl font-semibold text-slate-700 mb-3">Реквизиты</h3>
                 {client.legalEntities.map(entity => (
                    <LegalEntityDetails key={entity.id} entity={entity} onEdit={() => setEditingEntity(entity)} />
                 ))}
              </div>
            </div>
          </div>
      </div>

      {editingEntity && (
        <Modal isOpen={!!editingEntity} onClose={() => setEditingEntity(null)} title={`Редактирование: ${editingEntity.name}`}>
            <LegalEntityEditForm 
                legalEntity={editingEntity}
                onSave={handleSaveLegalEntity}
                onCancel={() => setEditingEntity(null)}
            />
        </Modal>
      )}
    </>
  );
};