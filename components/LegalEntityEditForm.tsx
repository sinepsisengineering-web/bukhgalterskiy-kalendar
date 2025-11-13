// components/LegalEntityEditForm.tsx

import React, { useState } from 'react';
import { LegalEntity, Credential, TaxSystem, LegalForm, Patent } from '../types';

const toInputDateString = (date?: Date | string): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
};
const getMaxDateString = (): string => `${new Date().getFullYear() + 10}-12-31`;

interface LegalEntityEditFormProps {
  legalEntity: LegalEntity;
  onSave: (updatedLegalEntity: LegalEntity) => void;
  onCancel: () => void;
}

export const LegalEntityEditForm: React.FC<LegalEntityEditFormProps> = ({ legalEntity, onSave, onCancel }) => {
  const [formData, setFormData] = useState<LegalEntity>(legalEntity);

  const availableTaxSystems = formData.legalForm === LegalForm.IP
    ? [TaxSystem.OSNO, TaxSystem.USN_DOHODY, TaxSystem.USN_DOHODY_RASHODY, TaxSystem.PATENT]
    : [TaxSystem.OSNO, TaxSystem.USN_DOHODY, TaxSystem.USN_DOHODY_RASHODY];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let newFormData = { ...formData, [name]: value };
    if (name === "legalForm") {
        if (value !== LegalForm.IP) newFormData.patents = [];
        const currentTaxSystemIsValid = value === LegalForm.IP ? true : newFormData.taxSystem !== TaxSystem.PATENT;
        if (!currentTaxSystemIsValid) newFormData.taxSystem = TaxSystem.OSNO; 
    }
    if (name === "taxSystem") {
        if (value === TaxSystem.OSNO) newFormData.isNdsPayer = true;
        else if (formData.taxSystem === TaxSystem.OSNO) {
            newFormData.isNdsPayer = false;
            newFormData.ndsValue = '';
        }
    }
    setFormData(newFormData);
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    const updatedEntity = { ...formData, [name]: checked };
    if (name === 'isNdsPayer' && !checked) updatedEntity.ndsValue = '';
    setFormData(updatedEntity);
  };

  const handlePatentChange = (index: number, field: keyof Omit<Patent, 'id'>, value: string | boolean) => {
    const newPatents = [...(formData.patents || [])];
    const patentToUpdate = { ...newPatents[index] };
    (patentToUpdate as any)[field] = value;
    newPatents[index] = patentToUpdate;
    setFormData(prev => ({ ...prev, patents: newPatents }));
  };
  
  const addPatent = () => {
    const newPatent: Patent = { id: `patent-${Date.now()}`, name: '', startDate: '', endDate: '', autoRenew: false };
    setFormData(prev => ({ ...prev, patents: [...(prev.patents || []), newPatent] }));
  };
  
  const removePatent = (index: number) => {
    const newPatents = (formData.patents || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, patents: newPatents }));
  };
  
  const handleCredentialChange = (index: number, field: keyof Credential, value: string) => {
    const newCredentials = [...formData.credentials];
    newCredentials[index] = { ...newCredentials[index], [field]: value };
    setFormData(prev => ({ ...prev, credentials: newCredentials }));
  };
  
  const addCredential = () => {
    const newCredential: Credential = { id: `cred-${Date.now()}`, service: '', login: '', password: '' };
    setFormData(prev => ({ ...prev, credentials: [...prev.credentials, newCredential] }));
  };
  
  const removeCredential = (index: number) => {
    const newCredentials = formData.credentials.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, credentials: newCredentials }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const showNdsCheckbox = formData.taxSystem !== TaxSystem.OSNO;
  const showNdsValueInput = formData.isNdsPayer;
  const showPatentsBlock = formData.legalForm === LegalForm.IP;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
             <label className="block text-sm font-medium text-slate-700">Тип</label>
             <select name="legalForm" value={formData.legalForm} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
                {Object.values(LegalForm).map(form => <option key={form} value={form}>{form}</option>)}
             </select>
          </div>
          <div className="md:col-span-2">
             <label className="block text-sm font-medium text-slate-700">Наименование / ФИО (без типа)</label>
             <input type="text" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
          </div>
       </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div><label className="block text-sm font-medium text-slate-700">ИНН</label><input name="inn" value={formData.inn} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div><label className="block text-sm font-medium text-slate-700">КПП</label><input name="kpp" value={formData.kpp || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div><label className="block text-sm font-medium text-slate-700">ОГРН / ОГРНИП</label><input name="ogrn" value={formData.ogrn} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div><label className="block text-sm font-medium text-slate-700">Дата ОГРН</label><input type="date" name="ogrnDate" value={toInputDateString(formData.ogrnDate)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Юридический адрес</label><input name="legalAddress" value={formData.legalAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Фактический адрес</label><input name="actualAddress" value={formData.actualAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div><label className="block text-sm font-medium text-slate-700">Контактное лицо</label><input name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div><label className="block text-sm font-medium text-slate-700">Телефон</label><input name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700">Email</label><input name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        </div>
        <div>
            <label className="block text-sm font-medium text-slate-700">Основная система налогообложения</label>
            <select name="taxSystem" value={formData.taxSystem} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
                {availableTaxSystems.map(system => <option key={system} value={system}>{system}</option>)}
            </select>
        </div>
        <div className="flex items-center gap-6">
            {showNdsCheckbox && <div className="flex items-center"><input id={`isNdsPayer-${formData.id}`} name="isNdsPayer" type="checkbox" checked={formData.isNdsPayer} onChange={handleCheckboxChange} className="h-4 w-4 rounded"/><label htmlFor={`isNdsPayer-${formData.id}`} className="ml-2 block text-sm">Плательщик НДС</label></div>}
            {showNdsValueInput && <div><label htmlFor={`ndsValue-${formData.id}`} className="text-sm">Ставка НДС (если требуется)</label><input id={`ndsValue-${formData.id}`} name="ndsValue" type="text" value={formData.ndsValue || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border rounded-md"/></div>}
        </div>
        <div className="flex items-center">
            <input id={`hasEmployees-${formData.id}`} name="hasEmployees" type="checkbox" checked={formData.hasEmployees} onChange={handleCheckboxChange} className="h-4 w-4 rounded"/>
            <label htmlFor={`hasEmployees-${formData.id}`} className="ml-2 block text-sm">Есть наемные сотрудники</label>
        </div>

        <div className="pt-4 flex justify-end gap-4">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
        </div>
    </form>
  );
};