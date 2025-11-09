// services/taskGenerator.ts

import { Client, LegalEntity, Task, TaxSystem, TaskStatus, TaskDueDateRule, RepeatFrequency, ReminderSetting } from '../types';

// --- Утилиты для дат (без изменений) ---
const RUSSIAN_HOLIDAYS = new Set<string>([
  '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08',
  '2024-02-23', '2024-03-08', '2024-05-01', '2024-05-09', '2024-06-12', '2024-11-04', '2024-12-31', '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08', '2025-02-23', '2025-03-08', '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04', '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-02-23', '2026-03-08', '2026-05-01', '2026-05-09', '2026-06-12', '2026-11-04',
]);
const toISODateString = (date: Date) => date.toISOString().split('T')[0];
const isWeekend = (date: Date) => { const day = date.getDay(); return day === 6 || day === 0; };
const isHoliday = (date: Date) => RUSSIAN_HOLIDAYS.has(toISODateString(date));
const getNextBusinessDay = (date: Date): Date => { let nextDay = new Date(date); while (isWeekend(nextDay) || isHoliday(nextDay)) { nextDay.setDate(nextDay.getDate() + 1); } return nextDay; };
const getPreviousBusinessDay = (date: Date): Date => { let prevDay = new Date(date); while (isWeekend(prevDay) || isHoliday(prevDay)) { prevDay.setDate(prevDay.getDate() - 1); } return prevDay; };
export const adjustDate = (date: Date, rule: TaskDueDateRule): Date => { switch (rule) { case TaskDueDateRule.NextBusinessDay: return getNextBusinessDay(date); case TaskDueDateRule.PreviousBusinessDay: return getPreviousBusinessDay(date); case TaskDueDateRule.NoTransfer: default: return date; } };
export const getTaskStatus = (dueDate: Date): TaskStatus => { const today = new Date(); today.setHours(0, 0, 0, 0); const due = new Date(dueDate); due.setHours(0, 0, 0, 0); const diffTime = due.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays < 0) return TaskStatus.Overdue; if (diffDays <= 7) return TaskStatus.DueSoon; return TaskStatus.InProgress; };
// --- Конец утилит ---

interface TaskTemplate {
    title: string;
    month: number;
    day: number;
    repeat: RepeatFrequency;
    rule: TaskDueDateRule;
    isPeriodLocked?: boolean;
}

// === ЯВНЫЕ ШАБЛОНЫ ЗАДАЧ ===
const USN_TASKS: TaskTemplate[] = [
    { title: 'Авансовый платеж по УСН за 1 квартал', month: 3, day: 28, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Авансовый платеж по УСН за полугодие', month: 6, day: 28, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Авансовый платеж по УСН за 9 месяцев', month: 9, day: 28, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Декларация по УСН за год', month: 3, day: 28, repeat: RepeatFrequency.Yearly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Страховые взносы за себя (фикс.)', month: 11, day: 31, repeat: RepeatFrequency.Yearly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
];

const OSNO_TASKS: TaskTemplate[] = [
    { title: 'Декларация по НДС за 4 кв. пред. года', month: 0, day: 25, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Декларация по НДС за 1 квартал', month: 3, day: 25, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Декларация по НДС за 2 квартал', month: 6, day: 25, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Декларация по НДС за 3 квартал', month: 9, day: 25, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Декларация по налогу на прибыль за год', month: 2, day: 28, repeat: RepeatFrequency.Yearly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Аванс по налогу на прибыль за 1 кв.', month: 3, day: 28, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Аванс по налогу на прибыль за полугодие', month: 6, day: 28, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
    { title: 'Аванс по налогу на прибыль за 9 мес.', month: 9, day: 28, repeat: RepeatFrequency.Quarterly, rule: TaskDueDateRule.NextBusinessDay, isPeriodLocked: true },
];

const EMPLOYEE_TASKS: TaskTemplate[] = Array.from({ length: 12 }, (_, i) => ([
    { title: `НДФЛ и взносы за ${i + 1} месяц`, month: i + 1, day: 28, repeat: RepeatFrequency.Monthly, rule: TaskDueDateRule.PreviousBusinessDay, isPeriodLocked: true },
    { title: `Персонифицированные сведения за ${i + 1} месяц`, month: i + 1, day: 25, repeat: RepeatFrequency.Monthly, rule: TaskDueDateRule.PreviousBusinessDay, isPeriodLocked: true }
])).flat();
// === КОНЕЦ ШАБЛОНОВ ===

const generateTasksFromTemplates = (legalEntity: LegalEntity, years: number[], templates: TaskTemplate[]): Task[] => {
    const tasks: Task[] = [];
    years.forEach(year => {
        templates.forEach(template => {
            const stableSeriesId = `series-auto-${legalEntity.id}-${template.title.replace(/\s+/g, '-')}`;
            const rawDueDate = new Date(year, template.month, template.day);
            const dueDate = adjustDate(rawDueDate, template.rule);

            tasks.push({
                id: `${legalEntity.id}-${template.title.replace(/\s+/g, '-')}-${year}-${template.month}-${template.day}`,
                legalEntityId: legalEntity.id,
                title: template.title,
                dueDate,
                status: getTaskStatus(dueDate),
                isAutomatic: true,
                dueDateRule: template.rule,
                repeat: template.repeat,
                reminder: ReminderSetting.OneWeek,
                seriesId: `${stableSeriesId}-${year}`,
                isPeriodLocked: template.isPeriodLocked ?? false,
            });
        });
    });
    return tasks;
};

const generateTasksForLegalEntity = (legalEntity: LegalEntity): Task[] => {
    let allTasks: Task[] = [];
    const currentYear = new Date().getFullYear();
    const yearsToGenerate = [currentYear, currentYear + 1, currentYear + 2];

    switch (legalEntity.taxSystem) {
        case TaxSystem.USN_DOHODY:
        case TaxSystem.USN_DOHODY_RASHODY:
            allTasks.push(...generateTasksFromTemplates(legalEntity, yearsToGenerate, USN_TASKS));
            break;
        case TaxSystem.OSNO:
            allTasks.push(...generateTasksFromTemplates(legalEntity, yearsToGenerate, OSNO_TASKS));
            break;
    }

    if (legalEntity.hasEmployees) {
        allTasks.push(...generateTasksFromTemplates(legalEntity, yearsToGenerate, EMPLOYEE_TASKS));
    }
    
    // --- Логика патентов (сохранена без изменений) ---
    if (legalEntity.patents && legalEntity.patents.length > 0) {
        const todayYear = new Date().getFullYear();
        legalEntity.patents.forEach(patent => {
            const originalStartDate = new Date(patent.startDate);
            const originalEndDate = new Date(patent.endDate);
            const originalStartYear = originalStartDate.getFullYear();
            const firstYearForRenewalCheck = Math.max(originalStartYear, todayYear);

            yearsToGenerate.forEach(year => {
                if (year < originalStartYear || (year > originalStartYear && !patent.autoRenew)) return;
                
                const yearOffset = year - originalStartYear;
                const currentYearStartDate = new Date(originalStartDate);
                currentYearStartDate.setFullYear(originalStartDate.getFullYear() + yearOffset);
                const currentYearEndDate = new Date(originalEndDate);
                currentYearEndDate.setFullYear(originalEndDate.getFullYear() + yearOffset);
                
                const durationMonths = (currentYearEndDate.getFullYear() - currentYearStartDate.getFullYear()) * 12 + (currentYearEndDate.getMonth() - currentYearStartDate.getMonth()) + 1;
                const seriesId = `series-patent-${patent.id}-${year}`;

                const createPatentTask = (idSuffix: string, title: string, date: Date, rule: TaskDueDateRule) => ({
                  id: `patent-${idSuffix}-${patent.id}-${year}`,
                  legalEntityId: legalEntity.id,
                  title: `${title} «${patent.name}» за ${year}г.`,
                  dueDate: adjustDate(date, rule),
                  status: getTaskStatus(adjustDate(date, rule)),
                  isAutomatic: true, dueDateRule: rule, repeat: RepeatFrequency.Yearly, reminder: ReminderSetting.OneWeek, seriesId, isPeriodLocked: true,
                });

                if (durationMonths <= 6) {
                    allTasks.push(createPatentTask('payment-full', 'Оплата патента', currentYearEndDate, TaskDueDateRule.PreviousBusinessDay));
                } else if (durationMonths > 6 && durationMonths <= 12) {
                    const firstPaymentDate = new Date(currentYearStartDate);
                    firstPaymentDate.setDate(firstPaymentDate.getDate() + 90);
                    allTasks.push(createPatentTask('payment-1-of-2', 'Оплата 1/3 патента', firstPaymentDate, TaskDueDateRule.NextBusinessDay));
                    allTasks.push(createPatentTask('payment-2-of-2', 'Оплата 2/3 патента', currentYearEndDate, TaskDueDateRule.PreviousBusinessDay));
                }

                if (patent.autoRenew && year === firstYearForRenewalCheck) {
                    const renewalDate = new Date(currentYearEndDate);
                    renewalDate.setMonth(renewalDate.getMonth() - 1);
                    allTasks.push({ ...createPatentTask('renewal', `Продление патента`, renewalDate, TaskDueDateRule.PreviousBusinessDay), title: `Продление патента «${patent.name}» на ${year + 1}г.`, isPeriodLocked: false });
                }
            });
        });
    }
    // --- Конец логики патентов ---

    return allTasks;
};

export const generateAllTasks = (clients: Client[]): Task[] => {
    let allTasks: Task[] = [];
    clients.forEach(client => {
        if (!client.isArchived && client.legalEntities) {
            client.legalEntities.forEach(legalEntity => {
                allTasks.push(...generateTasksForLegalEntity(legalEntity));
            });
        }
    });
    return allTasks;
};

export const updateTaskStatuses = (tasks: Task[]): Task[] => {
    return tasks.map(task => {
        if (task.status === TaskStatus.Completed) return task;
        return { ...task, status: getTaskStatus(task.dueDate) };
    });
};

/**
 * Определяет номер квартала для указанной даты (1-4).
 */
export const getQuarter = (date: Date): number => {
  const month = date.getMonth();
  return Math.floor(month / 3) + 1;
};

/**
 * Проверяет, заблокирована ли задача для выполнения в текущем периоде,
 * основываясь на ее периодичности (repeat).
 */
export const isTaskLocked = (task: Task): boolean => {
  // Если у задачи нет периодичности, она не блокируется.
  if (!task.repeat || task.repeat === RepeatFrequency.None) {
    return false;
  }
  
  // Игнорируем задачи, которые не должны блокироваться по своей природе (например, продление патента)
  if (task.isPeriodLocked === false) {
      return false;
  }

  const now = new Date();
  const taskDate = new Date(task.dueDate);

  const currentYear = now.getFullYear();
  const taskYear = taskDate.getFullYear();

  // Блокируем любую периодическую задачу из будущего года
  if (taskYear > currentYear) {
    return true;
  }
  // Если год уже прошел, задача точно не заблокирована
  if (taskYear < currentYear) {
    return false;
  }
  
  // Если мы дошли сюда, значит taskYear === currentYear.
  // Теперь проверяем конкретный период.

  switch (task.repeat) {
    case RepeatFrequency.Monthly:
      return taskDate.getMonth() > now.getMonth();
    
    case RepeatFrequency.Quarterly:
      return getQuarter(taskDate) > getQuarter(now);

    case RepeatFrequency.Yearly:
      // Если год текущий, годовая задача не может быть заблокирована
      return false;
      
    // Weekly и Daily задачи не блокируем по периоду
    case RepeatFrequency.Weekly:
    case RepeatFrequency.Daily:
      return false;

    default:
      return false;
  }
};