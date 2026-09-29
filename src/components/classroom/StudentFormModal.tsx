import React, { useState, useEffect } from 'react';
import { Classroom, Student, StudentGender } from '../../types';
import { X, UserCheck, Trash2, AlertCircle, Armchair, Sparkles } from 'lucide-react';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: Classroom;
  existingStudent?: Student | null;
  targetRow?: number;
  targetCol?: number;
  defaultGender?: StudentGender;
  existingStudents?: Student[];
  onSave: (student: Omit<Student, 'id' | 'created_at'>, studentId?: string) => Promise<void>;
  onDelete?: (studentId: string) => Promise<void>;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  classroom,
  existingStudent,
  targetRow = 1,
  targetCol = 1,
  defaultGender = 'Male',
  existingStudents = [],
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('AI & DS');
  const [gender, setGender] = useState<StudentGender>(defaultGender);
  const [row, setRow] = useState(targetRow);
  const [col, setCol] = useState(targetCol);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (existingStudent) {
      setName(existingStudent.student_name);
      setRollNumber(existingStudent.roll_number);
      setBranch(existingStudent.branch);
      setGender(existingStudent.gender);
      setRow(existingStudent.row_number);
      setCol(existingStudent.column_number);
    } else {
      setName('');
      setRollNumber('');
      setBranch(classroom.class_name.includes('AI') ? 'AI & DS' : 'CSE');
      setGender(defaultGender || 'Male');
      setRow(targetRow || 1);
      setCol(targetCol || 1);
    }
    setError(null);
    setConfirmDelete(false);
  }, [existingStudent, targetRow, targetCol, classroom, isOpen, defaultGender]);

  if (!isOpen) return null;

  // Auto-calculated position representation
  const positionTag = `R${row}-C${col}`;
  const positionNumber = (row - 1) * classroom.columns + col;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanRoll = rollNumber.trim().toUpperCase();
    const cleanBranch = branch.trim();
    const numRow = Number(row);
    const numCol = Number(col);

    // Validation 1: Required fields
    if (!cleanName) {
      setError('Student name is required.');
      return;
    }
    if (!cleanRoll) {
      setError('Roll number is required.');
      return;
    }
    if (!cleanBranch) {
      setError('Branch / Department is required.');
      return;
    }
    if (!gender) {
      setError('Gender is required.');
      return;
    }

    // Validation 2: Classroom boundaries
    if (numRow < 1 || numRow > classroom.rows) {
      setError(`Row must be between 1 and ${classroom.rows} for ${classroom.class_name}.`);
      return;
    }
    if (numCol < 1 || numCol > classroom.columns) {
      setError(`Column must be between 1 and ${classroom.columns} for ${classroom.class_name}.`);
      return;
    }

    // Validation 3: Duplicate roll number in same classroom
    const duplicateRoll = existingStudents.find(
      s => s.id !== existingStudent?.id && s.roll_number.trim().toUpperCase() === cleanRoll
    );
    if (duplicateRoll) {
      setError(`Roll number "${cleanRoll}" is already assigned to ${duplicateRoll.student_name} in this classroom.`);
      return;
    }

    // Validation 4: Duplicate seat position in same classroom
    const duplicateSeat = existingStudents.find(
      s => s.id !== existingStudent?.id && s.row_number === numRow && s.column_number === numCol
    );
    if (duplicateSeat) {
      setError(`Seat ${positionTag} (Row ${numRow}, Col ${numCol}) is already occupied by ${duplicateSeat.student_name}.`);
      return;
    }

    try {
      setLoading(true);
      await onSave({
        classroom_id: classroom.id,
        student_name: cleanName,
        roll_number: cleanRoll,
        branch: cleanBranch,
        gender,
        row_number: numRow,
        column_number: numCol,
        position_number: positionNumber
      }, existingStudent?.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save student.');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!existingStudent || !onDelete) return;
    try {
      setLoading(true);
      await onDelete(existingStudent.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to delete student.');
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
              <Armchair className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {existingStudent ? 'Edit Student Details' : 'Assign Student to Seat'}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {classroom.class_name} · Position: <strong className="text-indigo-600 font-bold">{positionTag}</strong> (#{positionNumber})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Student Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Full Student Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          {/* Roll Number & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                placeholder="e.g. 21AIDS101"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Branch / Dept *
              </label>
              <select
                value={branch}
                onChange={e => setBranch(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              >
                <option value="AI & DS">AI & DS</option>
                <option value="CSE">CSE</option>
                <option value="IT">IT</option>
                <option value="ECE">ECE</option>
                <option value="EEE">EEE</option>
                <option value="MECH">MECH</option>
                <option value="CIVIL">CIVIL</option>
              </select>
            </div>
          </div>

          {/* Gender Selector: Male / Female */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Gender Category *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setGender('Male')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'Male'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>👦 Male (Boy)</span>
              </button>

              <button
                type="button"
                onClick={() => setGender('Female')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  gender === 'Female'
                    ? 'border-pink-500 bg-pink-50 text-pink-700 ring-2 ring-pink-500/30'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                <span>👧 Female (Girl)</span>
              </button>
            </div>
          </div>

          {/* Fixed Coordinates Position Selector */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                Fixed Seating Position
              </span>
              <span className="text-xs font-mono font-bold bg-white text-indigo-700 px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                {positionTag} (Seat #{positionNumber})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Row (1 to {classroom.rows}) *
                </label>
                <select
                  value={row}
                  onChange={e => setRow(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                >
                  {Array.from({ length: classroom.rows }, (_, i) => i + 1).map(r => (
                    <option key={r} value={r}>
                      Row {r} (R{r})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Column (1 to {classroom.columns}) *
                </label>
                <select
                  value={col}
                  onChange={e => setCol(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                >
                  {Array.from({ length: classroom.columns }, (_, i) => i + 1).map(c => (
                    <option key={c} value={c}>
                      Column {c} (C{c})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-200/60">
              <span>Theatre Seat Sequence:</span>
              <span className="font-mono font-bold text-slate-700">#{positionNumber} of {classroom.rows * classroom.columns}</span>
            </div>
          </div>

          {/* Inline Delete Confirmation if requested */}
          {confirmDelete && existingStudent && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2 animate-in fade-in">
              <p className="text-xs font-bold">
                Are you sure you want to delete {existingStudent.student_name}?
              </p>
              <p className="text-[11px] text-rose-700">
                Seat {positionTag} will become VACANT. This action can be undone by re-assigning.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  disabled={loading}
                  className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs"
                >
                  {loading ? 'Deleting...' : 'Yes, Delete Student'}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {existingStudent && onDelete && !confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                disabled={loading}
                className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
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
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {loading ? 'Saving...' : existingStudent ? 'Update Student' : 'Save Student'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
