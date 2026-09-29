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
  Clock
} from 'lucide-react';

export const TakeAttendancePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [loading, setLoading] = useState(true);

  // Attendance state
  const [marks, setMarks] = useState<Record<string, MarkState>>({});
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00:00');
  const [notes, setNotes] = useState('');

  // Confirmation & submit state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSession, setSubmittedSession] = useState<AttendanceSession | null>(null);

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

        // Initialize all students as 'Present' by default (fastest classroom UX: just tap empty seats to mark absent!)
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

  // Toggle cycling: Present -> Absent -> Unmarked -> Present
  const handleToggleMark = (studentId: string) => {
    setMarks(prev => {
      const current = prev[studentId] || 'Unmarked';
      let next: MarkState = 'Present';
      if (current === 'Present') next = 'Absent';
      else if (current === 'Absent') next = 'Unmarked';
      else next = 'Present';
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

  const handleClearAll = () => {
    const updated: Record<string, MarkState> = {};
    students.forEach(s => {
      updated[s.id] = 'Unmarked';
    });
    setMarks(updated);
  };

  // Live Statistics Calculations
  const totalEnrolled = students.length;
  const presentCount = Object.values(marks).filter(v => v === 'Present').length;
  const absentCount = Object.values(marks).filter(v => v === 'Absent').length;
  const unmarkedCount = Object.values(marks).filter(v => v === 'Unmarked').length;
  const percentage = totalEnrolled > 0
    ? Math.round((presentCount / totalEnrolled) * 1000) / 10
    : 0;

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
    } catch (err) {
      console.error('Attendance submission failed:', err);
      alert('Failed to submit attendance.');
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSessionCSV = () => {
    if (!classroom || !submittedSession) return;
    const filename = `${classroom.class_name.replace(/[^a-zA-Z0-9]/g, '_')}_Attendance_${sessionDate}`;
    const headers = ['Roll Number', 'Student Name', 'Branch', 'Gender', 'Seat Number', 'Date', 'Status'];
    const rows = students.map(s => [
      s.roll_number,
      s.student_name,
      s.branch,
      s.gender,
      s.position_number,
      sessionDate,
      marks[s.id] || 'Present'
    ]);
    api.downloadCSV(filename, headers, rows);
  };

  if (loading || !classroom) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Initializing roll-call session...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to={`/faculty/classrooms/${classroom.id}`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Seating Layout
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                Take Attendance
              </h1>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                {classroom.class_name}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Fixed Position Roll-Call: Click any seat to mark absent or present.
            </p>
          </div>

          {!submittedSession && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleMarkAllPresent}
                className="px-3 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark All Present
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                disabled={totalEnrolled === 0}
                className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" /> Submit Attendance
              </button>
            </div>
          )}
        </div>

        {/* Live Statistics Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Total Enrolled
              </span>
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {totalEnrolled}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Fixed Seats</span>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
              <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block">
                Present
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
                {presentCount}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">In Attendance</span>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
              <span className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider block">
                Absent
              </span>
              <span className="text-2xl font-extrabold text-rose-600 font-mono tabular-nums">
                {absentCount}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Unexcused</span>
            </div>

            <div className="pt-2 sm:pt-0 sm:px-3 text-center sm:text-left">
              <span className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider block">
                Unmarked
              </span>
              <span className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
                {unmarkedCount}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Pending Check</span>
            </div>

            <div className="col-span-2 sm:col-span-1 pt-2 sm:pt-0 sm:px-3 text-center sm:text-left bg-indigo-50/50 sm:bg-transparent rounded-xl p-2 sm:p-0">
              <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider block">
                Live Rate
              </span>
              <span className="text-2xl font-extrabold text-indigo-600 font-mono tabular-nums">
                {percentage}%
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Turnout</span>
            </div>
          </div>
        </div>

        {/* Post-submission Success Banner */}
        {submittedSession && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-6 shadow-xs animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    Attendance Session Successfully Saved!
                  </h3>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Session record stored in Supabase with {presentCount} Present, {absentCount} Absent ({percentage}%).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSessionCSV}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Download Session CSV
                </button>
                <Link
                  to="/faculty/attendance"
                  className="px-4 py-2 text-xs font-semibold text-emerald-900 bg-white hover:bg-emerald-100 rounded-xl border border-emerald-200 transition-colors"
                >
                  View History
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Theatre Seating Matrix */}
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
        />

      </main>

      {/* Confirmation Safety Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Submit Classroom Attendance?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Please verify the final attendance breakdown for <strong className="text-slate-800">{classroom.class_name}</strong>:
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Date:</span>
                <span className="font-bold text-slate-900">{sessionDate}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Total Enrolled:</span>
                <span className="font-bold text-slate-900">{totalEnrolled}</span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Present Count:</span>
                <span className="font-bold">{presentCount}</span>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Absent Count:</span>
                <span className="font-bold">{absentCount}</span>
              </div>
              <div className="flex justify-between text-indigo-700 font-bold border-t border-slate-200 pt-1.5">
                <span>Attendance Rate:</span>
                <span>{percentage}%</span>
              </div>
            </div>

            {unmarkedCount > 0 && (
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Note: {unmarkedCount} student(s) remain unmarked and will be recorded as Present.</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitAttendance}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {submitting ? 'Saving to Database...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
