import React from 'react';
import { Classroom, Student, AttendanceFilter, MarkState } from '../../types';
import { SeatCard } from './SeatCard';
import { Monitor, Sparkles, UserCheck, Plus, Users } from 'lucide-react';

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
  onEditStudent?: (student: Student) => void;
  onDeleteStudent?: (student: Student) => void;
  onAddStudent?: () => void;
  showFilterBar?: boolean;
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
  onEditStudent,
  onDeleteStudent,
  onAddStudent,
  showFilterBar = true,
}) => {
  const rows = classroom.rows || 4;
  const cols = classroom.columns || 4;
  const totalPositions = classroom.total_positions || (rows * cols);

  // Student counts
  const boysStudents = students.filter(s => s.gender === 'Male');
  const girlsStudents = students.filter(s => s.gender === 'Female');
  const vacantCount = Math.max(0, totalPositions - students.length);

  // Fast mapping of students by fixed "row-col" coordinate
  const studentMap = React.useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(st => {
      map.set(`${st.row_number}-${st.column_number}`, st);
    });
    return map;
  }, [students]);

  return (
    <div className="w-full bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-7 shadow-xs space-y-6">
      
      {/* Top Filter Bar: ALL STUDENTS | BOYS | GIRLS */}
      {showFilterBar && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Auditorium Cinema Grid
              </span>
              <span className="text-xs text-slate-500 font-mono font-medium">
                {rows} Rows × {cols} Columns ({totalPositions} Positions)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {mode === 'attendance'
                ? 'Roll-call active: Tap any seat to toggle Present / Absent. Layout coordinates are fixed.'
                : 'Click any occupied seat to edit or delete, or click any vacant seat to assign a new student.'}
            </p>
          </div>

          {/* Filter Controls: All | Boys | Girls */}
          <div className="flex flex-wrap items-center gap-2">
            {onFilterChange && (
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => onFilterChange('all')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ALL ({students.length})
                </button>

                <button
                  type="button"
                  onClick={() => onFilterChange('boys')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    filter === 'boys'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${filter === 'boys' ? 'bg-blue-300' : 'bg-blue-500'}`} />
                  BOYS ({boysStudents.length})
                </button>

                <button
                  type="button"
                  onClick={() => onFilterChange('girls')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                    filter === 'girls'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-pink-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${filter === 'girls' ? 'bg-pink-300' : 'bg-pink-500'}`} />
                  GIRLS ({girlsStudents.length})
                </button>
              </div>
            )}

            {mode === 'manage' && onAddStudent && (
              <button
                type="button"
                onClick={onAddStudent}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Student</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Cinema / Theatre Screen: FRONT / SMART BOARD */}
      <div className="max-w-2xl mx-auto text-center my-4">
        <div className="relative py-3 px-8 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-slate-800 flex items-center justify-center gap-3">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span className="text-xs sm:text-sm font-black tracking-widest uppercase font-mono">
            FRONT / SMART BOARD
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="text-[11px] text-slate-400 font-medium mt-1.5">
          ↓ Stage Facing Direction / Professor Podium ↓
        </div>
      </div>

      {/* Attendance Mode Banner */}
      {mode === 'attendance' && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              <strong>Roll-Call Status:</strong> Every student is marked <strong>PRESENT</strong> by default. Click <strong className="text-rose-600 font-bold">"Mark Absent"</strong> only for absent students.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 shrink-0 font-bold bg-white px-2 py-0.5 rounded border border-emerald-200">
            Default: Present
          </span>
        </div>
      )}

      {/* Unified Cinema Seating Grid: R1, R2, R3, R4... (Fixed Grid Architecture) */}
      <div className="overflow-x-auto pb-3">
        <div 
          className="space-y-4"
          style={{ minWidth: `${Math.max(620, cols * 170)}px` }}
        >
          {Array.from({ length: rows }, (_, rowIdx) => {
            const r = rowIdx + 1;
            return (
              <div key={`row-${r}`} className="flex items-center gap-3">
                {/* Row Label (Left) */}
                <div className="w-10 sm:w-12 shrink-0 text-center">
                  <span className="inline-block px-2 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-bold text-xs border border-slate-200 shadow-2xs">
                    R{r}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5 font-medium">Row {r}</span>
                </div>

                {/* Row Seats Grid */}
                <div 
                  className="flex-1 grid gap-3"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
                  }}
                >
                  {Array.from({ length: cols }, (_, colIdx) => {
                    const c = colIdx + 1;
                    const key = `${r}-${c}`;
                    const student = studentMap.get(key);
                    const posNum = (r - 1) * cols + c;

                    return (
                      <SeatCard
                        key={key}
                        row={r}
                        col={c}
                        positionNumber={posNum}
                        student={student}
                        mode={mode}
                        filter={filter}
                        markState={student ? (marks[student.id] || 'Present') : undefined}
                        onToggleMark={onToggleMark}
                        onMarkPresent={onMarkPresent}
                        onMarkAbsent={onMarkAbsent}
                        onSeatClick={onSeatClick}
                        onEdit={onEditStudent}
                        onDelete={onDeleteStudent}
                      />
                    );
                  })}
                </div>

                {/* Row Label (Right) */}
                <div className="w-8 shrink-0 text-center hidden md:block">
                  <span className="inline-block px-2 py-1 rounded-lg bg-slate-100 text-slate-500 font-mono font-bold text-xs border border-slate-200">
                    R{r}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cinema Seating Legend & Statistics */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Boys ({boysStudents.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-pink-500" />
            <span>Girls ({girlsStudents.length})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-md border-2 border-dashed border-slate-300 bg-slate-50" />
            <span>Vacant ({vacantCount})</span>
          </div>
          {mode === 'attendance' && (
            <>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className="text-emerald-700 font-semibold">Present</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <span className="text-rose-700 font-semibold">Absent</span>
              </div>
            </>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Single Grid Architecture · Fixed Seat Coordinates Preserved
        </div>
      </div>

    </div>
  );
};
