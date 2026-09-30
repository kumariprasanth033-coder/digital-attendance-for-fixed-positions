import React from 'react';
import { Student, MarkState, AttendanceFilter } from '../../types';
import { Check, X, User, Plus, Edit2, Trash2 } from 'lucide-react';

interface SeatCardProps {
  row: number;
  col: number;
  positionNumber: number;
  student?: Student;
  mode: 'view' | 'manage' | 'attendance';
  filter?: AttendanceFilter;
  markState?: MarkState;
  zoneGender?: 'Male' | 'Female' | null;
  enforceSeatingRule?: boolean;
  onToggleMark?: (studentId: string) => void;
  onSeatClick?: (row: number, col: number, student?: Student) => void;
  onEdit?: (student: Student) => void;
  onDelete?: (student: Student) => void;
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
  markState = 'Present',
  zoneGender,
  enforceSeatingRule,
  onToggleMark,
  onSeatClick,
  onEdit,
  onDelete,
  onMarkPresent,
  onMarkAbsent,
}) => {
  const positionTag = `R${row}-C${col}`;

  // --------------------------------------------------------------------------
  // CASE 1: VACANT SEAT (No student assigned to this position)
  // Preserves exact grid layout without rearrangement
  // --------------------------------------------------------------------------
  if (!student) {
    const isGirlZone = zoneGender === 'Female';
    const isBoyZone = zoneGender === 'Male';

    if (mode === 'attendance') {
      return (
        <div 
          className={`relative flex flex-col items-center justify-center p-3 rounded-2xl border-2 border-dashed min-h-[155px] select-none text-center ${
            isGirlZone
              ? 'border-pink-200/90 bg-pink-50/40 text-pink-700'
              : isBoyZone
              ? 'border-blue-200/90 bg-blue-50/40 text-blue-700'
              : 'border-slate-200/90 bg-slate-50/70 text-slate-400'
          }`}
          title={`Vacant ${isGirlZone ? 'Girls' : isBoyZone ? 'Boys' : ''} Seat ${positionTag}`}
        >
          <div className="text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200 mb-1.5">
            {positionTag}
          </div>
          <span className="text-xs font-bold">
            {isGirlZone ? '👩 GIRLS VACANT' : isBoyZone ? '👨 BOYS VACANT' : 'VACANT SEAT'}
          </span>
          <span className="text-[10px] font-mono text-slate-400 mt-0.5">#{positionNumber}</span>
          <span className="text-[9px] text-slate-400 mt-1">Unassigned</span>
        </div>
      );
    }

    // In manage/view mode: Interactive slot to assign a student
    return (
      <button
        type="button"
        onClick={() => onSeatClick && onSeatClick(row, col)}
        className={`w-full relative flex flex-col items-center justify-center p-3.5 rounded-2xl border-2 border-dashed 
          transition-all duration-150 min-h-[155px] cursor-pointer group select-none shadow-2xs hover:shadow-xs text-left ${
            isGirlZone
              ? 'border-pink-300 hover:border-pink-500 bg-pink-50/30 hover:bg-pink-50/70'
              : isBoyZone
              ? 'border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/70'
              : 'border-slate-300 hover:border-indigo-500 bg-slate-50/80 hover:bg-indigo-50/40'
          }`}
        aria-label={`Vacant Seat ${positionTag} - Click to Assign`}
      >
        <div className="absolute top-2.5 left-2.5 text-[10px] font-mono text-slate-500 font-bold bg-white px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
          {positionTag}
        </div>
        <div className="absolute top-2.5 right-2.5 text-[10px] font-mono text-slate-400">
          #{positionNumber}
        </div>

        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors mb-2 ${
          isGirlZone
            ? 'bg-pink-100 group-hover:bg-pink-200 text-pink-600'
            : isBoyZone
            ? 'bg-blue-100 group-hover:bg-blue-200 text-blue-600'
            : 'bg-slate-200 group-hover:bg-indigo-100 text-slate-500 group-hover:text-indigo-600'
        }`}>
          <Plus className="w-4 h-4" />
        </div>
        <span className={`text-xs font-bold ${
          isGirlZone 
            ? 'text-pink-800 group-hover:text-pink-900' 
            : isBoyZone 
            ? 'text-blue-800 group-hover:text-blue-900' 
            : 'text-slate-700 group-hover:text-indigo-700'
        }`}>
          {isGirlZone ? '👩 GIRLS SEAT' : isBoyZone ? '👨 BOYS SEAT' : 'VACANT SEAT'}
        </span>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1.5 transition-colors ${
          isGirlZone
            ? 'text-pink-700 bg-pink-100 group-hover:bg-pink-200'
            : isBoyZone
            ? 'text-blue-700 bg-blue-100 group-hover:bg-blue-200'
            : 'text-indigo-600 bg-indigo-50/80 group-hover:bg-indigo-100'
        }`}>
          {isGirlZone ? '+ Assign Girl' : isBoyZone ? '+ Assign Boy' : '+ Assign Student'}
        </span>
      </button>
    );
  }

  // --------------------------------------------------------------------------
  // OCCUPIED SEAT: Student is assigned to this fixed coordinate
  // --------------------------------------------------------------------------
  const isMale = student.gender === 'Male';
  const isFemale = student.gender === 'Female';

  // Filter Focus States:
  // When 'boys' is selected, Boys are highlighted and Girls are dimmed (but STILL 100% OPERATIONAL)
  // When 'girls' is selected, Girls are highlighted and Boys are dimmed (but STILL 100% OPERATIONAL)
  // When 'all' is selected, all seats are shown in standard full-color
  const isMatchingFilter = 
    filter === 'all' || 
    (filter === 'boys' && isMale) || 
    (filter === 'girls' && isFemale);

  const isAbsent = markState === 'Absent';
  const isPresent = !isAbsent;

  // Determine card styling based on mode, filter, and attendance
  let cardStyle = 'border-slate-200 bg-white hover:border-slate-300 shadow-xs';
  let accentBarColor = isMale ? 'bg-blue-500' : 'bg-pink-500';

  if (mode === 'attendance') {
    if (isAbsent) {
      cardStyle = 'border-rose-400 bg-rose-50/80 ring-2 ring-rose-500/30 shadow-xs';
      accentBarColor = 'bg-rose-500';
    } else {
      cardStyle = 'border-emerald-400 bg-emerald-50/50 ring-2 ring-emerald-500/25 shadow-xs';
      accentBarColor = 'bg-emerald-500';
    }
  } else {
    // Manage / View mode
    if (filter === 'boys' || isMale) {
      cardStyle = isMale 
        ? 'border-blue-300 bg-blue-50/20 hover:border-blue-400 shadow-xs' 
        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs';
    } else if (filter === 'girls' || isFemale) {
      cardStyle = isFemale 
        ? 'border-pink-300 bg-pink-50/20 hover:border-pink-400 shadow-xs' 
        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs';
    }
  }

  const handleCardClick = () => {
    if (mode === 'attendance') {
      if (onToggleMark) onToggleMark(student.id);
    } else {
      if (onEdit) {
        onEdit(student);
      } else if (onSeatClick) {
        onSeatClick(row, col, student);
      }
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit(student);
    } else if (onSeatClick) {
      onSeatClick(row, col, student);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(student);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className={`relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all duration-150 min-h-[155px] select-none text-left cursor-pointer hover:-translate-y-0.5 ${cardStyle}`}
      role="button"
      tabIndex={0}
      aria-label={`Student ${student.student_name}, Seat ${positionTag}, ${isMale ? 'Boy' : 'Girl'}`}
    >
      {/* Curved Theatre Headrest Accent */}
      <div className={`absolute top-0 left-3 right-3 h-1.5 rounded-b-md ${accentBarColor}`} />

      {/* Top Bar: Position Tag & Status/Gender Badge */}
      <div className="flex items-center justify-between gap-1 pt-1">
        <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
          {positionTag}
        </span>

        {mode === 'attendance' ? (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
            isAbsent ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {isAbsent ? <X className="w-3 h-3 stroke-[3]" /> : <Check className="w-3 h-3 stroke-[3]" />}
            {isAbsent ? 'ABSENT' : 'PRESENT'}
          </span>
        ) : (
          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isMale 
              ? 'bg-blue-100 text-blue-800 border border-blue-200' 
              : 'bg-pink-100 text-pink-800 border border-pink-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isMale ? 'bg-blue-600' : 'bg-pink-600'}`} />
            {isMale ? 'BOY' : 'GIRL'}
          </span>
        )}
      </div>

      {/* Student Details: Name, Roll Number, Branch */}
      <div className="my-1.5">
        <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate leading-snug" title={student.student_name}>
          {student.student_name}
        </h4>
        <div className="text-xs font-mono font-semibold text-slate-700 truncate mt-0.5 tabular-nums">
          {student.roll_number}
        </div>
        {zoneGender && student.gender !== zoneGender && (
          <div className="mt-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-[9px] font-bold flex items-center justify-between">
            <span>⚠️ {student.gender === 'Male' ? 'Boy in Girls Zone' : 'Girl in Boys Zone'}</span>
            {enforceSeatingRule && <span className="text-[8px] bg-amber-200 text-amber-900 px-1 rounded uppercase font-mono">Rule Violation</span>}
          </div>
        )}
        <div className="text-[11px] text-slate-500 truncate flex items-center justify-between mt-0.5">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-medium text-slate-600 truncate">{student.branch}</span>
            {mode === 'attendance' && (
              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                isMale ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
              }`}>
                {isMale ? 'BOY' : 'GIRL'}
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono shrink-0">#{positionNumber}</span>
        </div>
      </div>

      {/* Bottom Action Footer */}
      {mode === 'attendance' ? (
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
          {isAbsent ? (
            <button
              type="button"
              onClick={() => onMarkPresent ? onMarkPresent(student.id) : onToggleMark?.(student.id)}
              className="w-full py-1.5 px-2 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1 transition-colors shadow-2xs cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Re-mark Present
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onMarkAbsent ? onMarkAbsent(student.id) : onToggleMark?.(student.id)}
              className="w-full py-1.5 px-2 rounded-lg text-[11px] font-semibold bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 hover:border-transparent flex items-center justify-center gap-1 transition-all cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Mark Absent
            </button>
          )}
        </div>
      ) : (
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
            <User className="w-3 h-3 text-slate-400" /> Fixed
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleEditClick}
              className="px-2 py-1 rounded-md text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1 transition-colors cursor-pointer"
              title="Edit student details"
            >
              <Edit2 className="w-3 h-3" /> Edit
            </button>

            {onDelete && (
              <button
                type="button"
                onClick={handleDeleteClick}
                className="px-2 py-1 rounded-md text-[11px] font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-1 transition-colors cursor-pointer"
                title="Remove student from seat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
