// types.ts

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

/**
 * LegalEntity представляет конкретное юрлицо или ИП.
 * Это основная сущность для представления клиента в приложении.
 */
export interface LegalEntity {
  id: string;
  legalForm: LegalForm;
  name: string; // Наименование юрлица (без ООО/ИП)
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
  notes?: string;
  credentials: Credential[];
  patents: Patent[];
  isArchived?: boolean; // Свойство для архивации
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