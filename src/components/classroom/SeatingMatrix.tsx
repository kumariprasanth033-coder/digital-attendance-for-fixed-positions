import React from 'react';
import { Classroom, Student, AttendanceFilter, MarkState } from '../../types';
import { SeatCard } from './SeatCard';
import { Users, Monitor, Sparkles, UserCheck, ShieldAlert } from 'lucide-react';

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

  // Separate Boys and Girls
  const boysStudents = students.filter(s => s.gender === 'Male');
  const girlsStudents = students.filter(s => s.gender === 'Female');

  // Build grid matrix indexed by [row][col]
  const studentMap = React.useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach(st => {
      map.set(`${st.row_number}-${st.column_number}`, st);
    });
    return map;
  }, [students]);

  // Determine if dual matrix layout applies (e.g. boys cols + girls cols or split columns)
  const isDualMatrix = classroom.layout_type === 'dual_matrix' || 
    (classroom.boys_columns && classroom.girls_columns) || 
    cols >= 4;

  const boysColCount = classroom.boys_columns || Math.max(1, Math.floor(cols / 2));
  const girlsColCount = classroom.girls_columns || Math.max(1, Math.ceil(cols / 2));
  const boysRowCount = classroom.boys_rows || rows;
  const girlsRowCount = classroom.girls_rows || rows;

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200/80 p-5 md:p-7 shadow-xs">
      {/* Top Filter and View Mode Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              Fixed Theatre Matrix
            </span>
            <span className="text-xs text-slate-500 font-mono font-medium">
              {rows} Rows × {cols} Columns ({classroom.total_positions || (rows * cols)} Total Positions)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {mode === 'attendance'
              ? 'Attendance mode: Every student is Present by default. Tap to mark Absent.'
              : 'Permanent seat positions linked to student roll numbers and branches.'}
          </p>
        </div>

        {/* Filter Tabs */}
        {onFilterChange && (
          <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/70 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => onFilterChange('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sections ({students.length})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('boys')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'boys'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-blue-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Boys Wing ({boysStudents.length})
            </button>
            <button
              type="button"
              onClick={() => onFilterChange('girls')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                filter === 'girls'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-pink-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-pink-400" />
              Girls Wing ({girlsStudents.length})
            </button>
          </div>
        )}
      </div>

      {/* Classroom Theatre Stage / FRONT SMART BOARD Indicator */}
      <div className="my-6 max-w-2xl mx-auto text-center">
        <div className="relative py-3 px-8 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 flex items-center justify-center gap-3">
          <Monitor className="w-4 h-4 text-indigo-400" />
          <span className="text-xs sm:text-sm font-black tracking-widest uppercase font-mono">
            FRONT / SMART BOARD
          </span>
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-center justify-center gap-1 text-[11px] text-slate-400 font-medium mt-1.5">
          <span>↓ Stage Facing Direction / Professor Podium ↓</span>
        </div>
      </div>

      {/* Attendance Mode Banner */}
      {mode === 'attendance' && (
        <div className="mb-6 p-3 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">
              <strong>Quick Roll-Call Rule:</strong> All students are marked <strong>PRESENT</strong> by default. Click <span className="text-rose-600 font-bold">"Mark Absent"</span> only for students who are not in their seat.
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-700 shrink-0 font-bold">
            Live Auto-Tally
          </span>
        </div>
      )}

      {/* DUAL WINGS SEATING ARRANGEMENT (Boys Wing | Central Gangway | Girls Wing) */}
      {isDualMatrix ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
            
            {/* BOYS MATRIX WING */}
            <div className={`p-4 rounded-2xl border-2 border-blue-200/80 bg-blue-50/20 transition-all ${
              filter === 'girls' ? 'opacity-25 pointer-events-none' : ''
            }`}>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    B
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-blue-950 uppercase tracking-wider">
                      Boys Matrix Wing
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {boysRowCount} Rows × {boysColCount} Columns
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-full">
                  {boysStudents.length} Students
                </span>
              </div>

              {/* Boys Seating Grid */}
              <div 
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${boysColCount}, minmax(130px, 1fr))`
                }}
              >
                {Array.from({ length: boysRowCount }).map((_, rIdx) => {
                  const rowNumber = rIdx + 1;
                  return Array.from({ length: boysColCount }).map((__, cIdx) => {
                    const colNumber = cIdx + 1;
                    const positionNumber = (rowNumber - 1) * cols + colNumber;
                    const student = studentMap.get(`${rowNumber}-${colNumber}`);

                    return (
                      <SeatCard
                        key={`b-${rowNumber}-${colNumber}`}
                        row={rowNumber}
                        col={colNumber}
                        positionNumber={positionNumber}
                        student={student}
                        mode={mode}
                        filter={filter}
                        markState={student ? (marks[student.id] || 'Present') : 'Present'}
                        onToggleMark={onToggleMark}
                        onMarkPresent={onMarkPresent}
                        onMarkAbsent={onMarkAbsent}
                        onSeatClick={onSeatClick}
                        wing="boys"
                      />
                    );
                  });
                })}
              </div>
            </div>

            {/* GIRLS MATRIX WING */}
            <div className={`p-4 rounded-2xl border-2 border-pink-200/80 bg-pink-50/20 transition-all ${
              filter === 'boys' ? 'opacity-25 pointer-events-none' : ''
            }`}>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-pink-200/60">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-pink-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                    G
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-pink-950 uppercase tracking-wider">
                      Girls Matrix Wing
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {girlsRowCount} Rows × {girlsColCount} Columns
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold font-mono text-pink-700 bg-pink-100/80 px-2.5 py-0.5 rounded-full">
                  {girlsStudents.length} Students
                </span>
              </div>

              {/* Girls Seating Grid */}
              <div 
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${girlsColCount}, minmax(130px, 1fr))`
                }}
              >
                {Array.from({ length: girlsRowCount }).map((_, rIdx) => {
                  const rowNumber = rIdx + 1;
                  return Array.from({ length: girlsColCount }).map((__, cIdx) => {
                    const colNumber = boysColCount + cIdx + 1;
                    const positionNumber = (rowNumber - 1) * cols + colNumber;
                    const student = studentMap.get(`${rowNumber}-${colNumber}`);

                    return (
                      <SeatCard
                        key={`g-${rowNumber}-${colNumber}`}
                        row={rowNumber}
                        col={colNumber}
                        positionNumber={positionNumber}
                        student={student}
                        mode={mode}
                        filter={filter}
                        markState={student ? (marks[student.id] || 'Present') : 'Present'}
                        onToggleMark={onToggleMark}
                        onMarkPresent={onMarkPresent}
                        onMarkAbsent={onMarkAbsent}
                        onSeatClick={onSeatClick}
                        wing="girls"
                      />
                    );
                  });
                })}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Unified Single Matrix */
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
                    markState={student ? (marks[student.id] || 'Present') : 'Present'}
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
      )}

      {/* Visual Seating Legend */}
      <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-semibold text-slate-800">Legend:</span>
          {mode === 'attendance' ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                <span className="font-medium text-emerald-800">Present (Default)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                <span className="font-medium text-rose-800">Absent (Flagged)</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-500 inline-block" />
                <span>Boys Wing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-pink-500 inline-block" />
                <span>Girls Wing</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md border border-dashed border-slate-400 bg-slate-100 inline-block" />
                <span>Vacant Slot</span>
              </div>
            </>
          )}
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Filled: <strong>{students.length}</strong> / {classroom.total_positions || (rows * cols)} Positions
        </div>
      </div>
    </div>
  );
};
