import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Classroom, Student, AttendanceFilter, MarkState, AttendanceSession } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/common/Navbar';
import { SeatingMatrix } from '../../components/classroom/SeatingMatrix';
import { 
  ArrowLeft, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Save, 
  Download, 
  CheckCheck, 
  RotateCcw,
  Sparkles,
  Calendar,
  Clock,
  Printer,
  FileSpreadsheet,
  Building,
  User,
  Check,
  X,
  Upload
} from 'lucide-react';
import { BulkImportModal } from '../../components/classroom/BulkImportModal';

export const TakeAttendancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [loading, setLoading] = useState(true);

  // Attendance state: Default is 'Present' for all students
  const [marks, setMarks] = useState<Record<string, MarkState>>({});
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00:00');
  const [notes, setNotes] = useState('');

  // Confirmation & report state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedSession, setSubmittedSession] = useState<AttendanceSession | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const handleImportComplete = async () => {
    if (!id) return;
    try {
      const cls = await api.getClassroomById(id);
      if (cls) setClassroom(cls);
      const stList = await api.getStudentsByClassroom(id);
      setStudents(stList);
      setMarks(prev => {
        const updated = { ...prev };
        stList.forEach(s => {
          if (!updated[s.id]) {
            updated[s.id] = 'Present';
          }
        });
        return updated;
      });
    } catch (err) {
      console.error('Failed to refresh after import:', err);
    }
  };

  useEffect(() => {
    const init = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const cls = await api.getClassroomById(id);
        if (!cls) {
          navigate('/faculty/classrooms');
          return;
        }
        setClassroom(cls);

        const stList = await api.getStudentsByClassroom(id);
        setStudents(stList);

        // Core Rule: All enrolled students are PRESENT by default!
        // Faculty only taps to mark ABSENT!
        const initialMarks: Record<string, MarkState> = {};
        stList.forEach(s => {
          initialMarks[s.id] = 'Present';
        });
        setMarks(initialMarks);

        // Set live current time
        const now = new Date();
        setStartTime(now.toTimeString().split(' ')[0]);
      } catch (err) {
        console.error('Failed to init attendance page:', err);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id]);

  // Toggle rule: If Present -> Absent. If Absent -> Present.
  const handleToggleMark = (studentId: string) => {
    setMarks(prev => {
      const current = prev[studentId] || 'Present';
      const next: MarkState = current === 'Present' ? 'Absent' : 'Present';
      return { ...prev, [studentId]: next };
    });
  };

  const handleMarkPresent = (studentId: string) => {
    setMarks(prev => ({ ...prev, [studentId]: 'Present' }));
  };

  const handleMarkAbsent = (studentId: string) => {
    setMarks(prev => ({ ...prev, [studentId]: 'Absent' }));
  };

  const handleMarkAllPresent = () => {
    const updated: Record<string, MarkState> = {};
    students.forEach(s => {
      updated[s.id] = 'Present';
    });
    setMarks(updated);
  };

  const handleMarkVisiblePresent = () => {
    setMarks(prev => {
      const updated = { ...prev };
      students.forEach(s => {
        if (filter === 'boys' && s.gender !== 'Male') return;
        if (filter === 'girls' && s.gender !== 'Female') return;
        updated[s.id] = 'Present';
      });
      return updated;
    });
  };

  const handleMarkVisibleAbsent = () => {
    setMarks(prev => {
      const updated = { ...prev };
      students.forEach(s => {
        if (filter === 'boys' && s.gender !== 'Male') return;
        if (filter === 'girls' && s.gender !== 'Female') return;
        updated[s.id] = 'Absent';
      });
      return updated;
    });
  };

  const handleClearAllAbsents = () => {
    handleMarkAllPresent();
  };

  // Live Statistics Calculations
  const totalEnrolled = students.length;
  const presentCount = Object.values(marks).filter(v => v === 'Present').length;
  const absentCount = Object.values(marks).filter(v => v === 'Absent').length;
  const percentage = totalEnrolled > 0
    ? Math.round((presentCount / totalEnrolled) * 1000) / 10
    : 100;

  // Boys vs Girls Breakdown
  const boysStudents = students.filter(s => s.gender === 'Male');
  const girlsStudents = students.filter(s => s.gender === 'Female');

  const boysPresent = boysStudents.filter(s => (marks[s.id] || 'Present') === 'Present').length;
  const boysAbsent = boysStudents.length - boysPresent;
  const boysPercentage = boysStudents.length > 0 
    ? Math.round((boysPresent / boysStudents.length) * 1000) / 10 
    : 100;

  const girlsPresent = girlsStudents.filter(s => (marks[s.id] || 'Present') === 'Present').length;
  const girlsAbsent = girlsStudents.length - girlsPresent;
  const girlsPercentage = girlsStudents.length > 0 
    ? Math.round((girlsPresent / girlsStudents.length) * 1000) / 10 
    : 100;

  const handleSubmitAttendance = async () => {
    if (!classroom || !user) return;
    try {
      setSubmitting(true);
      const session = await api.submitAttendanceSession({
        classroom_id: classroom.id,
        faculty_id: user.id,
        attendance_date: sessionDate,
        start_time: startTime,
        notes: notes.trim() || undefined,
        marks
      });
      setSubmittedSession(session);
      setShowConfirmModal(false);
      setShowReportModal(true);
    } catch (err: unknown) {
      console.error('Attendance submission failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to submit attendance.';
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSessionCSV = () => {
    if (!classroom) return;
    const cleanClassName = classroom.class_name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanClassName}_Attendance_Report_${sessionDate}`;

    const headers = [
      'S.No',
      'Position',
      'Row',
      'Column',
      'Roll Number',
      'Student Name',
      'Branch',
      'Gender',
      'Attendance Date',
      'Status'
    ];

    const rows = students.map((s, idx) => [
      idx + 1,
      `R${s.row_number}-C${s.column_number}`,
      s.row_number,
      s.column_number,
      s.roll_number,
      s.student_name,
      s.branch,
      s.gender,
      sessionDate,
      marks[s.id] === 'Absent' ? 'ABSENT' : 'PRESENT'
    ]);

    api.downloadCSV(filename, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading || !classroom) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Initializing live auditorium roll-call session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Error Alert Banner */}
        {submitError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center justify-between gap-2.5">
            <span>{submitError}</span>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 rounded-lg hover:bg-rose-100 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to={`/faculty/classrooms/${classroom.id}`}
              className="text-xs font-semibold text-slate-500 hover:text-indigo-600 inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Seating Arrangement Window
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                Live Attendance Window
              </h1>
              <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3 py-0.5 rounded-full">
                {classroom.class_name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Auditorium Roll-Call: Every enrolled student is <strong>PRESENT by default</strong>. Simply tap any empty seat to flag that student as <strong>ABSENT</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setBulkImportOpen(true)}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-600" /> Upload CSV / Excel
            </button>
            <button
              type="button"
              onClick={handleMarkAllPresent}
              className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Reset All to Present
            </button>
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              disabled={totalEnrolled === 0}
              className="px-5 py-2.5 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> Finalize & Submit Attendance
            </button>
          </div>
        </div>

        {/* Live Attendance Statistics Bar - Dynamic Category / All Dashboard */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          {filter === 'boys' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Boys Total
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {boysStudents.length}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Enrolled Boys</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Boys Present
                </span>
                <span className="text-2xl font-black text-emerald-600 font-mono tabular-nums">
                  {boysPresent}
                </span>
                <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">In Seats</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                  Boys Absent
                </span>
                <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">
                  {boysAbsent}
                </span>
                <span className="text-[10px] text-rose-500 font-medium block mt-0.5">Flagged Absent</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Boys Attendance %
                </span>
                <span className="text-2xl font-black text-indigo-700 font-mono tabular-nums">
                  {boysPercentage}%
                </span>
                <span className="text-[10px] text-indigo-500 font-medium block mt-0.5">Turnout Rate</span>
              </div>
            </div>
          ) : filter === 'girls' ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider block">
                  Girls Total
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {girlsStudents.length}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Enrolled Girls</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Girls Present
                </span>
                <span className="text-2xl font-black text-emerald-600 font-mono tabular-nums">
                  {girlsPresent}
                </span>
                <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">In Seats</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                  Girls Absent
                </span>
                <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">
                  {girlsAbsent}
                </span>
                <span className="text-[10px] text-rose-500 font-medium block mt-0.5">Flagged Absent</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Girls Attendance %
                </span>
                <span className="text-2xl font-black text-indigo-700 font-mono tabular-nums">
                  {girlsPercentage}%
                </span>
                <span className="text-[10px] text-indigo-500 font-medium block mt-0.5">Turnout Rate</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Total Enrolled
                </span>
                <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">
                  {totalEnrolled}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Fixed Seats</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                  Present (Default)
                </span>
                <span className="text-2xl font-black text-emerald-600 font-mono tabular-nums">
                  {presentCount}
                </span>
                <span className="text-[10px] text-emerald-500 font-medium block mt-0.5">In Seats</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider block">
                  Absent (Flagged)
                </span>
                <span className="text-2xl font-black text-rose-600 font-mono tabular-nums">
                  {absentCount}
                </span>
                <span className="text-[10px] text-rose-500 font-medium block mt-0.5">Unexcused</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Boys Present
                </span>
                <span className="text-lg font-black text-blue-700 font-mono tabular-nums">
                  {boysPresent} <span className="text-xs text-slate-400 font-normal">/ {boysStudents.length}</span>
                </span>
                <span className="text-[10px] text-blue-600 block mt-0.5">{boysPercentage}% Present</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-pink-700 uppercase tracking-wider block">
                  Girls Present
                </span>
                <span className="text-lg font-black text-pink-700 font-mono tabular-nums">
                  {girlsPresent} <span className="text-xs text-slate-400 font-normal">/ {girlsStudents.length}</span>
                </span>
                <span className="text-[10px] text-pink-600 block mt-0.5">{girlsPercentage}% Present</span>
              </div>

              <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
                <span className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider block">
                  Total Turnout
                </span>
                <span className="text-2xl font-black text-indigo-700 font-mono tabular-nums">
                  {percentage}%
                </span>
                <span className="text-[10px] text-indigo-500 font-medium block mt-0.5">Class Average</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Batch Attendance Controls & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 mr-1">Select View:</span>
            <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                ALL ({totalEnrolled})
              </button>
              <button
                type="button"
                onClick={() => setFilter('boys')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
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
                onClick={() => setFilter('girls')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                  filter === 'girls'
                    ? 'bg-pink-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-pink-700'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${filter === 'girls' ? 'bg-pink-300' : 'bg-pink-500'}`} />
                GIRLS ({girlsStudents.length})
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleMarkVisiblePresent}
              className="px-3.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mark {filter === 'all' ? 'All' : filter === 'boys' ? 'Boys' : 'Girls'} Present</span>
            </button>
            <button
              type="button"
              onClick={handleMarkVisibleAbsent}
              className="px-3.5 py-1.5 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <X className="w-3.5 h-3.5 text-rose-600" />
              <span>Mark {filter === 'all' ? 'All' : filter === 'boys' ? 'Boys' : 'Girls'} Absent</span>
            </button>
          </div>
        </div>

        {/* Live Seating Matrix in Attendance Mode */}
        <SeatingMatrix
          classroom={classroom}
          students={students}
          mode="attendance"
          filter={filter}
          onFilterChange={setFilter}
          marks={marks}
          onToggleMark={handleToggleMark}
          onMarkPresent={handleMarkPresent}
          onMarkAbsent={handleMarkAbsent}
          showFilterBar={false}
        />

      </main>

      {/* Confirmation Safeguard Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Confirm & Submit Attendance?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please verify the final roll-call breakdown for <strong className="text-slate-800">{classroom.class_name}</strong>:
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Classroom Section:</span>
                <span className="font-bold text-slate-900">{classroom.class_name}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Session Date:</span>
                <span className="font-bold text-slate-900">{sessionDate} ({startTime})</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Enrolled:</span>
                <span className="font-bold text-slate-900">{totalEnrolled} Students</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Total Present:</span>
                <span className="font-bold">{presentCount}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Total Absent:</span>
                <span className="font-bold">{absentCount}</span>
              </div>
              <div className="flex justify-between text-indigo-700 font-bold border-t border-slate-200 pt-1.5">
                <span>Turnout Rate:</span>
                <span>{percentage}%</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={submitting}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? 'Submitting...' : 'Confirm & Save Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FINAL REPORT GENERATION MODAL / WINDOW */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full my-auto shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Action Bar (Top) */}
            <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                  Official Attendance Roll-Call Report Generated
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 rounded-lg text-white flex items-center gap-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Report
                </button>
                <button
                  type="button"
                  onClick={downloadSessionCSV}
                  className="px-3.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Download CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Report Body */}
            <div className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6" id="printable-report">
              
              {/* Institutional Header */}
              <div className="text-center pb-5 border-b-2 border-slate-900 space-y-1">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Department of Computer Science & Engineering / Artificial Intelligence & Data Science
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight font-display">
                  Digital Attendance System for Fixed Positions
                </h2>
                <div className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-mono font-bold">
                  OFFICIAL CLASSROOM ATTENDANCE ROLL-CALL RECORD
                </div>
              </div>

              {/* Classroom Details Box */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Course Section</span>
                    <span className="font-bold text-slate-900 text-sm">{classroom.class_name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Faculty In-Charge</span>
                    <span className="font-bold text-slate-900">{profile?.full_name || 'Dr. Ramesh Kumar'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Date & Time</span>
                    <span className="font-bold text-slate-900 font-mono">{sessionDate} · {startTime}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Matrix Capacity</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {classroom.rows}R × {classroom.columns}C ({classroom.total_positions || (classroom.rows * classroom.columns)} Seats)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3 pt-3 border-t border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Enrolled</span>
                    <span className="font-bold text-slate-900 font-mono">{totalEnrolled} Students</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">Present</span>
                    <span className="font-bold text-emerald-700 font-mono">{presentCount} Students</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-600 uppercase block">Absent</span>
                    <span className="font-bold text-rose-700 font-mono">{absentCount} Students</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 uppercase block">Turnout Rate</span>
                    <span className="font-black text-indigo-700 font-mono text-sm">{percentage}%</span>
                  </div>
                </div>
              </div>

              {/* Table Format Student Attendance */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Student Roll-Call Register (Fixed Positions)
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] border-b border-slate-200">
                        <th className="py-2.5 px-3">S.No</th>
                        <th className="py-2.5 px-3">Position</th>
                        <th className="py-2.5 px-3">Roll Number</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3 text-right">Attendance Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {students.map((st, idx) => {
                        const isStudentAbsent = marks[st.id] === 'Absent';
                        const posTag = `R${st.row_number}-C${st.column_number}`;
                        return (
                          <tr key={st.id} className={isStudentAbsent ? 'bg-rose-50/40' : 'hover:bg-slate-50/50'}>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                              <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                                {posTag}
                              </span>
                              <span className="text-slate-400 font-normal ml-1">#{st.position_number}</span>
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{st.roll_number}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{st.student_name}</td>
                            <td className="py-2.5 px-3 text-slate-600">{st.branch}</td>
                            <td className="py-2.5 px-3">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                st.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                              }`}>
                                {st.gender === 'Male' ? 'Male' : 'Female'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                isStudentAbsent
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-emerald-600 text-white'
                              }`}>
                                {isStudentAbsent ? 'ABSENT' : 'PRESENT'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Institutional Sign-off Footer */}
              <div className="pt-8 flex items-center justify-between text-xs text-slate-400 border-t border-slate-200">
                <div>
                  Generated on {new Date().toLocaleString()} · System Verified
                </div>
                <div className="text-right">
                  <div className="h-8 border-b border-slate-300 w-40 ml-auto mb-1" />
                  <span className="font-semibold text-slate-700">Faculty Signature</span>
                </div>
              </div>

            </div>

            {/* Bottom Modal Actions */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Link
                to="/faculty/attendance"
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors"
              >
                Go to Attendance History
              </Link>
              <button
                type="button"
                onClick={() => setShowReportModal(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {classroom && (
        <BulkImportModal
          isOpen={bulkImportOpen}
          onClose={() => setBulkImportOpen(false)}
          classroom={classroom}
          existingStudents={students}
          onImportComplete={handleImportComplete}
          onExpandClassroom={async (newRows, newCols) => {
            await api.updateClassroom(classroom.id, { rows: newRows, columns: newCols, total_positions: newRows * newCols });
            const updated = await api.getClassroomById(classroom.id);
            if (updated) setClassroom(updated);
          }}
        />
      )}

    </div>
  );
};
