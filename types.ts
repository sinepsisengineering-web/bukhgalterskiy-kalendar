export enum TaxSystem {
  OSNO = 'ОСНО',
  USN_DOHODY = 'УСН "Доходы"',
  USN_DOHODY_RASHODY = 'УСН "Доходы минус расходы"',
  PATENT = 'Патент',
  NPD = 'НПД',
}

export enum LegalForm {
  OOO = 'ООО',
  IP = 'ИП',
  AO = 'АО',
  PAO = 'ПАО',
  ZAO = 'ЗАО',
  SELF_EMPLOYED = 'Самозанятый'
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

export interface Client {
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
  taxSystems: TaxSystem[];
  hasEmployees: boolean;
  notes?: string;
  credentials: Credential[];
  patents?: Patent[];
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
  clientIds: string[];
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