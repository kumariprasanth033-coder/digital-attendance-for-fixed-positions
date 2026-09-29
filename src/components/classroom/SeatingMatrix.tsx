import React from 'react';
import { Classroom, Student, AttendanceFilter, MarkState } from '../../types';
import { SeatCard } from './SeatCard';
import { Users, Monitor, Sparkles } from 'lucide-react';

interface SeatingMatrixProps {
  classroom: Classroom;
  students: Student[];
  mode: 'view' | 'manage' | 'attendance';
  filter?: AttendanceFilter;
  onFilterChange?: (filter: AttendanceFilter) => void;
  marks?: Record<string, MarkState>;
  onToggleMark?: (studentId: string) => void;
  onMarkPresent?: (studentId: string) => void;
  onMarkAbsent?: (studentId: string) => void;
  onSeatClick?: (row: number, col: number, student?: Student) => void;
}

export const SeatingMatrix: React.FC<SeatingMatrixProps> = ({
  classroom,
  students,
  mode,
  filter = 'all',
  onFilterChange,
  marks = {},
  onToggleMark,
  onMarkPresent,
  onMarkAbsent,
  onSeatClick,
}) => {
  const rows = classroom.rows || 4;
  const cols = classroom.columns || 4;

  // Build grid matrix indexed by [row][col]
  const studentMap = React.useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(st => {
      map.set(`${st.row_number}-${st.column_number}`, st);
    });
    return map;
  }, [students]);

  // Count boys & girls
  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-5 md:p-7 shadow-xs">
      {/* Top Filter and View Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Auditorium Matrix
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {rows} Rows × {cols} Columns ({rows * cols} Total Seats)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fixed seating positions permanently linked to enrolled students.
          </p>
        </div>

        {/* Boys / Girls / All Filter Tabs */}
        {onFilterChange && (
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/60 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Students ({students.length})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('boys')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === 'boys'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              Boys Side ({maleCount})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('girls')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                filter === 'girls'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              Girls Side ({femaleCount})
            </button>
          </div>
        )}
      </div>

      {/* Classroom Theatre Stage / FRONT BOARD Indicator */}
      <div className="my-6 max-w-xl mx-auto text-center">
        <div className="relative py-2.5 px-6 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl shadow-md border border-slate-800 flex items-center justify-center gap-3">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold tracking-widest uppercase">
            FRONT / SMART BOARD
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium mt-1.5">
          <span>↓ Stage Facing Direction ↓</span>
        </div>
      </div>

      {/* Seating Grid Container (Horizontally Scrollable if wide) */}
      <div className="overflow-x-auto pb-4 pt-1">
        <div 
          className="grid gap-3.5 mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))`,
            minWidth: `${cols * 150}px`
          }}
        >
          {Array.from({ length: rows }).map((_, rIdx) => {
            const rowNumber = rIdx + 1;
            return Array.from({ length: cols }).map((__, cIdx) => {
              const colNumber = cIdx + 1;
              const positionNumber = (rowNumber - 1) * cols + colNumber;
              const student = studentMap.get(`${rowNumber}-${colNumber}`);

              return (
                <SeatCard
                  key={`${rowNumber}-${colNumber}`}
                  row={rowNumber}
                  col={colNumber}
                  positionNumber={positionNumber}
                  student={student}
                  mode={mode}
                  filter={filter}
                  markState={student ? marks[student.id] || 'Unmarked' : 'Unmarked'}
                  onToggleMark={onToggleMark}
                  onMarkPresent={onMarkPresent}
                  onMarkAbsent={onMarkAbsent}
                  onSeatClick={onSeatClick}
                />
              );
            });
          })}
        </div>
      </div>

      {/* Visual Seating Legend */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-800">Legend:</span>
          {mode === 'attendance' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span>Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
                <span>Unmarked</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-400 inline-block" />
                <span>Male Student</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-pink-400 inline-block" />
                <span>Female Student</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md border border-dashed border-slate-400 bg-slate-100 inline-block" />
                <span>Vacant Seat</span>
              </div>
            </>
          )}
        </div>

        <div className="text-[11px] text-slate-400 font-mono">
          Filled: {students.length} / {rows * cols} Positions ({Math.round((students.length / (rows * cols)) * 100)}% Capacity)
        </div>
      </div>
    </div>
  );
};
