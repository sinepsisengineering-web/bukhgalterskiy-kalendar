// src/types.ts

export enum TaxSystem {
  OSNO = 'ОСНО',
  USN_DOHODY = 'УСН "Доходы"',
  USN_DOHODY_RASHODY = 'УСН "Доходы минус расходы"',
  PATENT = 'Патент', 
}

export enum LegalForm {
  OOO = 'ООО',
  IP = 'ИП',
  AO = 'АО',
  PAO = 'ПАО',
  ZAO = 'ЗАО',
}

export interface Credential {
  id: string;
  service: string;
  login: string;
  password?: string;
}

export interface Patent {
  id: string;
  name: string;
  startDate: Date | string;
  endDate: Date | string;
  autoRenew: boolean;
}

// <<< ДОБАВЛЕНО: Новый интерфейс для отдельной заметки >>>
export interface Note {
  id: string;
  text: string;
  createdAt: Date;
}

/**
 * LegalEntity представляет конкретное юрлицо или ИП.
 * Это основная сущность для представления клиента в приложении.
 */
export interface LegalEntity {
  id: string;
  legalForm: LegalForm;
  name: string;
  inn: string;
  kpp?: string;
  ogrn: string;
  ogrnDate?: Date;
  legalAddress: string;
  actualAddress: string;
  contactPerson: string;
  phone: string;
  email: string;
  taxSystem: TaxSystem;
  isNdsPayer: boolean;
  ndsValue?: string;
  hasEmployees: boolean;
  // <<< ИЗМЕНЕНО: Тип поля notes изменен со строки на массив объектов Note >>>
  notes?: Note[]; 
  credentials: Credential[];
  patents: Patent[];
  isArchived?: boolean;
}

export enum TaskStatus {
  DueSoon = 'Скоро срок',
  InProgress = 'В работе',
  Overdue = 'Просрочена',
  Completed = 'Выполнена',
}

export enum TaskDueDateRule {
  NextBusinessDay = 'next',
  PreviousBusinessDay = 'previous',
  NoTransfer = 'none',
}

export enum RepeatFrequency {
  None = 'none',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  Yearly = 'yearly',
}

export enum ReminderSetting {
    None = 'none',
    OneHour = '1h',
    OneDay = '1d',
    OneWeek = '1w',
}

export interface Task {
  id: string;
  legalEntityId: string;
  title: string;
  description?: string;
  dueDate: Date;
  dueTime?: string;
  dueDateRule: TaskDueDateRule;
  repeat: RepeatFrequency;
  reminder: ReminderSetting;
  status: TaskStatus;
  isAutomatic: boolean;
  seriesId?: string; 
  isPeriodLocked?: boolean;
}