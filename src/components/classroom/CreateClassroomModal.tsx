import React, { useState } from 'react';
import { X, Plus, Sparkles, AlertCircle, LayoutGrid, Users } from 'lucide-react';
import { Classroom } from '../../types';

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    class_name: string;
    rows: number;
    columns: number;
    layout_type?: 'dual_matrix' | 'single_matrix';
    boys_rows?: number;
    boys_columns?: number;
    girls_rows?: number;
    girls_columns?: number;
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
  const [layoutMode, setLayoutMode] = useState<'dual_matrix' | 'single_matrix'>(
    editClassroom?.layout_type || 'dual_matrix'
  );

  // Dual matrix states
  const [boysRows, setBoysRows] = useState(editClassroom?.boys_rows || 4);
  const [boysCols, setBoysCols] = useState(editClassroom?.boys_columns || 2);
  const [girlsRows, setGirlsRows] = useState(editClassroom?.girls_rows || 4);
  const [girlsCols, setGirlsCols] = useState(editClassroom?.girls_columns || 2);

  // Single matrix fallback states
  const [singleRows, setSingleRows] = useState(editClassroom?.rows || 4);
  const [singleCols, setSingleCols] = useState(editClassroom?.columns || 4);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync if editing classroom changes
  React.useEffect(() => {
    if (editClassroom) {
      setClassName(editClassroom.class_name);
      setLayoutMode(editClassroom.layout_type || 'dual_matrix');
      setBoysRows(editClassroom.boys_rows || Math.max(1, editClassroom.rows));
      setBoysCols(editClassroom.boys_columns || Math.max(1, Math.floor(editClassroom.columns / 2)));
      setGirlsRows(editClassroom.girls_rows || Math.max(1, editClassroom.rows));
      setGirlsCols(editClassroom.girls_columns || Math.max(1, Math.ceil(editClassroom.columns / 2)));
      setSingleRows(editClassroom.rows || 4);
      setSingleCols(editClassroom.columns || 4);
    } else {
      setClassName('');
      setLayoutMode('dual_matrix');
      setBoysRows(4);
      setBoysCols(2);
      setGirlsRows(4);
      setGirlsCols(2);
      setSingleRows(4);
      setSingleCols(4);
    }
  }, [editClassroom]);

  if (!isOpen) return null;

  const boysCapacity = boysRows * boysCols;
  const girlsCapacity = girlsRows * girlsCols;
  const totalPositions = layoutMode === 'dual_matrix'
    ? boysCapacity + girlsCapacity
    : singleRows * singleCols;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!className.trim()) {
      setError('Classroom name is required.');
      return;
    }

    try {
      setLoading(true);

      const effectiveRows = layoutMode === 'dual_matrix' ? Math.max(boysRows, girlsRows) : Number(singleRows);
      const effectiveCols = layoutMode === 'dual_matrix' ? (Number(boysCols) + Number(girlsCols)) : Number(singleCols);

      const payload = {
        class_name: className.trim(),
        rows: effectiveRows,
        columns: effectiveCols,
        layout_type: layoutMode,
        boys_rows: layoutMode === 'dual_matrix' ? Number(boysRows) : undefined,
        boys_columns: layoutMode === 'dual_matrix' ? Number(boysCols) : undefined,
        girls_rows: layoutMode === 'dual_matrix' ? Number(girlsRows) : undefined,
        girls_columns: layoutMode === 'dual_matrix' ? Number(girlsCols) : undefined,
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
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-display">
              {isEditing ? 'Edit Classroom Configuration' : 'Create New Classroom'}
            </h3>
            <p className="text-xs text-slate-500">Configure separate Boys & Girls seating matrices</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
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
              placeholder="e.g. AI & DS - Section A"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          {/* Matrix Layout Architecture Toggle */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Seating Architecture
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setLayoutMode('dual_matrix')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  layoutMode === 'dual_matrix'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Boys & Girls Separate Matrices
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('single_matrix')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  layoutMode === 'single_matrix'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5 text-slate-600" />
                Single Unified Matrix
              </button>
            </div>
          </div>

          {/* Separate Boys and Girls Matrix Setup */}
          {layoutMode === 'dual_matrix' ? (
            <div className="space-y-4">
              {/* Boys Matrix Box */}
              <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                      B
                    </span>
                    <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                      Boys Matrix Wing
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                    {boysCapacity} Seats
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Boys Rows
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={boysRows}
                      onChange={e => setBoysRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Depth (1–12)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Boys Columns
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={boysCols}
                      onChange={e => setBoysCols(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Seats/row (1–10)</span>
                  </div>
                </div>
              </div>

              {/* Girls Matrix Box */}
              <div className="p-4 rounded-xl border border-pink-200 bg-pink-50/40">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-pink-600 text-white flex items-center justify-center text-xs font-bold">
                      G
                    </span>
                    <span className="text-xs font-bold text-pink-950 uppercase tracking-wide">
                      Girls Matrix Wing
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded">
                    {girlsCapacity} Seats
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Girls Rows
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={girlsRows}
                      onChange={e => setGirlsRows(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Depth (1–12)</span>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Girls Columns
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={girlsCols}
                      onChange={e => setGirlsCols(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <span className="text-[10px] text-slate-400">Seats/row (1–10)</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Single Unified Matrix */
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
                  value={singleRows}
                  onChange={e => setSingleRows(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Tiered depth (1–15)</p>
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
                  value={singleCols}
                  onChange={e => setSingleCols(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm"
                />
                <p className="text-[11px] text-slate-400 mt-1">Seats per row (1–15)</p>
              </div>
            </div>
          )}

          {/* Matrix Capacity Summary Card */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Total Fixed Matrix Capacity</div>
                <div className="text-[11px] text-indigo-700">
                  {layoutMode === 'dual_matrix' ? (
                    <span>Boys ({boysCapacity}) + Girls ({girlsCapacity})</span>
                  ) : (
                    <span>{singleRows} rows × {singleCols} columns</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-indigo-700 font-mono">
                {totalPositions}
              </div>
              <div className="text-[10px] text-indigo-500 uppercase tracking-wider font-semibold">
                Fixed Seats
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {loading ? 'Saving...' : (isEditing ? 'Update Classroom' : 'Create Classroom')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
