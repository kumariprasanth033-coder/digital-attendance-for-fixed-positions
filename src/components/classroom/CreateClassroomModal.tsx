import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, Building2, Armchair } from 'lucide-react';
import { Classroom } from '../../types';

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    class_name: string;
    rows: number;
    columns: number;
    layout_type?: 'single_matrix' | 'dual_matrix';
  }) => Promise<void>;
  editClassroom?: Classroom | null;
  onUpdate?: (id: string, updates: Partial<Classroom>) => Promise<void>;
}

export const CreateClassroomModal: React.FC<CreateClassroomModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  editClassroom,
  onUpdate
}) => {
  const isEditing = Boolean(editClassroom);

  const [className, setClassName] = useState(editClassroom?.class_name || '');
  const [rows, setRows] = useState(editClassroom?.rows || 4);
  const [columns, setColumns] = useState(editClassroom?.columns || 4);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editClassroom) {
      setClassName(editClassroom.class_name);
      setRows(editClassroom.rows || 4);
      setColumns(editClassroom.columns || 4);
    } else {
      setClassName('');
      setRows(4);
      setColumns(4);
    }
    setError(null);
  }, [editClassroom, isOpen]);

  if (!isOpen) return null;

  const totalPositions = rows * columns;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!className.trim()) {
      setError('Classroom name is required.');
      return;
    }

    if (rows < 1 || rows > 30) {
      setError('Rows must be between 1 and 30.');
      return;
    }

    if (columns < 1 || columns > 30) {
      setError('Columns must be between 1 and 30.');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        class_name: className.trim(),
        rows: Number(rows),
        columns: Number(columns),
        layout_type: 'single_matrix' as const,
      };

      if (isEditing && editClassroom && onUpdate) {
        await onUpdate(editClassroom.id, payload);
      } else {
        await onCreate(payload);
      }

      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Operation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {isEditing ? 'Edit Classroom' : 'Create New Classroom'}
              </h3>
              <p className="text-xs text-slate-500">Configure cinema seating structure</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Class Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Classroom / Course Section Name *
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder="e.g. AI & DS — Section A"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          {/* Rows and Columns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Rows *
              </label>
              <input
                type="number"
                required
                min={1}
                max={30}
                value={rows}
                onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Front to back rows</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Columns per Row *
              </label>
              <input
                type="number"
                required
                min={1}
                max={30}
                value={columns}
                onChange={e => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Seats per row</span>
            </div>
          </div>

          {/* Seating Capacity Calculation Card */}
          <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-indigo-900 font-semibold block">Total Fixed Positions</span>
                <span className="text-[11px] text-indigo-600">
                  {rows} Rows × {columns} Columns
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-indigo-700 font-mono">
                {totalPositions}
              </span>
              <span className="text-[10px] text-indigo-500 block">Seats</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
            <strong>Architecture Note:</strong> One unified cinema seating matrix is created. All students occupy fixed seat coordinates (e.g. R2-C3). Boys and Girls views are applied dynamically via filters without altering seat positions.
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {loading ? 'Saving...' : isEditing ? 'Update Classroom' : 'Create Classroom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
