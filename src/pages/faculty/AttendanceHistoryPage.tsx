import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { AttendanceSession, AttendanceRecord, Classroom } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { 
  Calendar, 
  Filter, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  X, 
  Search,
  LayoutGrid,
  FileSpreadsheet
} from 'lucide-react';

export const AttendanceHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const querySessionId = searchParams.get('sessionId');

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Detail Modal
  const [activeSession, setActiveSession] = useState<AttendanceSession | null>(null);
  const [activeRecords, setActiveRecords] = useState<AttendanceRecord[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [clsList, sessList] = await Promise.all([
        api.getClassrooms(user.id),
        api.getAttendanceSessions({ faculty_id: user.id })
      ]);
      setClassrooms(clsList);
      setSessions(sessList);

      if (querySessionId) {
        const target = sessList.find(s => s.id === querySessionId);
        if (target) {
          openSessionDetail(target);
        }
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    const unsubscribe = api.subscribeToUpdates((event) => {
      if (event.type === 'ATTENDANCE_SUBMITTED' || event.type === 'CLASSROOM_CREATED' || event.type === 'CLASSROOM_DELETED') {
        loadData();
      }
    });
    return unsubscribe;
  }, [user]);

  const openSessionDetail = async (session: AttendanceSession) => {
    setActiveSession(session);
    try {
      setModalLoading(true);
      const records = await api.getSessionRecords(session.id);
      setActiveRecords(records);
    } catch (err) {
      console.error('Failed to load session records:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDownloadSessionCSV = (session: AttendanceSession, records: AttendanceRecord[]) => {
    const filename = `${session.class_name?.replace(/[^a-zA-Z0-9]/g, '_')}_Attendance_${session.attendance_date}`;
    const headers = ['Position', 'Row', 'Col', 'Roll Number', 'Student Name', 'Branch', 'Gender', 'Status', 'Marked At'];
    const rows = records.map(r => [
      `R${r.row_number}-C${r.column_number}`,
      r.row_number || '',
      r.column_number || '',
      r.roll_number || '',
      r.student_name || '',
      r.branch || '',
      r.gender || '',
      r.status,
      r.marked_at
    ]);
    api.downloadCSV(filename, headers, rows);
  };

  // Filter sessions
  const filteredSessions = sessions.filter(s => {
    if (selectedClassroomId !== 'all' && s.classroom_id !== selectedClassroomId) return false;
    if (selectedDate && s.attendance_date !== selectedDate) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Audit Trail
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
              Attendance History
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review completed sessions, verify records, and export certified CSV spreadsheets.
            </p>
          </div>

          <Link
            to="/faculty/reports"
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-auto"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Combined Aggregate Report
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Filters:</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedClassroomId}
              onChange={e => setSelectedClassroomId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            >
              <option value="all">All Classrooms ({classrooms.length})</option>
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.rows}x{c.columns})
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[170px]">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            />
          </div>

          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Clear Date
            </button>
          )}
        </div>

        {/* Sessions Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredSessions.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No attendance records match your filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Classroom</th>
                    <th className="py-3 px-4 text-right">Students</th>
                    <th className="py-3 px-4 text-right">Present</th>
                    <th className="py-3 px-4 text-right">Absent</th>
                    <th className="py-3 px-4 text-right">Turnout %</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredSessions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-800 tabular-nums">
                        <div>{s.attendance_date}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{s.start_time}</div>
                      </td>
                      <td className="py-3.5 px-4 font-sans font-medium text-slate-800">
                        {s.class_name}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-slate-600">
                        {s.total_students}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-emerald-600 font-bold">
                        {s.present_count}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums text-rose-600 font-bold">
                        {s.absent_count}
                      </td>
                      <td className="py-3.5 px-4 text-right tabular-nums">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          (s.attendance_percentage || 0) >= 85
                            ? 'bg-emerald-50 text-emerald-700'
                            : (s.attendance_percentage || 0) >= 70
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}>
                          {s.attendance_percentage}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-sans">
                        <button
                          onClick={() => openSessionDetail(s)}
                          className="px-2.5 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Session Details Modal */}
      {activeSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeSession.class_name} · {activeSession.attendance_date}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  Recorded at {activeSession.start_time} · {activeSession.present_count} Present, {activeSession.absent_count} Absent ({activeSession.attendance_percentage}%)
                </p>
              </div>
              <button
                onClick={() => setActiveSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {modalLoading ? (
                <div className="text-center py-8 text-xs text-slate-400">Loading student records...</div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Seat #</th>
                        <th className="py-2.5 px-3">Position</th>
                        <th className="py-2.5 px-3">Roll Number</th>
                        <th className="py-2.5 px-3">Student Name</th>
                        <th className="py-2.5 px-3">Branch</th>
                        <th className="py-2.5 px-3">Gender</th>
                        <th className="py-2.5 px-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {activeRecords.map(r => (
                        <tr key={r.id} className="hover:bg-slate-50/60">
                          <td className="py-2 px-3 font-bold text-slate-700 tabular-nums">
                            #{r.position_number}
                          </td>
                          <td className="py-2 px-3 text-slate-500">
                            R{r.row_number}:C{r.column_number}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900">
                            {r.roll_number}
                          </td>
                          <td className="py-2 px-3 font-sans font-medium text-slate-800">
                            {r.student_name}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {r.branch}
                          </td>
                          <td className="py-2 px-3 font-sans text-slate-600">
                            {r.gender}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                              r.status === 'Present'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}>
                              {r.status === 'Present' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {r.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleDownloadSessionCSV(activeSession, activeRecords)}
                disabled={activeRecords.length === 0}
                className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Session CSV
              </button>

              <button
                type="button"
                onClick={() => setActiveSession(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
