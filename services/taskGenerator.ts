// src/services/taskGenerator.ts

import { LegalEntity, Task, TaskStatus, TaskDueDateRule, RepeatFrequency, ReminderSetting } from '../types';
import { TASK_RULES, TaskRule } from './taskRules';

// ==========================================
// 1. БАЗОВЫЕ УТИЛИТЫ
// ==========================================

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
const getLastWorkingDayOfYear = (year: number): Date => { let date = new Date(year, 11, 31); while (isWeekend(date) || isHoliday(date)) { date.setDate(date.getDate() - 1); } return date; };
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
  if (specialRule === 'LAST_WORKING_DAY_OF_YEAR') { return getLastWorkingDayOfYear(year); } 
  let targetMonth: number; 
  switch (rule.periodicity) { 
    case RepeatFrequency.Monthly: targetMonth = periodIndex + (monthOffset || 0); break; 
    case RepeatFrequency.Quarterly: const quarterEndMonth = periodIndex * 3 + 2; targetMonth = quarterEndMonth + (quarterMonthOffset || 0); break; 
    case RepeatFrequency.Yearly: targetMonth = month !== undefined ? month : 0; break; 
    default: return new Date(); 
  } 
  return new Date(year, targetMonth, day); 
}

// ==========================================
// 2. ГЕНЕРАЦИЯ ЗАДАЧ
// ==========================================

export const generateTasksForLegalEntity = (legalEntity: LegalEntity): Task[] => {
    const allTasks: Task[] = [];
    const startDate = legalEntity.createdAt ? new Date(legalEntity.createdAt) : new Date();
    startDate.setHours(0, 0, 0, 0);
    const startYear = startDate.getFullYear();
    const yearsToGenerate = [startYear, startYear + 1, startYear + 2, startYear + 3];

    TASK_RULES.forEach(rule => {
        if (!rule.appliesTo(legalEntity)) { return; }
        yearsToGenerate.forEach(year => {
            const periods = rule.periodicity === RepeatFrequency.Monthly ? 12 : rule.periodicity === RepeatFrequency.Quarterly ? 4 : 1;
            for (let i = 0; i < periods; i++) {
                const periodIndex = i;
                if (rule.periodicity === RepeatFrequency.Monthly && rule.excludeMonths?.includes(periodIndex)) { continue; }
                if (rule.periodicity === RepeatFrequency.Quarterly && rule.id.includes('AVANS') && periodIndex === 3) { continue; }
                
                let periodEndDate: Date;
                if (rule.periodicity === RepeatFrequency.Monthly) { periodEndDate = new Date(year, i + 1, 0); } 
                else if (rule.periodicity === RepeatFrequency.Quarterly) { periodEndDate = new Date(year, i * 3 + 3, 0); } 
                else { periodEndDate = new Date(year, 11, 31); }
                
                // Пропускаем периоды, которые закончились до создания клиента
                if (periodEndDate < startDate) { continue; }

                const rawDueDate = calculateDueDate(year, periodIndex, rule);
                const dueDate = adjustDate(rawDueDate, rule.dueDateRule);
                
                // <<< ВАЖНОЕ ИСПРАВЛЕНИЕ: ДОПОЛНИТЕЛЬНАЯ ЗАЩИТА ОТ ПРОШЛЫХ ЗАДАЧ >>>
                // Если срок выполнения задачи раньше, чем дата создания клиента — не создаем её.
                // Это решает проблему появления задач за март при создании клиента в ноябре.
                if (dueDate < startDate) { continue; }

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
    
    // Генерация патентов
    if (legalEntity.patents && legalEntity.patents.length > 0) {
        legalEntity.patents.forEach(patent => {
            const originalStartDate = new Date(patent.startDate);
            const patentYearsToGenerate = yearsToGenerate.filter(y => y >= originalStartDate.getFullYear());
            patentYearsToGenerate.forEach(year => {
                if (year > originalStartDate.getFullYear() && !patent.autoRenew) return;
                const originalEndDate = new Date(patent.endDate);
                const yearOffset = year - originalStartDate.getFullYear();
                const currentYearStartDate = new Date(originalStartDate);
                currentYearStartDate.setFullYear(originalStartDate.getFullYear() + yearOffset);
                const currentYearEndDate = new Date(originalEndDate);
                currentYearEndDate.setFullYear(originalEndDate.getFullYear() + yearOffset);
                if (currentYearEndDate < startDate) { return; }
                
                const durationMonths = (currentYearEndDate.getFullYear() - currentYearStartDate.getFullYear()) * 12 + (currentYearEndDate.getMonth() - currentYearStartDate.getMonth()) + 1;
                const seriesId = `series-patent-${patent.id}-${year}`;
                const createPatentTask = (idSuffix: string, title: string, date: Date, rule: TaskDueDateRule, locked: boolean = true) => ({ 
                  id: `patent-${idSuffix}-${patent.id}-${year}`, 
                  legalEntityId: legalEntity.id, 
                  title: `${title} «${patent.name}» за ${year}г.`, 
                  dueDate: adjustDate(date, rule), 
                  status: TaskStatus.Upcoming, 
                  isAutomatic: true, 
                  dueDateRule: rule, 
                  repeat: RepeatFrequency.Yearly, 
                  reminder: ReminderSetting.OneWeek, 
                  seriesId, 
                  isPeriodLocked: locked 
                });
                
                // Для патентов также добавляем проверку: не создавать просроченные при создании
                const safePush = (task: Task) => {
                    if (task.dueDate >= startDate) {
                        allTasks.push(task);
                    }
                };
                
                if (durationMonths <= 6) { safePush(createPatentTask('payment-full', 'Оплата патента', currentYearEndDate, TaskDueDateRule.PreviousBusinessDay)); } 
                else if (durationMonths > 6 && durationMonths <= 12) {
                    const firstPaymentDate = new Date(currentYearStartDate);
                    firstPaymentDate.setDate(firstPaymentDate.getDate() + 90);
                    safePush(createPatentTask('payment-1-of-2', 'Оплата 1/3 патента', firstPaymentDate, TaskDueDateRule.NextBusinessDay));
                    safePush(createPatentTask('payment-2-of-2', 'Оплата 2/3 патента', currentYearEndDate, TaskDueDateRule.PreviousBusinessDay));
                }
                if (patent.autoRenew) {
                    const renewalDate = new Date(currentYearEndDate);
                    renewalDate.setMonth(renewalDate.getMonth() - 1);
                    if (renewalDate >= startDate) { 
                      safePush(createPatentTask('renewal', `Продление патента`, renewalDate, TaskDueDateRule.PreviousBusinessDay, false)); 
                    }
                }
            });
        });
    }
    return allTasks;
};

// ==========================================
// 3. ЛОГИКА БЛОКИРОВКИ
// ==========================================

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

const getPeriodStartDateForTask = (task: Task): Date | null => {
  if (!task.isAutomatic) return null;

  if (task.id.startsWith('patent-')) {
      const parts = task.id.split('-');
      const year = parseInt(parts[parts.length - 1], 10);
      return !isNaN(year) ? new Date(year, 0, 1) : null;
  }

  const regex = /auto-.*-([A-Za-z0-9_]+)-(\d{4})-(\d+)$/;
  const match = task.id.match(regex);

  if (!match) return null; 

  const ruleId = match[1];
  const year = parseInt(match[2], 10);
  const periodIndex = parseInt(match[3], 10);

  const rule = TASK_RULES.find(r => r.id === ruleId);
  if (!rule) return null;

  let periodStartDate: Date;

  switch (rule.periodicity) {
    case RepeatFrequency.Monthly:
      const offset = rule.dateConfig.monthOffset || 0;
      periodStartDate = new Date(year, periodIndex + offset, 1);
      
      if (rule.id.includes('_2') && offset === 0) { 
          periodStartDate.setDate(23); 
      }
      break;

    case RepeatFrequency.Quarterly:
      periodStartDate = new Date(year, (periodIndex + 1) * 3, 1);
      break;

    case RepeatFrequency.Yearly:
      if (rule.dateConfig.specialRule === 'LAST_WORKING_DAY_OF_YEAR' || rule.id.includes('DECEMBER')) {
          periodStartDate = new Date(year, 11, 23);
          break;
      }

      // <<< ИСПРАВЛЕНИЕ СТАТУСА ДЛЯ ГОДОВЫХ ЗАДАЧ >>>
      // Для годовых задач (сдача деклараций), ID задачи содержит год срока выполнения.
      // Соответственно, период начинается 1 января ЭТОГО ЖЕ года (а не следующего).
      // Пример: Декларация УСН 2024. Срок: Март 2025. ID: 2025. Начало периода: 1 Января 2025.
      periodStartDate = new Date(year, 0, 1);
      break;

    default:
      return null;
  }
  
  return periodStartDate;
};

export const isTaskLocked = (task: Task): boolean => {
  if (!task.isAutomatic || task.isPeriodLocked === false) return false;

  const periodStartDate = getPeriodStartDateForTask(task);
  
  if (!periodStartDate) return false;

  const now = new Date();
  now.setHours(0, 0, 0, 0);

  return now < periodStartDate;
};

export const updateTaskStatuses = (tasks: Task[]): Task[] => {
  return tasks.map(task => {
    if (task.status === TaskStatus.Completed) return task;

    const locked = isTaskLocked(task);
    
    if (locked) {
      return task.status === TaskStatus.Locked ? task : { ...task, status: TaskStatus.Locked };
    } 
    
    const statusByDate = getTaskStatus(task.dueDate);
    return task.status === statusByDate ? task : { ...task, status: statusByDate };
  });
};