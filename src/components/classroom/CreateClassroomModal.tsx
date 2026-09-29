import React, { useState } from 'react';
import { X, Plus, Sparkles, AlertCircle } from 'lucide-react';

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: { class_name: string; rows: number; columns: number }) => Promise<void>;
}

export const CreateClassroomModal: React.FC<CreateClassroomModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [className, setClassName] = useState('');
  const [rows, setRows] = useState(4);
  const [columns, setColumns] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const totalPositions = rows * columns;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!className.trim()) {
      setError('Classroom name is required.');
      return;
    }
    if (rows < 1 || rows > 15) {
      setError('Rows must be between 1 and 15.');
      return;
    }
    if (columns < 1 || columns > 15) {
      setError('Columns must be between 1 and 15.');
      return;
    }

    try {
      setLoading(true);
      await onCreate({
        class_name: className.trim(),
        rows: Number(rows),
        columns: Number(columns)
      });
      setClassName('');
      setRows(4);
      setColumns(4);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create classroom.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">Create New Classroom</h3>
            <p className="text-xs text-slate-500">Configure theater seating dimensions & positions</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Classroom / Course Section Name *
            </label>
            <input
              type="text"
              required
              value={className}
              onChange={e => setClassName(e.target.value)}
              placeholder="e.g. AI & DS - Section A"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Rows *
              </label>
              <input
                type="number"
                min={1}
                max={15}
                required
                value={rows}
                onChange={e => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Tiered depth (1–15)</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Columns *
              </label>
              <input
                type="number"
                min={1}
                max={15}
                required
                value={columns}
                onChange={e => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Seats per row (1–15)</span>
            </div>
          </div>

          {/* Dimension preview callout */}
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-indigo-950">
                  Fixed Matrix Capacity
                </div>
                <div className="text-xs text-indigo-700 font-mono">
                  {rows} rows × {columns} columns
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl font-extrabold text-indigo-900 font-mono tabular-nums">
                {totalPositions}
              </span>
              <span className="text-[11px] text-indigo-600 block font-medium">Fixed Seats</span>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              {loading ? 'Creating...' : 'Create Classroom'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
