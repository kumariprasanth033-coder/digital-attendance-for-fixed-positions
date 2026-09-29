import React, { useState, useEffect } from 'react';
import { Classroom, Student, StudentGender } from '../../types';
import { X, UserCheck, Trash2, AlertCircle } from 'lucide-react';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  classroom: Classroom;
  existingStudent?: Student | null;
  targetRow?: number;
  targetCol?: number;
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
  onSave,
  onDelete
}) => {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [branch, setBranch] = useState('AI & DS');
  const [gender, setGender] = useState<StudentGender>('Male');
  const [row, setRow] = useState(targetRow);
  const [col, setCol] = useState(targetCol);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setGender('Male');
      setRow(targetRow || 1);
      setCol(targetCol || 1);
    }
    setError(null);
  }, [existingStudent, targetRow, targetCol, classroom, isOpen]);

  if (!isOpen) return null;

  const positionNumber = (row - 1) * classroom.columns + col;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Student name is required.');
      return;
    }
    if (!rollNumber.trim()) {
      setError('Roll number is required.');
      return;
    }
    if (!branch.trim()) {
      setError('Branch is required.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        classroom_id: classroom.id,
        student_name: name.trim(),
        roll_number: rollNumber.trim().toUpperCase(),
        branch: branch.trim(),
        gender,
        row_number: row,
        column_number: col,
        position_number: positionNumber
      }, existingStudent?.id);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save student.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingStudent || !onDelete) return;
    if (confirm(`Are you sure you want to remove ${existingStudent.student_name} from Seat #${existingStudent.position_number}?`)) {
      try {
        setLoading(true);
        await onDelete(existingStudent.id);
        onClose();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to delete student.');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {existingStudent ? 'Edit Fixed Seat Student' : 'Assign Student to Fixed Seat'}
            </h3>
            <p className="text-xs text-slate-500">
              Seat #{positionNumber} (Row {row}, Column {col}) · {classroom.class_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Student Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roll Number *
              </label>
              <input
                type="text"
                required
                value={rollNumber}
                onChange={e => setRollNumber(e.target.value)}
                placeholder="23A81A0501"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch / Dept *
              </label>
              <input
                type="text"
                required
                value={branch}
                onChange={e => setBranch(e.target.value)}
                placeholder="AI & DS"
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gender *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                gender === 'Male'
                  ? 'border-blue-500 bg-blue-50/60 text-blue-700 ring-2 ring-blue-500/20'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="gender"
                  value="Male"
                  checked={gender === 'Male'}
                  onChange={() => setGender('Male')}
                  className="sr-only"
                />
                <span>Male Student</span>
              </label>

              <label className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                gender === 'Female'
                  ? 'border-pink-500 bg-pink-50/60 text-pink-700 ring-2 ring-pink-500/20'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}>
                <input
                  type="radio"
                  name="gender"
                  value="Female"
                  checked={gender === 'Female'}
                  onChange={() => setGender('Female')}
                  className="sr-only"
                />
                <span>Female Student</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
            <div className="text-xs font-semibold text-slate-700 mb-2">
              Fixed Position Coordinates
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Row</span>
                <span className="font-mono font-bold text-slate-800">{row} / {classroom.rows}</span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 block">Column</span>
                <span className="font-mono font-bold text-slate-800">{col} / {classroom.columns}</span>
              </div>
              <div className="bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                <span className="text-[10px] text-indigo-500 block">Seat #</span>
                <span className="font-mono font-bold text-indigo-700">#{positionNumber}</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-between gap-3">
            {existingStudent && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Student
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <UserCheck className="w-3.5 h-3.5" />
                {loading ? 'Saving...' : existingStudent ? 'Update Position' : 'Assign Position'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
