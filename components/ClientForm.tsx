import React, { useState, useEffect } from 'react';
import { Client, Credential, TaxSystem, LegalForm, Patent } from '../types';
import { TAX_SYSTEMS } from '../constants';

interface ClientFormProps {
  client: Client | null;
  onSave: (client: Client) => void;
  onCancel: () => void;
}

const toInputDateString = (date?: Date | string): string => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const ClientForm: React.FC<ClientFormProps> = ({ client, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<Client, 'id'>>({
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
    taxSystems: [TaxSystem.USN_DOHODY],
    hasEmployees: false,
    notes: '',
    credentials: [],
    patents: [],
  });

  useEffect(() => {
    if (client) {
      setFormData({ ...client, patents: client.patents || [] });
    }
  }, [client]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'ogrnDate') {
        setFormData(prev => ({ ...prev, ogrnDate: value ? new Date(value) : undefined }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: checked }));
  };
  
  const handleTaxSystemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    const system = value as TaxSystem;
    setFormData(prev => {
      const currentSystems = prev.taxSystems || [];
      if (checked) {
        return { ...prev, taxSystems: [...new Set([...currentSystems, system])] };
      } else {
        return { ...prev, taxSystems: currentSystems.filter(s => s !== system) };
      }
    });
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

  const handlePatentChange = (index: number, field: keyof Omit<Patent, 'id'>, value: string | boolean) => {
    const newPatents = [...(formData.patents || [])];
    newPatents[index] = { ...newPatents[index], [field]: value };
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     if (formData.taxSystems.length === 0) {
        alert('Пожалуйста, выберите хотя бы одну систему налогообложения.');
        return;
    }
    const processedFormData = {
        ...formData,
        patents: formData.patents?.map(p => ({
            ...p,
            startDate: p.startDate ? new Date(p.startDate as string) : new Date(),
            endDate: p.endDate ? new Date(p.endDate as string) : new Date(),
        }))
    };
    onSave({ id: client?.id || `client-${Date.now()}`, ...processedFormData });
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
             <label htmlFor="legalForm" className="block text-sm font-medium text-slate-700">Тип</label>
             <select id="legalForm" name="legalForm" value={formData.legalForm} onChange={handleChange} className="mt-1 block w-full pl-3 pr-10 py-2 bg-white border border-slate-300 rounded-md text-slate-900">
                {Object.values(LegalForm).map(form => <option key={form} value={form}>{form}</option>)}
             </select>
          </div>
          <div className="md:col-span-2">
             <label htmlFor="name" className="block text-sm font-medium text-slate-700">Наименование / ФИО (без типа)</label>
             <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
          </div>
       </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div><label htmlFor="inn" className="block text-sm font-medium text-slate-700">ИНН</label><input id="inn" name="inn" value={formData.inn} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div><label htmlFor="kpp" className="block text-sm font-medium text-slate-700">КПП</label><input id="kpp" name="kpp" value={formData.kpp || ''} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div><label htmlFor="ogrn" className="block text-sm font-medium text-slate-700">ОГРН / ОГРНИП</label><input id="ogrn" name="ogrn" value={formData.ogrn} onChange={handleChange} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div><label htmlFor="ogrnDate" className="block text-sm font-medium text-slate-700">Дата ОГРН</label><input type="date" id="ogrnDate" name="ogrnDate" value={toInputDateString(formData.ogrnDate)} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div className="md:col-span-2"><label htmlFor="legalAddress" className="block text-sm font-medium text-slate-700">Юридический адрес</label><input id="legalAddress" name="legalAddress" value={formData.legalAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div className="md:col-span-2"><label htmlFor="actualAddress" className="block text-sm font-medium text-slate-700">Фактический адрес</label><input id="actualAddress" name="actualAddress" value={formData.actualAddress} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div><label htmlFor="contactPerson" className="block text-sm font-medium text-slate-700">Контактное лицо</label><input id="contactPerson" name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div><label htmlFor="phone" className="block text-sm font-medium text-slate-700">Телефон</label><input id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
        <div className="md:col-span-2"><label htmlFor="email" className="block text-sm font-medium text-slate-700">Email</label><input id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/></div>
      </div>
       
      <div>
        <label className="block text-sm font-medium text-slate-700">Системы налогообложения</label>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {TAX_SYSTEMS.map(system => (
                <div key={system} className="flex items-center">
                    <input
                        id={`tax-system-${system}`}
                        name="taxSystems"
                        type="checkbox"
                        value={system}
                        checked={formData.taxSystems.includes(system)}
                        onChange={handleTaxSystemChange}
                        className="h-4 w-4 bg-white text-slate-900 focus:ring-slate-500 border-slate-400 rounded"
                    />
                    <label htmlFor={`tax-system-${system}`} className="ml-3 block text-sm text-slate-900">{system}</label>
                </div>
            ))}
        </div>
      </div>

      <div className="flex items-center">
        <input id="hasEmployees" name="hasEmployees" type="checkbox" checked={formData.hasEmployees} onChange={handleCheckboxChange} className="h-4 w-4 bg-white text-slate-900 focus:ring-slate-500 border-slate-400 rounded"/>
        <label htmlFor="hasEmployees" className="ml-2 block text-sm text-slate-900">Есть наемные сотрудники</label>
      </div>

       <div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Патенты</h3>
        <div className="space-y-3">
          {(formData.patents || []).map((patent, index) => (
            <div key={patent.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-slate-50 rounded-md">
              <div className="col-span-12 sm:col-span-4">
                <label className="text-xs text-slate-500">Название</label>
                <input type="text" placeholder="Название патента" value={patent.name} onChange={(e) => handlePatentChange(index, 'name', e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
              </div>
              <div className="col-span-6 sm:col-span-3">
                <label className="text-xs text-slate-500">Дата начала</label>
                <input type="date" value={toInputDateString(patent.startDate)} onChange={(e) => handlePatentChange(index, 'startDate', e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
              </div>
              <div className="col-span-6 sm:col-span-3">
                 <label className="text-xs text-slate-500">Дата окончания</label>
                <input type="date" value={toInputDateString(patent.endDate)} onChange={(e) => handlePatentChange(index, 'endDate', e.target.value)} required className="w-full mt-1 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
              </div>
              <div className="col-span-10 sm:col-span-1 flex items-center justify-center pt-5">
                <input type="checkbox" id={`autoRenew-${index}`} checked={patent.autoRenew} onChange={(e) => handlePatentChange(index, 'autoRenew', e.target.checked)} title="Автопродление" className="h-5 w-5 bg-white text-slate-900 focus:ring-slate-500 border-slate-400 rounded"/>
              </div>
              <div className="col-span-2 sm:col-span-1 flex items-center justify-center pt-5">
                <button type="button" onClick={() => removePatent(index)} className="p-2 text-red-500 hover:text-red-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        { formData.taxSystems.includes(TaxSystem.PATENT) && (
            <button type="button" onClick={addPatent} className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
              + Добавить патент
            </button>
        )}
      </div>

       <div>
         <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Заметки</label>
         <textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={4} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm text-slate-900"></textarea>
       </div>

      <div>
        <h3 className="text-lg font-medium text-slate-900 mb-2">Логины и пароли</h3>
        <div className="space-y-2">
          {formData.credentials.map((cred, index) => (
            <div key={cred.id} className="grid grid-cols-10 gap-2 items-center">
              <input type="text" placeholder="Сервис (ФНС, Госуслуги...)" value={cred.service} onChange={(e) => handleCredentialChange(index, 'service', e.target.value)} className="col-span-3 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
              <input type="text" placeholder="Логин" value={cred.login} onChange={(e) => handleCredentialChange(index, 'login', e.target.value)} className="col-span-3 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
              <input type="password" placeholder="Пароль" value={cred.password || ''} onChange={(e) => handleCredentialChange(index, 'password', e.target.value)} className="col-span-3 px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-900"/>
              <button type="button" onClick={() => removeCredential(index)} className="p-2 text-red-500 hover:text-red-700 justify-self-center">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
              </button>
            </div>
          ))}
        </div>
         <button type="button" onClick={addCredential} className="mt-4 text-sm font-semibold text-indigo-600 hover:text-indigo-800">
          + Добавить доступ
        </button>
      </div>

      <div className="pt-4 flex justify-end gap-4">
          <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50">Отмена</button>
          <button type="submit" className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700">Сохранить</button>
      </div>
    </form>
  );
};