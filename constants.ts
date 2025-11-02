
import { TaxSystem, TaskStatus } from './types';

export const TAX_SYSTEMS: TaxSystem[] = [
  TaxSystem.OSNO,
  TaxSystem.USN_DOHODY,
  TaxSystem.USN_DOHODY_RASHODY,
  TaxSystem.PATENT,
  TaxSystem.NPD,
];

export const TASK_STATUS_STYLES: Record<TaskStatus, { bg: string; text: string; border: string }> = {
  [TaskStatus.Overdue]: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' },
  [TaskStatus.DueSoon]: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
  [TaskStatus.InProgress]: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
  [TaskStatus.Completed]: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
};
