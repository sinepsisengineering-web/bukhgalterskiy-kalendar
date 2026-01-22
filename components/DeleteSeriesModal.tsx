import React from 'react';
import { Modal } from './Modal';
import { Task } from '../types';

interface DeleteSeriesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteSingle: () => void;
    onDeleteSeries: () => void;
    taskTitle: string;
}

export const DeleteSeriesModal: React.FC<DeleteSeriesModalProps> = ({
    isOpen,
    onClose,
    onDeleteSingle,
    onDeleteSeries,
    taskTitle
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Удаление повторяющейся задачи">
            <div className="space-y-4">
                <p className="text-slate-700">
                    Вы хотите удалить задачу <strong>«{taskTitle}»</strong>. Это повторяющаяся задача.
                </p>
                <p className="text-slate-600 text-sm">
                    Выберите действие:
                </p>

                <div className="flex flex-col gap-3 mt-4">
                    <button
                        onClick={onDeleteSingle}
                        className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-between group"
                    >
                        <div>
                            <p className="font-semibold text-slate-800">Удалить только эту задачу</p>
                            <p className="text-xs text-slate-500">Остальные задачи серии останутся без изменений</p>
                        </div>
                        <div className="w-4 h-4 rounded-full border border-slate-300 group-hover:border-indigo-500"></div>
                    </button>

                    <button
                        onClick={onDeleteSeries}
                        className="w-full text-left px-4 py-3 border border-slate-200 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors flex items-center justify-between group"
                    >
                        <div>
                            <p className="font-semibold text-red-700">Удалить весь цикл</p>
                            <p className="text-xs text-red-500">Все связанные задачи будут удалены</p>
                        </div>
                        <div className="w-4 h-4 rounded-full border border-slate-300 group-hover:border-red-500"></div>
                    </button>
                </div>

                <div className="flex justify-end pt-4 mt-2 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 transition-colors"
                    >
                        Отмена
                    </button>
                </div>
            </div>
        </Modal>
    );
};
