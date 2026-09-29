import React from 'react';
import { Student, MarkState, AttendanceFilter } from '../../types';
import { Check, X, User, Plus } from 'lucide-react';

interface SeatCardProps {
  row: number;
  col: number;
  positionNumber: number;
  student?: Student;
  mode: 'view' | 'manage' | 'attendance';
  filter?: AttendanceFilter;
  markState?: MarkState;
  onToggleMark?: (studentId: string) => void;
  onSeatClick?: (row: number, col: number, student?: Student) => void;
  onMarkPresent?: (studentId: string) => void;
  onMarkAbsent?: (studentId: string) => void;
}

export const SeatCard: React.FC<SeatCardProps> = ({
  row,
  col,
  positionNumber,
  student,
  mode,
  filter = 'all',
  markState = 'Unmarked',
  onToggleMark,
  onSeatClick,
  onMarkPresent,
  onMarkAbsent
}) => {
  // Check if filtered out
  const isFilteredOut = Boolean(
    student && 
    ((filter === 'boys' && student.gender !== 'Male') || 
     (filter === 'girls' && student.gender !== 'Female'))
  );

  // If slot is empty
  if (!student) {
    return (
      <div 
        onClick={() => onSeatClick && onSeatClick(row, col)}
        className={`relative flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed 
          border-slate-300 hover:border-indigo-400 bg-slate-50/70 hover:bg-indigo-50/40 
          transition-all duration-150 min-h-[128px] cursor-pointer group select-none`}
        role="button"
        tabIndex={0}
        aria-label={`Empty Seat Row ${row}, Column ${col}, Position ${positionNumber}`}
      >
        <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400 font-medium">
          #{positionNumber} <span className="text-slate-300">({row},{col})</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 group-hover:bg-indigo-100 flex items-center justify-center text-slate-500 group-hover:text-indigo-600 transition-colors mb-1.5">
          <Plus className="w-4 h-4" />
        </div>
        <span className="text-xs font-medium text-slate-500 group-hover:text-indigo-600">Assign Seat</span>
        <span className="text-[10px] text-slate-400">R{row} · C{col}</span>
      </div>
    );
  }

  // Visual styling based on attendance state
  let attendanceBorder = 'border-slate-200 bg-white hover:border-slate-300 shadow-xs';
  let badgeColor = 'bg-slate-100 text-slate-700';

  if (mode === 'attendance') {
    if (markState === 'Present') {
      attendanceBorder = 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-sm';
      badgeColor = 'bg-emerald-600 text-white';
    } else if (markState === 'Absent') {
      attendanceBorder = 'border-rose-500 bg-rose-50/30 ring-2 ring-rose-500/20 shadow-sm';
      badgeColor = 'bg-rose-600 text-white';
    } else {
      attendanceBorder = 'border-amber-300 bg-amber-50/20 hover:border-amber-400';
      badgeColor = 'bg-amber-100 text-amber-800';
    }
  }

  return (
    <div
      onClick={() => {
        if (mode === 'attendance' && onToggleMark) {
          onToggleMark(student.id);
        } else if (onSeatClick) {
          onSeatClick(row, col, student);
        }
      }}
      className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-150 min-h-[136px] select-none text-left
        ${attendanceBorder}
        ${isFilteredOut ? 'opacity-25 grayscale-[60%] pointer-events-none' : 'cursor-pointer hover:-translate-y-0.5'}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Student ${student.student_name}, Seat ${positionNumber}, ${markState}`}
    >
      {/* Theatre Seat Top Curved Rim Bar */}
      <div className={`absolute top-0 left-3 right-3 h-1 rounded-b-md ${
        mode === 'attendance'
          ? markState === 'Present' ? 'bg-emerald-500' : markState === 'Absent' ? 'bg-rose-500' : 'bg-amber-400'
          : student.gender === 'Male' ? 'bg-blue-400' : 'bg-pink-400'
      }`} />

      {/* Header: Position Number & Gender / Attendance Tag */}
      <div className="flex items-center justify-between gap-1 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-slate-800 tabular-nums">
            #{positionNumber}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            R{row}:C{col}
          </span>
        </div>

        {mode === 'attendance' ? (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${badgeColor}`}>
            {markState === 'Present' && <Check className="w-2.5 h-2.5 stroke-[3]" />}
            {markState === 'Absent' && <X className="w-2.5 h-2.5 stroke-[3]" />}
            {markState}
          </span>
        ) : (
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            student.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
          }`}>
            {student.gender}
          </span>
        )}
      </div>

      {/* Main Student Information: Name, Roll Number, Branch */}
      <div className="my-1.5">
        <h4 className="text-sm font-semibold text-slate-900 truncate leading-tight tracking-tight" title={student.student_name}>
          {student.student_name}
        </h4>
        <div className="text-xs font-mono font-medium text-slate-600 truncate mt-0.5 tabular-nums">
          {student.roll_number}
        </div>
        <div className="text-[11px] text-slate-500 truncate">
          {student.branch}
        </div>
      </div>

      {/* Footer Controls: Attendance Explicit Toggles or View info */}
      {mode === 'attendance' ? (
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => onMarkPresent && onMarkPresent(student.id)}
            className={`flex-1 py-1 px-1.5 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
              markState === 'Present'
                ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            <Check className="w-3 h-3" /> Present
          </button>
          <button
            type="button"
            onClick={() => onMarkAbsent && onMarkAbsent(student.id)}
            className={`flex-1 py-1 px-1.5 rounded text-[11px] font-medium flex items-center justify-center gap-1 transition-colors ${
              markState === 'Absent'
                ? 'bg-rose-600 text-white font-semibold shadow-xs'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <X className="w-3 h-3" /> Absent
          </button>
        </div>
      ) : (
        <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" /> Fixed
          </span>
          <span className="hover:text-indigo-600 font-medium">Edit</span>
        </div>
      )}
    </div>
  );
};
