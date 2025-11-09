// types.ts

export enum TaxSystem {
  OSNO = 'ОСНО',
  USN_DOHODY = 'УСН "Доходы"',
  USN_DOHODY_RASHODY = 'УСН "Доходы минус расходы"',
  // PATENТ теперь не основная система, а дополнение к ИП на УСН,
  // либо единственная, если ИП только на патенте. Логику выбора сделаем в форме.
  // Для простоты оставим его здесь, чтобы можно было выбрать "только Патент".
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

// =======================================
// === НОВАЯ СТРУКТУРА ДАННЫХ НАЧИНАЕТСЯ ЗДЕСЬ ===
// =======================================

/**
 * LegalEntity представляет конкретное юрлицо или ИП.
 * Это то, чем раньше был "Клиент".
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
  taxSystem: TaxSystem; // Теперь одна основная система
  isNdsPayer: boolean; // Новый флаг для НДС
  ndsValue?: string;   // Новое поле для суммы НДС
  hasEmployees: boolean;
  notes?: string;
  credentials: Credential[];
  patents: Patent[]; // Массив патентов остается здесь
}

/**
 * Client теперь является "папкой" или контейнером для одного или нескольких юрлиц.
 */
export interface Client {
  id: string;
  name: string; // Общее имя клиента (Иванов И.И. или ГК "Ромашка")
  legalEntities: LegalEntity[];
  isArchived?: boolean;
}

// =======================================
// === НОВАЯ СТРУКТУРА ДАННЫХ ЗАКАНЧИВАЕТСЯ ЗДЕСЬ ===
// =======================================


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
  // clientIds заменено на legalEntityId для точности
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