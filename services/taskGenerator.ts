import { Client, Task, TaxSystem, TaskStatus, TaskDueDateRule, RepeatFrequency, ReminderSetting } from '../types';

// Simplified list of Russian public holidays for 2024-2026 (YYYY-MM-DD)
const RUSSIAN_HOLIDAYS = new Set([
  // 2024
  '2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07', '2024-01-08',
  '2024-02-23', '2024-03-08', '2024-05-01', '2024-05-09', '2024-06-12', '2024-11-04', '2024-12-31',
  // 2025
  '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05', '2025-01-06', '2025-01-07', '2025-01-08',
  '2025-02-23', '2025-03-08', '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04',
  // 2026
  '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08',
  '2026-02-23', '2026-03-08', '2026-05-01', '2026-05-09', '2026-06-12', '2026-11-04',
]);

const toISODateString = (date: Date) => date.toISOString().split('T')[0];

const isWeekend = (date: Date) => {
  const day = date.getDay();
  return day === 6 || day === 0; // Saturday or Sunday
};

const isHoliday = (date: Date) => RUSSIAN_HOLIDAYS.has(toISODateString(date));

const getNextBusinessDay = (date: Date): Date => {
  let nextDay = new Date(date);
  while (isWeekend(nextDay) || isHoliday(nextDay)) {
    nextDay.setDate(nextDay.getDate() + 1);
  }
  return nextDay;
};

const getPreviousBusinessDay = (date: Date): Date => {
  let prevDay = new Date(date);
  while (isWeekend(prevDay) || isHoliday(prevDay)) {
    prevDay.setDate(prevDay.getDate() - 1);
  }
  return prevDay;
};

export const adjustDate = (date: Date, rule: TaskDueDateRule): Date => {
  switch (rule) {
    case TaskDueDateRule.NextBusinessDay:
      return getNextBusinessDay(date);
    case TaskDueDateRule.PreviousBusinessDay:
      return getPreviousBusinessDay(date);
    case TaskDueDateRule.NoTransfer:
    default:
      return date;
  }
};


export const getTaskStatus = (dueDate: Date): TaskStatus => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return TaskStatus.Overdue;
  if (diffDays <= 7) return TaskStatus.DueSoon;
  return TaskStatus.InProgress;
};

export const isTaskCompletable = (task: Task, currentDate: Date = new Date()): boolean => {
    if (!task.isPeriodLocked) {
        return true;
    }

    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);

    const getQuarter = (date: Date) => Math.floor(date.getMonth() / 3);
    
    const taskDueDate = new Date(task.dueDate);
    const taskYear = taskDueDate.getFullYear();
    const taskMonth = taskDueDate.getMonth();
    const title = task.title.toLowerCase();
    
    let periodStartDate: Date;

    if (title.includes('месяц')) {
        periodStartDate = new Date(taskYear, taskMonth, 1);
    } else if (title.includes('год')) {
        periodStartDate = new Date(taskYear, 0, 1);
    } else {
        const taskQuarter = getQuarter(taskDueDate);
        periodStartDate = new Date(taskYear, taskQuarter * 3, 1);
    }
    
    return today.getTime() >= periodStartDate.getTime();
};

const generateTasksForYears = (
  client: Client,
  years: number[],
  taskGenerator: (year: number) => { title: string; month: number; day: number }[],
  rule: TaskDueDateRule,
  isPeriodLocked: boolean = false
): Task[] => {
  const tasks: Task[] = [];
  years.forEach(year => {
    taskGenerator(year).forEach(taskInfo => {
      // Создаем стабильный seriesId на основе ID клиента и названия задачи
      const stableSeriesId = `series-auto-${client.id}-${taskInfo.title.replace(/\s+/g, '-')}-${year}`;

      const rawDueDate = new Date(year, taskInfo.month, taskInfo.day);
      const dueDate = adjustDate(rawDueDate, rule);
      tasks.push({
        id: `${client.id}-${taskInfo.title.replace(/\s/g, '-')}-${year}-${taskInfo.month}-${taskInfo.day}`,
        clientIds: [client.id],
        title: taskInfo.title,
        dueDate,
        status: getTaskStatus(dueDate),
        isAutomatic: true,
        dueDateRule: rule,
        repeat: RepeatFrequency.Yearly,
        reminder: ReminderSetting.OneWeek,
        seriesId: stableSeriesId, // Используем новый стабильный ID
        isPeriodLocked: isPeriodLocked,
      });
    });
  });
  return tasks;
};

export const generateTasksForClient = (client: Client): Task[] => {
  let allTasks: Task[] = [];
  const currentYear = new Date().getFullYear();
  const yearsToGenerate = [currentYear, currentYear + 1, currentYear + 2];

  client.taxSystems.forEach(taxSystem => {
      switch (taxSystem) {
        case TaxSystem.USN_DOHODY:
        case TaxSystem.USN_DOHODY_RASHODY:
          allTasks.push(...generateTasksForYears(client, yearsToGenerate, (year) => [
            { title: 'Авансовый платеж по УСН за 1 квартал', month: 3, day: 28 },
            { title: 'Авансовый платеж по УСН за полугодие', month: 6, day: 28 },
            { title: 'Авансовый платеж по УСН за 9 месяцев', month: 9, day: 28 },
            { title: 'Декларация по УСН за год', month: 3, day: 28 },
            { title: 'Страховые взносы за себя (фикс.)', month: 11, day: 31 }
          ], TaskDueDateRule.NextBusinessDay, true));
          break;
        case TaxSystem.OSNO:
          allTasks.push(...generateTasksForYears(client, yearsToGenerate, (year) => [
            { title: 'Декларация по НДС за 4 кв. пред. года', month: 0, day: 25 },
            { title: 'Декларация по НДС за 1 квартал', month: 3, day: 25 },
            { title: 'Декларация по НДС за 2 квартал', month: 6, day: 25 },
            { title: 'Декларация по НДС за 3 квартал', month: 9, day: 25 },
            { title: 'Декларация по налогу на прибыль за год', month: 2, day: 28 },
            { title: 'Аванс по налогу на прибыль за 1 кв.', month: 3, day: 28 },
            { title: 'Аванс по налогу на прибыль за полугодие', month: 6, day: 28 },
            { title: 'Аванс по налогу на прибыль за 9 мес.', month: 9, day: 28 },
          ], TaskDueDateRule.NextBusinessDay, true));
          break;
        case TaxSystem.PATENT:
          break;
      }
  });

  if (client.taxSystems.includes(TaxSystem.PATENT) && client.patents && client.patents.length > 0) {
      const todayYear = new Date().getFullYear();
      client.patents.forEach(patent => {
          const originalStartDate = new Date(patent.startDate);
          const originalEndDate = new Date(patent.endDate);
          const originalStartYear = originalStartDate.getFullYear();
          
          const firstYearForRenewalCheck = Math.max(originalStartYear, todayYear);

          yearsToGenerate.forEach(year => {
              if (year < originalStartYear) return;
              
              if (year > originalStartYear && !patent.autoRenew) return;

              const yearOffset = year - originalStartYear;
              
              const currentYearStartDate = new Date(originalStartDate);
              currentYearStartDate.setFullYear(originalStartDate.getFullYear() + yearOffset);
              
              const currentYearEndDate = new Date(originalEndDate);
              currentYearEndDate.setFullYear(originalEndDate.getFullYear() + yearOffset);

              const durationMonths = (currentYearEndDate.getFullYear() - currentYearStartDate.getFullYear()) * 12 + (currentYearEndDate.getMonth() - currentYearStartDate.getMonth()) + 1;

              const seriesId = `series-patent-${patent.id}-${year}`;

              if (durationMonths <= 6) {
                  const dueDate = new Date(currentYearEndDate);
                  const adjustedDueDate = adjustDate(dueDate, TaskDueDateRule.PreviousBusinessDay);
                  allTasks.push({
                      id: `patent-payment-full-${patent.id}-${year}`,
                      clientIds: [client.id],
                      title: `Оплата патента «${patent.name}» за ${year}г.`,
                      dueDate: adjustedDueDate,
                      status: getTaskStatus(adjustedDueDate),
                      isAutomatic: true,
                      dueDateRule: TaskDueDateRule.PreviousBusinessDay,
                      repeat: RepeatFrequency.None,
                      reminder: ReminderSetting.OneWeek,
                      seriesId,
                      isPeriodLocked: true,
                  });
              } else if (durationMonths > 6 && durationMonths <= 12) {
                  const firstPaymentDate = new Date(currentYearStartDate);
                  firstPaymentDate.setDate(firstPaymentDate.getDate() + 90);
                  const adjustedFirstDate = adjustDate(firstPaymentDate, TaskDueDateRule.NextBusinessDay);
                  allTasks.push({
                      id: `patent-payment-1-of-2-${patent.id}-${year}`,
                      clientIds: [client.id],
                      title: `Оплата 1/3 патента «${patent.name}» за ${year}г.`,
                      dueDate: adjustedFirstDate,
                      status: getTaskStatus(adjustedFirstDate),
                      isAutomatic: true,
                      dueDateRule: TaskDueDateRule.NextBusinessDay,
                      repeat: RepeatFrequency.None,
                      reminder: ReminderSetting.OneWeek,
                      seriesId,
                      isPeriodLocked: true,
                  });

                  const secondPaymentDate = new Date(currentYearEndDate);
                  const adjustedSecondDate = adjustDate(secondPaymentDate, TaskDueDateRule.PreviousBusinessDay);
                   allTasks.push({
                      id: `patent-payment-2-of-2-${patent.id}-${year}`,
                      clientIds: [client.id],
                      title: `Оплата 2/3 патента «${patent.name}» за ${year}г.`,
                      dueDate: adjustedSecondDate,
                      status: getTaskStatus(adjustedSecondDate),
                      isAutomatic: true,
                      dueDateRule: TaskDueDateRule.PreviousBusinessDay,
                      repeat: RepeatFrequency.None,
                      reminder: ReminderSetting.OneWeek,
                      seriesId,
                      isPeriodLocked: true,
                  });
              }

              if (patent.autoRenew && year === firstYearForRenewalCheck) {
                  const renewalDate = new Date(currentYearEndDate);
                  renewalDate.setMonth(renewalDate.getMonth() - 1);
                  const adjustedRenewalDate = adjustDate(renewalDate, TaskDueDateRule.PreviousBusinessDay);
                  allTasks.push({
                      id: `patent-renewal-${patent.id}-${year}`,
                      clientIds: [client.id],
                      title: `Продление патента «${patent.name}» на ${year + 1}г.`,
                      dueDate: adjustedRenewalDate,
                      status: getTaskStatus(adjustedRenewalDate),
                      isAutomatic: true,
                      dueDateRule: TaskDueDateRule.PreviousBusinessDay,
                      repeat: RepeatFrequency.None,
                      reminder: ReminderSetting.OneWeek,
                      seriesId,
                      isPeriodLocked: false,
                  });
              }
          });
      });
  }


  if (client.hasEmployees) {
    allTasks.push(...generateTasksForYears(client, yearsToGenerate, (year) => {
        const employeeTasks: { title: string; month: number; day: number }[] = [];
        for (let i = 0; i < 12; i++) {
            employeeTasks.push({ title: `НДФЛ и взносы за месяц ${i + 1}`, month: i + 1, day: 28 });
            employeeTasks.push({ title: `Персонифицированные сведения за месяц ${i+1}`, month: i + 1, day: 25 });
        }
        return employeeTasks;
    }, TaskDueDateRule.PreviousBusinessDay, true));
  }

  return allTasks;
};

export const updateTaskStatuses = (tasks: Task[]): Task[] => {
  return tasks.map(task => {
    if (task.status === TaskStatus.Completed) {
      return task;
    }
    return { ...task, status: getTaskStatus(task.dueDate) };
  });
};