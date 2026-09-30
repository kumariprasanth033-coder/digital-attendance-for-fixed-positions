import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, Sparkles, AlertCircle, Building2, Armchair, Upload, Monitor, 
  Check, Plus, Layers, Grid3X3, Columns, Rows, ShieldCheck, Users 
} from 'lucide-react';
import { Classroom, BranchSeatingConfig, GenderSeatingConfig } from '../../types';

export const STANDARD_BRANCHES = [
  { code: 'AI & DS', label: 'AI & Data Science' },
  { code: 'CSE', label: 'Computer Science' },
  { code: 'IT', label: 'Information Tech' },
  { code: 'ECE', label: 'Electronics & Comm.' },
  { code: 'EEE', label: 'Electrical & Electronics' },
  { code: 'MECH', label: 'Mechanical' },
  { code: 'CIVIL', label: 'Civil' },
  { code: 'CS-BS', label: 'CS & Business Systems' },
  { code: 'AIML', label: 'AI & Machine Learning' },
  { code: 'Cyber Security', label: 'Cyber Security' },
];

interface CreateClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    class_name: string;
    rows: number;
    columns: number;
    branch?: string;
    branches?: string[];
    branch_configs?: BranchSeatingConfig[];
    seating_division_mode?: 'gender' | 'branch' | 'both' | 'unified';
    gender_config?: GenderSeatingConfig;
    enforce_seating_rule?: boolean;
    initialAction?: 'assign_student' | 'bulk_import' | 'view';
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

  // Form states - declared unconditionally at the very top
  const [className, setClassName] = useState('');
  const [selectedBranches, setSelectedBranches] = useState<string[]>(['AI & DS']);
  const [customBranchInput, setCustomBranchInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Seating Division Mode: 'gender' (Girls & Boys) | 'branch' (Streams) | 'unified' (Single Grid)
  const [divisionMode, setDivisionMode] = useState<'gender' | 'branch' | 'unified'>('gender');

  // Must and should follow rule enforcement
  const [enforceRule, setEnforceRule] = useState<boolean>(true);

  // Gender Seating Configuration (Girls & Boys rows & columns)
  const [girlsRows, setGirlsRows] = useState<number>(4);
  const [girlsCols, setGirlsCols] = useState<number>(2);
  const [boysRows, setBoysRows] = useState<number>(4);
  const [boysCols, setBoysCols] = useState<number>(2);
  const [genderArrangement, setGenderArrangement] = useState<'side_by_side' | 'front_to_back'>('side_by_side');
  const [girlsPlacement, setGirlsPlacement] = useState<'left' | 'right' | 'front' | 'back'>('left');

  // Branch Dimensions for multi-branch mode
  const [branchDimensions, setBranchDimensions] = useState<Record<string, { rows: number; columns: number }>>({
    'AI & DS': { rows: 4, columns: 4 }
  });
  const [branchArrangement, setBranchArrangement] = useState<'side_by_side' | 'front_to_back'>('side_by_side');

  // Standard Unified rows & columns
  const [unifiedRows, setUnifiedRows] = useState<number>(4);
  const [unifiedCols, setUnifiedCols] = useState<number>(4);

  // Post-creation action
  const [initialAction, setInitialAction] = useState<'assign_student' | 'bulk_import' | 'view'>('assign_student');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize or reset form whenever modal opens or editClassroom changes
  useEffect(() => {
    if (!isOpen) return;

    if (editClassroom) {
      setClassName(editClassroom.class_name);

      let branchesList: string[] = ['AI & DS'];
      if (editClassroom.branches && editClassroom.branches.length > 0) {
        branchesList = editClassroom.branches;
      } else if (editClassroom.branch) {
        const parts = editClassroom.branch.split(/[+,/]/).map(s => s.trim()).filter(Boolean);
        if (parts.length > 0) branchesList = parts;
      } else {
        const detected: string[] = [];
        STANDARD_BRANCHES.forEach(b => {
          if (editClassroom.class_name.toUpperCase().includes(b.code.toUpperCase())) {
            detected.push(b.code);
          }
        });
        if (detected.length > 0) branchesList = detected;
      }
      setSelectedBranches(branchesList);

      // Reconstruct division mode
      if (editClassroom.gender_config) {
        setDivisionMode('gender');
        const gc = editClassroom.gender_config;
        setGirlsRows(gc.girls_rows || 4);
        setGirlsCols(gc.girls_columns || 2);
        setBoysRows(gc.boys_rows || 4);
        setBoysCols(gc.boys_columns || 2);
        setGenderArrangement(gc.arrangement || 'side_by_side');
        setGirlsPlacement(gc.girls_placement || 'left');
      } else if (editClassroom.branch_configs && editClassroom.branch_configs.length > 1) {
        setDivisionMode('branch');
        const initialDims: Record<string, { rows: number; columns: number }> = {};
        editClassroom.branch_configs.forEach(bc => {
          initialDims[bc.branch] = { rows: bc.rows, columns: bc.columns };
        });
        setBranchDimensions(initialDims);
      } else {
        setDivisionMode(editClassroom.seating_division_mode === 'gender' ? 'gender' : 'unified');
        setUnifiedRows(editClassroom.rows || 4);
        setUnifiedCols(editClassroom.columns || 4);
      }

      setEnforceRule(editClassroom.enforce_seating_rule !== false);
    } else {
      // New classroom defaults: Gender division enabled by default
      setClassName('AI & DS — Section A');
      setSelectedBranches(['AI & DS']);
      setDivisionMode('gender');
      setEnforceRule(true);
      setGirlsRows(4);
      setGirlsCols(2);
      setBoysRows(4);
      setBoysCols(2);
      setGenderArrangement('side_by_side');
      setGirlsPlacement('left');
      setBranchDimensions({ 'AI & DS': { rows: 4, columns: 4 } });
      setBranchArrangement('side_by_side');
      setUnifiedRows(4);
      setUnifiedCols(4);
      setInitialAction('assign_student');
      setCustomBranchInput('');
      setShowCustomInput(false);
    }
    setError(null);
  }, [isOpen, editClassroom]);

  // Compute computed classroom rows and columns based on active division mode
  const { finalRows, finalCols, computedGenderConfig, computedBranchConfigs } = useMemo(() => {
    if (divisionMode === 'gender') {
      const gRows = Math.max(1, girlsRows);
      const gCols = Math.max(1, girlsCols);
      const bRows = Math.max(1, boysRows);
      const bCols = Math.max(1, boysCols);

      if (genderArrangement === 'side_by_side') {
        const totalRows = Math.max(gRows, bRows);
        const totalCols = gCols + bCols;

        let gStartCol = 1;
        let gEndCol = gCols;
        let bStartCol = gCols + 1;
        let bEndCol = totalCols;

        if (girlsPlacement === 'right') {
          bStartCol = 1;
          bEndCol = bCols;
          gStartCol = bCols + 1;
          gEndCol = totalCols;
        }

        const gc: GenderSeatingConfig = {
          arrangement: 'side_by_side',
          girls_placement: girlsPlacement,
          girls_rows: gRows,
          girls_columns: gCols,
          girls_total_seats: gRows * gCols,
          boys_rows: bRows,
          boys_columns: bCols,
          boys_total_seats: bRows * bCols,
          girls_start_row: 1,
          girls_end_row: gRows,
          girls_start_col: gStartCol,
          girls_end_col: gEndCol,
          boys_start_row: 1,
          boys_end_row: bRows,
          boys_start_col: bStartCol,
          boys_end_col: bEndCol,
        };

        return {
          finalRows: totalRows,
          finalCols: totalCols,
          computedGenderConfig: gc,
          computedBranchConfigs: undefined
        };
      } else {
        // Front-to-back
        const totalRows = gRows + bRows;
        const totalCols = Math.max(gCols, bCols);

        let gStartRow = 1;
        let gEndRow = gRows;
        let bStartRow = gRows + 1;
        let bEndRow = totalRows;

        if (girlsPlacement === 'back') {
          bStartRow = 1;
          bEndRow = bRows;
          gStartRow = bRows + 1;
          gEndRow = totalRows;
        }

        const gc: GenderSeatingConfig = {
          arrangement: 'front_to_back',
          girls_placement: girlsPlacement,
          girls_rows: gRows,
          girls_columns: gCols,
          girls_total_seats: gRows * gCols,
          boys_rows: bRows,
          boys_columns: bCols,
          boys_total_seats: bRows * bCols,
          girls_start_row: gStartRow,
          girls_end_row: gEndRow,
          girls_start_col: 1,
          girls_end_col: gCols,
          boys_start_row: bStartRow,
          boys_end_row: bEndRow,
          boys_start_col: 1,
          boys_end_col: bCols,
        };

        return {
          finalRows: totalRows,
          finalCols: totalCols,
          computedGenderConfig: gc,
          computedBranchConfigs: undefined
        };
      }
    } else if (divisionMode === 'branch') {
      if (selectedBranches.length <= 1) {
        const b = selectedBranches[0] || 'AI & DS';
        const dim = branchDimensions[b] || { rows: 4, columns: 4 };
        return {
          finalRows: dim.rows,
          finalCols: dim.columns,
          computedGenderConfig: undefined,
          computedBranchConfigs: [{
            branch: b,
            rows: dim.rows,
            columns: dim.columns,
            total_seats: dim.rows * dim.columns,
            start_row: 1,
            end_row: dim.rows,
            start_col: 1,
            end_col: dim.columns
          }]
        };
      }

      if (branchArrangement === 'side_by_side') {
        const maxRows = Math.max(...selectedBranches.map(b => branchDimensions[b]?.rows || 4));
        const sumCols = selectedBranches.reduce((sum, b) => sum + (branchDimensions[b]?.columns || 2), 0);
        let currentC = 1;
        const bConfigs: BranchSeatingConfig[] = selectedBranches.map(b => {
          const dim = branchDimensions[b] || { rows: 4, columns: 2 };
          const startCol = currentC;
          const endCol = startCol + dim.columns - 1;
          currentC = endCol + 1;
          return {
            branch: b,
            rows: dim.rows,
            columns: dim.columns,
            total_seats: dim.rows * dim.columns,
            start_row: 1,
            end_row: dim.rows,
            start_col: startCol,
            end_col: endCol
          };
        });
        return {
          finalRows: maxRows,
          finalCols: sumCols,
          computedGenderConfig: undefined,
          computedBranchConfigs: bConfigs
        };
      } else {
        const sumRows = selectedBranches.reduce((sum, b) => sum + (branchDimensions[b]?.rows || 2), 0);
        const maxCols = Math.max(...selectedBranches.map(b => branchDimensions[b]?.columns || 4));
        let currentR = 1;
        const bConfigs: BranchSeatingConfig[] = selectedBranches.map(b => {
          const dim = branchDimensions[b] || { rows: 2, columns: 4 };
          const startRow = currentR;
          const endRow = startRow + dim.rows - 1;
          currentR = endRow + 1;
          return {
            branch: b,
            rows: dim.rows,
            columns: dim.columns,
            total_seats: dim.rows * dim.columns,
            start_row: startRow,
            end_row: endRow,
            start_col: 1,
            end_col: dim.columns
          };
        });
        return {
          finalRows: sumRows,
          finalCols: maxCols,
          computedGenderConfig: undefined,
          computedBranchConfigs: bConfigs
        };
      }
    } else {
      // Unified grid
      return {
        finalRows: Math.max(1, unifiedRows),
        finalCols: Math.max(1, unifiedCols),
        computedGenderConfig: undefined,
        computedBranchConfigs: undefined
      };
    }
  }, [
    divisionMode,
    girlsRows,
    girlsCols,
    boysRows,
    boysCols,
    genderArrangement,
    girlsPlacement,
    selectedBranches,
    branchDimensions,
    branchArrangement,
    unifiedRows,
    unifiedCols
  ]);

  const totalPositions = finalRows * finalCols;

  // Helper to suggest classroom name based on branches
  const suggestClassName = (branches: string[]) => {
    if (branches.length === 0) return '';
    if (branches.length === 1) return `${branches[0]} — Section A`;
    if (branches.length === 2) return `${branches.join(' + ')} — Section A`;
    return `${branches.slice(0, 2).join(' + ')} & ${branches.length - 2} more — Combined`;
  };

  const handleToggleBranch = (code: string) => {
    setError(null);
    let next: string[];
    if (selectedBranches.includes(code)) {
      if (selectedBranches.length === 1) {
        setError('At least one branch must be selected.');
        return;
      }
      next = selectedBranches.filter(b => b !== code);
    } else {
      next = [...selectedBranches, code];
      if (!branchDimensions[code]) {
        setBranchDimensions(prev => ({ ...prev, [code]: { rows: 4, columns: 2 } }));
      }
    }
    setSelectedBranches(next);

    if (!className || className.includes('— Section A') || className.includes('— Combined')) {
      setClassName(suggestClassName(next));
    }
  };

  const handleAddCustomBranch = () => {
    const trimmed = customBranchInput.trim();
    if (!trimmed) return;
    if (!selectedBranches.includes(trimmed)) {
      const next = [...selectedBranches, trimmed];
      setSelectedBranches(next);
      setBranchDimensions(prev => ({ ...prev, [trimmed]: { rows: 4, columns: 2 } }));
      if (!className || className.includes('— Section A') || className.includes('— Combined')) {
        setClassName(suggestClassName(next));
      }
    }
    setCustomBranchInput('');
    setShowCustomInput(false);
  };

  const handleUpdateBranchDim = (b: string, field: 'rows' | 'columns', val: number) => {
    const clamped = Math.max(1, Math.min(30, val));
    setBranchDimensions(prev => ({
      ...prev,
      [b]: {
        rows: field === 'rows' ? clamped : (prev[b]?.rows || 4),
        columns: field === 'columns' ? clamped : (prev[b]?.columns || (selectedBranches.length > 1 ? 2 : 4))
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = className.trim();
    if (!trimmedName) {
      setError('Classroom name is required.');
      return;
    }

    if (selectedBranches.length === 0) {
      setError('Please select at least one branch.');
      return;
    }

    if (finalRows < 1 || finalRows > 30) {
      setError('Total rows must be between 1 and 30.');
      return;
    }

    if (finalCols < 1 || finalCols > 30) {
      setError('Total columns must be between 1 and 30.');
      return;
    }

    try {
      setLoading(true);

      const branchString = selectedBranches.join(' + ');

      const payload = {
        class_name: trimmedName,
        rows: Number(finalRows),
        columns: Number(finalCols),
        branch: branchString,
        branches: selectedBranches,
        branch_configs: computedBranchConfigs,
        seating_division_mode: divisionMode,
        gender_config: computedGenderConfig,
        enforce_seating_rule: enforceRule,
        initialAction
      };

      if (isEditing && editClassroom && onUpdate) {
        await onUpdate(editClassroom.id, {
          class_name: payload.class_name,
          rows: payload.rows,
          columns: payload.columns,
          branch: payload.branch,
          branches: payload.branches,
          branch_configs: payload.branch_configs,
          seating_division_mode: payload.seating_division_mode,
          gender_config: payload.gender_config,
          enforce_seating_rule: payload.enforce_seating_rule
        });
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

  // Safe preview limits for live grid rendering
  const previewRows = Math.min(finalRows, 4);
  const previewCols = Math.min(finalCols, 6);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {isEditing ? 'Edit Classroom' : 'Create New Classroom'}
              </h3>
              <p className="text-xs text-slate-500">Configure seating division, rows, columns & policies</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {isEditing && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Changing classroom dimensions may affect existing seat assignments.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Class Name */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Classroom / Course Section Name *
              </label>
              <input
                type="text"
                required
                value={className}
                onChange={e => setClassName(e.target.value)}
                placeholder="e.g. AI & DS + CSE — Section A"
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 bg-white shadow-2xs"
              />
            </div>

            {/* Multiple Option Selection for Branches */}
            <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/90">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Branch / Department (Multiple Selection) *</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Select 1 or more branches if combined streams sit together in this classroom.
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  selectedBranches.length > 1
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-indigo-100 text-indigo-800 border-indigo-200'
                }`}>
                  {selectedBranches.length > 1 
                    ? `Combined: ${selectedBranches.length} Branches`
                    : `${selectedBranches.length} Branch`}
                </span>
              </div>

              {/* Selected Branches summary badges */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {selectedBranches.map(b => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-2xs"
                  >
                    <Check className="w-3 h-3 text-indigo-200" />
                    <span>{b}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleBranch(b)}
                      className="hover:text-indigo-200 ml-0.5 cursor-pointer text-indigo-200 hover:text-white"
                      title={`Remove ${b}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Multi-option Branch Toggle Chips */}
              <div className="pt-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                  Click to Add / Remove Branches:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {STANDARD_BRANCHES.map(branchItem => {
                    const isSelected = selectedBranches.includes(branchItem.code);
                    return (
                      <button
                        key={branchItem.code}
                        type="button"
                        onClick={() => handleToggleBranch(branchItem.code)}
                        className={`px-2.5 py-1.5 rounded-xl text-left border text-xs font-semibold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-2xs ring-1 ring-indigo-500/30'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100/80 hover:border-slate-300'
                        }`}
                        title={branchItem.label}
                      >
                        <span className="truncate">{branchItem.code}</span>
                        <div className={`w-3.5 h-3.5 rounded-md flex items-center justify-center shrink-0 ml-1 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'border border-slate-300 bg-white'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add Custom Branch Field */}
              <div className="pt-2 border-t border-slate-200/60">
                {!showCustomInput ? (
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Custom Branch / Department</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={customBranchInput}
                      onChange={e => setCustomBranchInput(e.target.value)}
                      placeholder="e.g. Robotics, CS-DS..."
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomBranch();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomBranch}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCustomInput(false)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SEATING DIVISION ARCHITECTURE SELECTOR */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Grid3X3 className="w-4 h-4 text-indigo-600" />
                  <span>Seating Division Layout *</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Choose how rows and columns are divided in this classroom.
                </p>
              </div>
            </div>

            {/* Division Mode Tabs: Girls & Boys | Branch Streams | Unified Grid */}
            <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDivisionMode('gender')}
                className={`py-2 px-2.5 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-center cursor-pointer ${
                  divisionMode === 'gender'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100 ring-1 ring-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-pink-600" />
                <span className="truncate">Girls & Boys</span>
              </button>

              <button
                type="button"
                onClick={() => setDivisionMode('branch')}
                className={`py-2 px-2.5 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-center cursor-pointer ${
                  divisionMode === 'branch'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100 ring-1 ring-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span className="truncate">By Branches ({selectedBranches.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDivisionMode('unified')}
                className={`py-2 px-2.5 rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 text-center cursor-pointer ${
                  divisionMode === 'unified'
                    ? 'bg-white text-indigo-700 shadow-xs border border-indigo-100 ring-1 ring-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid3X3 className="w-3.5 h-3.5 text-slate-500" />
                <span className="truncate">Unified Grid</span>
              </button>
            </div>
          </div>

          {/* MODE 1: GIRLS & BOYS SEPARATE ROWS AND COLUMNS */}
          {divisionMode === 'gender' && (
            <div className="space-y-3.5 p-4 rounded-2xl bg-linear-to-br from-pink-50/50 via-slate-50 to-blue-50/50 border border-slate-200 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-pink-500" />
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500 -ml-1.5" />
                    <span>Divided Seating: Separate Rows & Columns for Girls and Boys</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Specify the exact number of rows and columns for Girls and for Boys.
                  </p>
                </div>

                {/* Gender Arrangement Toggle */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-[10px] font-bold self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setGenderArrangement('side_by_side');
                      if (girlsPlacement === 'front' || girlsPlacement === 'back') {
                        setGirlsPlacement('left');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      genderArrangement === 'side_by_side'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    <span>Columns (Side-by-Side)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGenderArrangement('front_to_back');
                      if (girlsPlacement === 'left' || girlsPlacement === 'right') {
                        setGirlsPlacement('front');
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      genderArrangement === 'front_to_back'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Rows className="w-3 h-3" />
                    <span>Rows (Front-to-Back)</span>
                  </button>
                </div>
              </div>

              {/* Placement selector: Left vs Right (for side-by-side) or Front vs Back */}
              <div className="flex items-center justify-between text-xs bg-white/80 p-2.5 rounded-xl border border-slate-200">
                <span className="font-semibold text-slate-700 text-[11px]">
                  {genderArrangement === 'side_by_side' ? 'Girls Column Side:' : 'Girls Row Placement:'}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] font-bold">
                  {genderArrangement === 'side_by_side' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setGirlsPlacement('left')}
                        className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          girlsPlacement === 'left'
                            ? 'bg-pink-100 text-pink-800 border-pink-300 font-bold shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        👩 Girls on Left, 👨 Boys on Right
                      </button>
                      <button
                        type="button"
                        onClick={() => setGirlsPlacement('right')}
                        className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          girlsPlacement === 'right'
                            ? 'bg-pink-100 text-pink-800 border-pink-300 font-bold shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        👨 Boys on Left, 👩 Girls on Right
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setGirlsPlacement('front')}
                        className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          girlsPlacement === 'front'
                            ? 'bg-pink-100 text-pink-800 border-pink-300 font-bold shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        👩 Girls in Front Rows, 👨 Boys in Back Rows
                      </button>
                      <button
                        type="button"
                        onClick={() => setGirlsPlacement('back')}
                        className={`px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                          girlsPlacement === 'back'
                            ? 'bg-pink-100 text-pink-800 border-pink-300 font-bold shadow-2xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        👨 Boys in Front Rows, 👩 Girls in Back Rows
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Side-by-side or stacked Cards for Girls and Boys inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* GIRLS SEATING CARD */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-pink-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-700 flex items-center justify-center text-xs font-black">
                        👩
                      </span>
                      <span className="text-xs font-bold text-pink-900">Girls Seating</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-pink-700 bg-pink-50 px-2.5 py-0.5 rounded-full border border-pink-200">
                      {girlsRows * girlsCols} Seats
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Girls Rows *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={girlsRows}
                        onChange={e => setGirlsRows(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-1.5 border border-pink-300 rounded-xl text-xs font-mono bg-pink-50/20 focus:ring-2 focus:ring-pink-500/30 focus:border-pink-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Girls Columns *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={girlsCols}
                        onChange={e => setGirlsCols(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-1.5 border border-pink-300 rounded-xl text-xs font-mono bg-pink-50/20 focus:ring-2 focus:ring-pink-500/30 focus:border-pink-600 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-pink-700/80 font-medium">
                    {genderArrangement === 'side_by_side'
                      ? `Columns: ${computedGenderConfig?.girls_start_col} to ${computedGenderConfig?.girls_end_col} (Rows 1 to ${girlsRows})`
                      : `Rows: ${computedGenderConfig?.girls_start_row} to ${computedGenderConfig?.girls_end_row} (Cols 1 to ${girlsCols})`}
                  </div>
                </div>

                {/* BOYS SEATING CARD */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-blue-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">
                        👨
                      </span>
                      <span className="text-xs font-bold text-blue-900">Boys Seating</span>
                    </div>
                    <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {boysRows * boysCols} Seats
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Boys Rows *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={boysRows}
                        onChange={e => setBoysRows(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-1.5 border border-blue-300 rounded-xl text-xs font-mono bg-blue-50/20 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Boys Columns *
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={30}
                        value={boysCols}
                        onChange={e => setBoysCols(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                        className="w-full px-3 py-1.5 border border-blue-300 rounded-xl text-xs font-mono bg-blue-50/20 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-600 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="text-[10px] text-blue-700/80 font-medium">
                    {genderArrangement === 'side_by_side'
                      ? `Columns: ${computedGenderConfig?.boys_start_col} to ${computedGenderConfig?.boys_end_col} (Rows 1 to ${boysRows})`
                      : `Rows: ${computedGenderConfig?.boys_start_row} to ${computedGenderConfig?.boys_end_row} (Cols 1 to ${boysCols})`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* MODE 2: MULTI-BRANCH SEPARATE ROWS AND COLUMNS */}
          {divisionMode === 'branch' && (
            <div className="space-y-3 p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200/80">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Grid3X3 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Branch Stream Seating Dimensions</span>
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Configure row and column counts separately for each stream in this combined classroom.
                  </p>
                </div>

                {/* Arrangement Mode: Side-by-Side vs Front-to-Back */}
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-[10px] font-bold">
                  <button
                    type="button"
                    onClick={() => setBranchArrangement('side_by_side')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      branchArrangement === 'side_by_side'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Columns className="w-3 h-3" />
                    <span>Columns</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBranchArrangement('front_to_back')}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer ${
                      branchArrangement === 'front_to_back'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Rows className="w-3 h-3" />
                    <span>Rows</span>
                  </button>
                </div>
              </div>

              {/* Separate Row & Column Inputs for each selected branch */}
              <div className="space-y-2.5 pt-1">
                {selectedBranches.map(bName => {
                  const dim = branchDimensions[bName] || { rows: 4, columns: 2 };
                  return (
                    <div
                      key={`dim-${bName}`}
                      className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-indigo-600 text-white shadow-2xs">
                          {bName}
                        </span>
                        <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          {dim.rows} × {dim.columns} = {dim.rows * dim.columns} Seats
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Rows for {bName} *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={dim.rows}
                            onChange={e => handleUpdateBranchDim(bName, 'rows', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/30 shadow-2xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Columns for {bName} *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={dim.columns}
                            onChange={e => handleUpdateBranchDim(bName, 'columns', parseInt(e.target.value) || 1)}
                            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/30 shadow-2xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 3: UNIFIED GRID */}
          {divisionMode === 'unified' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-800">
                Unified Grid Dimensions (Single Pool)
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Number of Rows *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={unifiedRows}
                    onChange={e => setUnifiedRows(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/30 shadow-2xs bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Front to back rows (1-30)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Columns per Row *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={unifiedCols}
                    onChange={e => setUnifiedCols(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500/30 shadow-2xs bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Seats per row (1-30)</span>
                </div>
              </div>
            </div>
          )}

          {/* "U MUST AND SHOULD FOLLOW" SEATING POLICY CARD */}
          <div className={`p-4 rounded-2xl border transition-all ${
            enforceRule
              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-200 shadow-xs'
              : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  enforceRule ? 'bg-amber-500 text-white shadow-xs' : 'bg-slate-200 text-slate-500'
                }`}>
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      Seating Division Rule: Must and Should Follow *
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      enforceRule 
                        ? 'bg-amber-200 text-amber-900 border-amber-400' 
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}>
                      {enforceRule ? 'Mandatory Policy' : 'Flexible Recommendation'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    <strong>Rule Requirement:</strong> When enabled, students <em>must and should follow</em> their assigned seating division. 
                    {divisionMode === 'gender' 
                      ? ' Girls must sit only in designated Girls seats, and Boys must sit only in designated Boys seats.' 
                      : ' Students must strictly occupy designated branch / section seats.'}
                    {' '}Seat assignments and CSV imports will enforce this policy.
                  </p>
                </div>
              </div>

              {/* Toggle switch */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                <input
                  type="checkbox"
                  checked={enforceRule}
                  onChange={e => setEnforceRule(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600 shadow-2xs"></div>
              </label>
            </div>
          </div>

          {/* Seating Capacity Calculation Card */}
          <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <Armchair className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-indigo-900 font-bold block">Total Fixed Seating Capacity</span>
                <span className="text-[11px] text-indigo-700 font-mono font-medium">
                  {finalRows} Rows × {finalCols} Columns
                </span>
                {divisionMode === 'gender' && computedGenderConfig && (
                  <span className="text-[11px] font-semibold text-indigo-800 block mt-0.5">
                    👩 Girls: {computedGenderConfig.girls_total_seats} seats ({girlsRows}×{girlsCols}) + 👨 Boys: {computedGenderConfig.boys_total_seats} seats ({boysRows}×{boysCols})
                  </span>
                )}
                {divisionMode === 'branch' && computedBranchConfigs && (
                  <span className="text-[10px] text-indigo-600 block mt-0.5">
                    {computedBranchConfigs.map(c => `${c.branch}: ${c.total_seats}`).join(' + ')}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-indigo-700 font-mono tabular-nums">
                {totalPositions}
              </span>
              <span className="text-[10px] text-indigo-600 font-bold block uppercase tracking-wider">Total Seats</span>
            </div>
          </div>

          {/* Visual Cinema Seating Matrix Live Preview */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-indigo-600" />
                <span>Physical Cinema Grid Preview</span>
              </span>
              <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                {finalRows} × {finalCols} matrix
              </span>
            </div>

            {/* Smart board line */}
            <div className="py-1 px-3 bg-slate-800 text-white rounded-lg text-center text-[10px] font-mono tracking-widest uppercase">
              FRONT / SMART BOARD
            </div>

            {/* Grid Preview Cells with Gender or Branch Coloration */}
            <div className="space-y-1.5 pt-1 overflow-x-auto">
              {Array.from({ length: previewRows }, (_, rIdx) => {
                const r = rIdx + 1;
                return (
                  <div key={`p-row-${r}`} className="flex items-center gap-1.5 justify-center">
                    <span className="text-[9px] font-mono font-bold text-slate-400 w-5 text-right">R{r}</span>
                    <div className="flex gap-1.5">
                      {Array.from({ length: previewCols }, (_, cIdx) => {
                        const c = cIdx + 1;

                        if (divisionMode === 'gender' && computedGenderConfig) {
                          const isGirlSeat =
                            r >= computedGenderConfig.girls_start_row &&
                            r <= computedGenderConfig.girls_end_row &&
                            c >= computedGenderConfig.girls_start_col &&
                            c <= computedGenderConfig.girls_end_col;

                          const colorClass = isGirlSeat
                            ? 'bg-pink-50 border-pink-300 text-pink-700 ring-1 ring-pink-200'
                            : 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-200';

                          return (
                            <div
                              key={`p-seat-${r}-${c}`}
                              className={`px-1.5 py-1 rounded-md border text-[9px] font-mono font-semibold shadow-2xs flex flex-col items-center ${colorClass}`}
                              title={isGirlSeat ? `Girls Seat: R${r}-C${c}` : `Boys Seat: R${r}-C${c}`}
                            >
                              <span className="text-[8px] font-sans font-bold uppercase truncate leading-tight">
                                {isGirlSeat ? '👩 Girl' : '👨 Boy'}
                              </span>
                              <span>R{r}-C{c}</span>
                            </div>
                          );
                        }

                        // Branch mode preview
                        const branchForSeat = computedBranchConfigs?.find(bc =>
                          r >= (bc.start_row || 1) && r <= (bc.end_row || finalRows) &&
                          c >= (bc.start_col || 1) && c <= (bc.end_col || finalCols)
                        );
                        const bIdx = selectedBranches.indexOf(branchForSeat?.branch || '');
                        const colorClass = bIdx === 0
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                          : bIdx === 1
                          ? 'bg-violet-50 border-violet-200 text-violet-700'
                          : bIdx === 2
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : 'bg-white border-slate-200 text-slate-600';

                        return (
                          <div
                            key={`p-seat-${r}-${c}`}
                            className={`px-1.5 py-1 rounded-md border text-[9px] font-mono font-semibold shadow-2xs flex flex-col items-center ${colorClass}`}
                            title={branchForSeat ? `${branchForSeat.branch}: R${r}-C${c}` : `R${r}-C${c}`}
                          >
                            {selectedBranches.length > 1 && branchForSeat && (
                              <span className="text-[7px] font-sans font-bold uppercase truncate max-w-[38px] leading-tight opacity-75">
                                {branchForSeat.branch}
                              </span>
                            )}
                            <span>R{r}-C{c}</span>
                          </div>
                        );
                      })}
                      {finalCols > previewCols && (
                        <div className="px-1.5 py-1 rounded-md text-[9px] font-mono text-slate-400">
                          +{finalCols - previewCols}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {finalRows > previewRows && (
                <div className="text-center text-[10px] text-slate-400 pt-0.5">
                  +{finalRows - previewRows} more rows
                </div>
              )}
            </div>
          </div>

          {/* Action Choice after Creation (For new classrooms) */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Next Step upon Creation:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setInitialAction('assign_student')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    initialAction === 'assign_student'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    initialAction === 'assign_student' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Armchair className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Assign Students to Seats</span>
                    <span className="text-[10px] text-slate-500 block">Opens "Assign Student to Seat" modal for seat R1-C1</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInitialAction('bulk_import')}
                  className={`p-3 rounded-xl border text-left transition-all flex items-start gap-2.5 cursor-pointer ${
                    initialAction === 'bulk_import'
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-2xs'
                      : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    initialAction === 'bulk_import' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Upload className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">Upload CSV / Excel</span>
                    <span className="text-[10px] text-slate-500 block">Bulk auto-allocation respecting Girls & Boys zones</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Architecture Note */}
          <div className="text-[11px] text-slate-500 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 leading-relaxed space-y-1">
            <div>
              <strong>Architecture Note:</strong> Single physical auditorium seating grid. Fixed cinema positions (R1-C1, R1-C2...) preserve precise classroom geography.
            </div>
            {divisionMode === 'gender' && (
              <div className="text-pink-700 font-medium">
                ★ <strong>Girls & Boys Seating Division:</strong> Girls seats and Boys seats are strictly designated with distinct rows and columns. {enforceRule ? 'Students must and should follow this rule.' : ''}
              </div>
            )}
            {selectedBranches.length > 1 && (
              <div className="text-indigo-700 font-medium">
                ★ <strong>Combined Batch:</strong> Students from <strong>{selectedBranches.join(', ')}</strong> share this cinema grid.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
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
