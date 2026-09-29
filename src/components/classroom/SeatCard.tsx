import React from 'react';
import { Student, MarkState, AttendanceFilter } from '../../types';
import { Check, X, User, Plus, Armchair } from 'lucide-react';

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
  wing?: 'boys' | 'girls' | 'general';
}

export const SeatCard: React.FC<SeatCardProps> = ({
  row,
  col,
  positionNumber,
  student,
  mode,
  filter = 'all',
  markState = 'Present', // Default is Present unless explicitly marked Absent!
  onToggleMark,
  onSeatClick,
  onMarkPresent,
  onMarkAbsent,
  wing
}) => {
  // Check if filtered out
  const isFilteredOut = Boolean(
    student && 
    ((filter === 'boys' && student.gender !== 'Male') || 
     (filter === 'girls' && student.gender !== 'Female'))
  );

  // If seat is vacant/empty
  if (!student) {
    if (mode === 'attendance') {
      // Clean, non-distracting vacant cinema chair during attendance roll call
      return (
        <div className="relative flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 min-h-[132px] select-none text-slate-300">
          <Armchair className="w-5 h-5 text-slate-300 mb-1 opacity-70" />
          <span className="text-[11px] font-medium text-slate-400">Vacant Seat</span>
          <span className="text-[10px] font-mono text-slate-400">#{positionNumber} (R{row}:C{col})</span>
        </div>
      );
    }

    // In manage/view mode: Interactive slot to assign a student
    return (
      <div 
        onClick={() => onSeatClick && onSeatClick(row, col)}
        className="relative flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed 
          border-slate-300 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/40 
          transition-all duration-150 min-h-[132px] cursor-pointer group select-none shadow-2xs hover:shadow-xs"
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
        <span className="text-xs font-semibold text-slate-600 group-hover:text-indigo-600">Assign Student</span>
        <span className="text-[10px] text-slate-400">Row {row} · Col {col}</span>
      </div>
    );
  }

  // Attendance states: Default is Present. Only Absent when explicitly marked!
  const isAbsent = markState === 'Absent';
  const isPresent = !isAbsent;

  let attendanceCardStyle = 'border-slate-200 bg-white hover:border-slate-300 shadow-xs';
  if (mode === 'attendance') {
    if (isAbsent) {
      attendanceCardStyle = 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/25 shadow-sm';
    } else {
      attendanceCardStyle = 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20 shadow-sm';
    }
  }

  const wingColor = student.gender === 'Male' ? 'bg-blue-500' : 'bg-pink-500';

  return (
    <div
      onClick={() => {
        if (mode === 'attendance') {
          if (onToggleMark) onToggleMark(student.id);
        } else if (onSeatClick) {
          onSeatClick(row, col, student);
        }
      }}
      className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all duration-150 min-h-[136px] select-none text-left
        ${attendanceCardStyle}
        ${isFilteredOut ? 'opacity-25 grayscale-[60%] pointer-events-none' : 'cursor-pointer hover:-translate-y-0.5'}
      `}
      role="button"
      tabIndex={0}
      aria-label={`Student ${student.student_name}, Seat ${positionNumber}, ${isAbsent ? 'Absent' : 'Present'}`}
    >
      {/* Curved Theatre Seat Headrest Trim */}
      <div className={`absolute top-0 left-3 right-3 h-1.5 rounded-b-md ${
        mode === 'attendance'
          ? isAbsent ? 'bg-rose-500' : 'bg-emerald-500'
          : wingColor
      }`} />

      {/* Header: Seat Position & Status Badge */}
      <div className="flex items-center justify-between gap-1 pt-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold text-slate-800 tabular-nums">
            #{positionNumber}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            R{row}:C{col}
          </span>
        </div>

        {mode === 'attendance' ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isAbsent ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {isAbsent ? <X className="w-3 h-3 stroke-[3]" /> : <Check className="w-3 h-3 stroke-[3]" />}
            {isAbsent ? 'ABSENT' : 'PRESENT'}
          </span>
        ) : (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
            student.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
          }`}>
            {student.gender === 'Male' ? 'Boys' : 'Girls'}
          </span>
        )}
      </div>

      {/* Student Details: Name, Roll Number, Branch */}
      <div className="my-1.5">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug tracking-tight" title={student.student_name}>
          {student.student_name}
        </h4>
        <div className="text-xs font-mono font-semibold text-slate-700 truncate mt-0.5 tabular-nums">
          {student.roll_number}
        </div>
        <div className="text-[11px] text-slate-500 truncate flex items-center justify-between mt-0.5">
          <span>{student.branch}</span>
          <span className="text-[10px] text-slate-400 font-mono">Seat #{positionNumber}</span>
        </div>
      </div>

      {/* Attendance Mode Action: Only mark ABSENT or reset to PRESENT */}
      {mode === 'attendance' ? (
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {isAbsent ? (
            <button
              type="button"
              onClick={() => onMarkPresent && onMarkPresent(student.id)}
              className="w-full py-1.5 px-2 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition-colors shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" /> Re-mark as Present
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMarkAbsent && onMarkAbsent(student.id)}
              className="w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-transparent flex items-center justify-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" /> Mark Absent
            </button>
          )}
        </div>
      ) : (
        <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 font-mono text-[10px]">
            <User className="w-3 h-3 text-slate-400" /> Fixed Seat
          </span>
          <span className="font-semibold text-indigo-600 hover:text-indigo-800">
            Edit Details →
          </span>
        </div>
      )}
    </div>
  );
};
