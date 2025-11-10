// services/taskGenerator.ts

import { LegalEntity, Task, TaxSystem, TaskStatus, TaskDueDateRule, RepeatFrequency, ReminderSetting, LegalForm } from '../types';
import { TASK_RULES, TaskRule } from './taskRules';

// --- Утилиты для дат ---
const RUSSIAN_HOLIDAYS = new Set<string>([
  '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08', '2024-02-23', '2024-03-08', '2024-05-01', '2024-05-09', '2024-06-12', '2024-11-04', '2024-12-31',
  '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08', '2025-02-23', '2025-03-08', '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04',
  '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-02-23', '2026-03-08', '2026-05-01', '2026-05-09', '2026-06-12', '2026-11-04',
]);
const toISODateString = (date: Date) => date.toISOString().split('T')[0];
const isWeekend = (date: Date) => { const day = date.getDay(); return day === 6 || day === 0; };
const isHoliday = (date: Date) => RUSSIAN_HOLIDAYS.has(toISODateString(date));
const getNextBusinessDay = (date: Date): Date => { let nextDay = new Date(date); while (isWeekend(nextDay) || isHoliday(nextDay)) { nextDay.setDate(nextDay.getDate() + 1); } return nextDay; };
const getPreviousBusinessDay = (date: Date): Date => { let prevDay = new Date(date); while (isWeekend(prevDay) || isHoliday(prevDay)) { prevDay.setDate(prevDay.getDate() - 1); } return prevDay; };
export const adjustDate = (date: Date, rule: TaskDueDateRule): Date => { switch (rule) { case TaskDueDateRule.NextBusinessDay: return getNextBusinessDay(date); case TaskDueDateRule.PreviousBusinessDay: return getPreviousBusinessDay(date); default: return date; } };

const getLastWorkingDayOfYear = (year: number): Date => {
  let date = new Date(year, 11, 31);
  while (isWeekend(date) || isHoliday(date)) {
    date.setDate(date.getDate() - 1);
  }
  return date;
};

// --- Новый движок генерации задач ---

const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
const MONTH_NAMES_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function formatTaskTitle(template: string, year: number, periodIndex: number, periodicity: RepeatFrequency): string {
    const month = (periodicity === RepeatFrequency.Monthly) ? periodIndex : new Date(year, periodIndex * 3).getMonth();
    const quarter = (periodicity === RepeatFrequency.Quarterly) ? periodIndex + 1 : 0;
    
    return template
        .replace('{year}', year.toString())
        .replace('{year-1}', (year - 1).toString())
        .replace('{quarter}', quarter.toString())
        .replace('{monthName}', MONTH_NAMES[month])
        .replace('{monthNameGenitive}', MONTH_NAMES_GENITIVE[month])
        .replace('{lastDayOfMonth}', new Date(year, month + 1, 0).getDate().toString());
}

function calculateDueDate(year: number, periodIndex: number, rule: TaskRule): Date {
    const { day, month, monthOffset, quarterMonthOffset, specialRule } = rule.dateConfig;

    if (specialRule === 'LAST_WORKING_DAY_OF_YEAR') {
        return getLastWorkingDayOfYear(year);
    }
    
    let targetMonth: number;
    
    switch (rule.periodicity) {
        case RepeatFrequency.Monthly:
            targetMonth = periodIndex + (monthOffset || 0);
            break;
        case RepeatFrequency.Quarterly:
            const quarterEndMonth = periodIndex * 3 + 2;
            targetMonth = quarterEndMonth + (quarterMonthOffset || 0);
            break;
        case RepeatFrequency.Yearly:
            targetMonth = month !== undefined ? month : 0;
            break;
        default:
            return new Date();
    }

    return new Date(year, targetMonth, day);
}

export const generateTasksForLegalEntity = (legalEntity: LegalEntity): Task[] => {
    const allTasks: Task[] = [];
    const currentYear = new Date().getFullYear();
    const yearsToGenerate = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

    TASK_RULES.forEach(rule => {
        if (!rule.appliesTo(legalEntity)) {
            return;
        }

        yearsToGenerate.forEach(year => {
            const periods = rule.periodicity === RepeatFrequency.Monthly ? 12 :
                            rule.periodicity === RepeatFrequency.Quarterly ? 4 : 1;

            for (let i = 0; i < periods; i++) {
                const periodIndex = i;
                
                if (rule.periodicity === RepeatFrequency.Monthly && rule.excludeMonths?.includes(periodIndex)) {
                    continue;
                }
                
                if (rule.periodicity === RepeatFrequency.Quarterly && rule.id.includes('AVANS') && periodIndex === 3) {
                    continue;
                }

                const rawDueDate = calculateDueDate(year, periodIndex, rule);
                
                if (rawDueDate.getFullYear() < currentYear && rule.periodicity !== RepeatFrequency.Yearly) {
                    continue;
                }

                const dueDate = adjustDate(rawDueDate, rule.dueDateRule);
                const title = formatTaskTitle(rule.titleTemplate, year, periodIndex, rule.periodicity);

                const task: Task = {
                    id: `auto-${legalEntity.id}-${rule.id}-${year}-${periodIndex}`,
                    legalEntityId: legalEntity.id,
                    title,
                    dueDate,
                    status: TaskStatus.Upcoming,
                    isAutomatic: true,
                    dueDateRule: rule.dueDateRule,
                    repeat: rule.periodicity,
                    reminder: ReminderSetting.OneWeek,
                    seriesId: `series-auto-${legalEntity.id}-${rule.id}`,
                    isPeriodLocked: true,
                };
                allTasks.push(task);
            }
        });
    });
    
    // --- Логика патентов (интегрирована) ---
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


// --- Вспомогательные функции для статусов и блокировок ---

export const getTaskStatus = (dueDate: Date): TaskStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return TaskStatus.Overdue;
  if (diffDays === 0) return TaskStatus.DueToday;
  if (diffDays <= 7) return TaskStatus.DueSoon;
  return TaskStatus.Upcoming;
};

export const getQuarter = (date: Date): number => {
  const month = date.getMonth();
  return Math.floor(month / 3) + 1;
};

export const isTaskLocked = (task: Task): boolean => {
  if (!task.repeat || task.repeat === RepeatFrequency.None) {
    return false;
  }
  if (task.isPeriodLocked === false) {
      return false;
  }
  const now = new Date();
  const taskDate = new Date(task.dueDate);
  const currentYear = now.getFullYear();
  const taskYear = taskDate.getFullYear();
  if (taskYear > currentYear) {
    return true;
  }
  if (taskYear < currentYear) {
    return false;
  }
  switch (task.repeat) {
    case RepeatFrequency.Monthly:
      return taskDate.getMonth() > now.getMonth();
    case RepeatFrequency.Quarterly:
      return getQuarter(taskDate) > getQuarter(now);
    case RepeatFrequency.Yearly:
      return false;
    case RepeatFrequency.Weekly:
    case RepeatFrequency.Daily:
      return false;
    default:
      return false;
  }
};

export const updateTaskStatuses = (tasks: Task[]): Task[] => {
  return tasks.map(task => {
    if (task.status === TaskStatus.Completed) {
      return task;
    }
    if (isTaskLocked(task)) {
      return task.status === TaskStatus.Locked ? task : { ...task, status: TaskStatus.Locked };
    }
    const statusByDate = getTaskStatus(task.dueDate);
    return task.status === statusByDate ? task : { ...task, status: statusByDate };
  });
};