// components/ClientDetailCard.tsx

import React from 'react';
// <<< ИЗМЕНЕНО: Client больше не нужен, Task и TaskStatus могут понадобиться для отображения задач >>>
import { Task, LegalEntity, TaskStatus } from '../types';

// <<< ИЗМЕНЕНО: Интерфейс пропсов полностью переписан под LegalEntity >>>
interface ClientDetailCardProps {
  legalEntity: LegalEntity;
  tasks: Task[];
  onClose: () => void;
  onEdit: (entity: LegalEntity) => void;
  onArchive: (entity: LegalEntity) => void;
  onDelete: (entity: LegalEntity) => void;
  // onSave убран, так как эта логика теперь полностью в App.tsx
}

// <<< Этот компонент-хелпер остается без изменений, он нам пригодится >>>
const DetailRow: React.FC<{ label: string; value?: string | React.ReactNode }> = ({ label, value }) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2">{value || '-'}</dd>
    </div>
);

// <<< ИЗМЕНЕНО: Внутренний компонент LegalEntityDetails и модальное окно удалены >>>

// <<< ИЗМЕНЕНО: Компонент теперь называется ClientDetailCard, но работает с LegalEntity >>>
export const ClientDetailCard: React.FC<ClientDetailCardProps> = ({ legalEntity, tasks, onClose, onEdit, onArchive, onDelete }) => {
  // <<< ИЗМЕНЕНО: Считаем задачи для текущего юр. лица >>>
  const overdueTasks = tasks.filter(t => t.status === TaskStatus.Overdue).length;
  const dueSoonTasks = tasks.filter(t => t.status === TaskStatus.DueSoon).length;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">
        <div className="flex justify-between items-start pb-4 border-b border-slate-200">
          <div>
            {/* <<< ИЗМЕНЕНО: Заголовок теперь формируется из данных legalEntity >>> */}
            <h2 className="text-2xl font-bold text-slate-800">{`${legalEntity.legalForm} «${legalEntity.name}»`}</h2>
            <div className="flex gap-4 mt-2">
              {overdueTasks > 0 && <span className="text-sm font-medium text-red-600">{overdueTasks} просрочено</span>}
              {dueSoonTasks > 0 && <span className="text-sm font-medium text-yellow-600">{dueSoonTasks} скоро срок</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
              {/* <<< ИЗМЕНЕНО: Обработчики кнопок теперь передают legalEntity >>> */}
              <button onClick={() => onEdit(legalEntity)} className="p-2 text-slate-500 hover:text-indigo-600" title="Редактировать"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L16.732 3.732z" /></svg></button>
              <button onClick={() => onArchive(legalEntity)} className="p-2 text-slate-500 hover:text-yellow-600" title="Архивировать"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg></button>
              <button onClick={() => onDelete(legalEntity)} className="p-2 text-slate-500 hover:text-red-600" title="Удалить"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-800" title="Закрыть"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {/* <<< ИЗМЕНЕНО: Отображаем реквизиты напрямую, без цикла и вложенных компонентов >>> */}
            <h3 className="text-xl font-semibold text-slate-700 mb-3">Реквизиты</h3>
            <div className="p-4 border border-slate-200 rounded-lg bg-slate-50">
                <dl className="divide-y divide-slate-200">
                    <DetailRow label="ИНН / КПП" value={`${legalEntity.inn} / ${legalEntity.kpp || '-'}`} />
                    <DetailRow label="ОГРН / ОГРНИП" value={legalEntity.ogrn} />
                    <DetailRow label="Дата ОГРН" value={legalEntity.ogrnDate ? new Date(legalEntity.ogrnDate).toLocaleDateString('ru-RU') : '-'} />
                    <DetailRow label="Система налогообложения" value={legalEntity.taxSystem} />
                    <DetailRow label="Плательщик НДС" value={legalEntity.isNdsPayer ? `Да ${legalEntity.ndsValue ? `(${legalEntity.ndsValue})` : ''}`: 'Нет'} />
                    <DetailRow label="Сотрудники" value={legalEntity.hasEmployees ? 'Есть' : 'Нет'} />
                    <DetailRow label="Юридический адрес" value={legalEntity.legalAddress} />
                    <DetailRow label="Фактический адрес" value={legalEntity.actualAddress} />
                    <DetailRow label="Контактное лицо" value={legalEntity.contactPerson} />
                    <DetailRow label="Телефон / Email" value={`${legalEntity.phone} / ${legalEntity.email}`} />
                </dl>
            </div>
            {/* Здесь в будущем можно будет добавить вкладки для отображения задач, патентов, учетных данных и т.д. */}
        </div>
    </div>
  );
};