import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Classroom, AttendanceSession, Student } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { CreateClassroomModal } from '../../components/classroom/CreateClassroomModal';
import { AttendanceDoughnut } from '../../components/charts/AttendanceDoughnut';
import { AttendanceBarChart } from '../../components/charts/AttendanceBarChart';
import { 
  Users, 
  LayoutGrid, 
  CalendarCheck, 
  UserCheck, 
  UserX, 
  Plus, 
  ArrowRight, 
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ExternalLink,
  Sparkles
} from 'lucide-react';

export const FacultyDashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

      // Collect total enrolled students
      let totalSt: Student[] = [];
      for (const c of clsList) {
        const cStudents = await api.getStudentsByClassroom(c.id);
        totalSt = [...totalSt, ...cStudents];
      }
      setStudents(totalSt);
    } catch (err) {
      console.error('Failed to load faculty dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleCreateClassroom = async (data: { class_name: string; rows: number; columns: number }) => {
    if (!user) return;
    await api.createClassroom({
      faculty_id: user.id,
      ...data
    });
    await loadData();
  };

  // Aggregated Stats
  const totalClassrooms = classrooms.length;
  const totalStudents = students.length;
  const totalSessions = sessions.length;

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.attendance_date === todayStr);

  const totalPresentToday = todaySessions.reduce((acc, s) => acc + (s.present_count || 0), 0);
  const totalAbsentToday = todaySessions.reduce((acc, s) => acc + (s.absent_count || 0), 0);

  // Overall Present vs Absent for Doughnut
  const allPresent = sessions.reduce((acc, s) => acc + (s.present_count || 0), 0);
  const allAbsent = sessions.reduce((acc, s) => acc + (s.absent_count || 0), 0);

  // Bar Chart Data (Last 5 Sessions)
  const barChartData = sessions.slice(0, 5).reverse().map(s => ({
    label: s.attendance_date.slice(5),
    percentage: s.attendance_percentage || 0,
    present: s.present_count || 0,
    total: s.total_students || 0
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Welcome Banner & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Faculty Portal
              </span>
              <span className="text-xs text-slate-400 font-mono">Academic Year 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
              Welcome back, {profile?.full_name || 'Professor'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage fixed theatre seating grids, conduct live roll-call sessions, and monitor attendance metrics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Classroom
            </button>

            {classrooms.length > 0 && (
              <Link
                to={`/faculty/classrooms/${classrooms[0].id}/attendance`}
                className="px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <CalendarCheck className="w-3.5 h-3.5" /> Take Attendance
              </Link>
            )}

            <Link
              to="/faculty/reports"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Download Report
            </Link>
          </div>
        </div>

        {/* Dashboard 6 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
          
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Total Classrooms</span>
              <LayoutGrid className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalClassrooms}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Configured rooms</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Total Students</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalStudents}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Fixed assigned seats</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Sessions Held</span>
              <CalendarCheck className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {totalSessions}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Recorded roll-calls</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Today's Sessions</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {todaySessions.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">{todayStr}</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Present Today</span>
              <UserCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
              {totalPresentToday}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Marked present</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Absent Today</span>
              <UserX className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-extrabold text-rose-600 font-mono tabular-nums">
              {totalAbsentToday}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Marked absent</span>
          </div>

        </div>

        {/* Visual Analytics Grid: Doughnut & Bar Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Attendance Ratio</h3>
              <p className="text-xs text-slate-500">Cumulative Present vs Absent breakdown</p>
            </div>
            <AttendanceDoughnut present={allPresent || 14} absent={allAbsent || 2} />
          </div>

          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Attendance Progression by Session</h3>
                <p className="text-xs text-slate-500">Live rate (%) across recent classroom roll-calls</p>
              </div>
              <Link to="/faculty/attendance" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <AttendanceBarChart data={barChartData} />
          </div>
        </div>

        {/* My Classrooms Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">My Classrooms</h2>
              <p className="text-xs text-slate-500">Fixed cinema seating configurations</p>
            </div>
            <Link
              to="/faculty/classrooms"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Manage all ({classrooms.length}) <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {classrooms.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <LayoutGrid className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No classrooms created yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Define your first classroom layout with custom rows and columns to start assigning fixed positions.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                Create Your First Classroom
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map(cls => (
                <div
                  key={cls.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {cls.rows} × {cls.columns} Matrix
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {cls.student_count || 0}/{cls.total_positions} Enrolled
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight">
                      {cls.class_name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Total {cls.total_positions} Fixed Positions ({cls.rows} Rows, {cls.columns} Cols)
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <Link
                      to={`/faculty/classrooms/${cls.id}`}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" /> Seating Matrix
                    </Link>

                    <Link
                      to={`/faculty/classrooms/${cls.id}/attendance`}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                    >
                      <CalendarCheck className="w-3.5 h-3.5" /> Take Attendance
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance Sessions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Recent Attendance Sessions</h2>
              <p className="text-xs text-slate-500">Audit logs of completed classroom roll-calls</p>
            </div>
            <Link to="/faculty/attendance" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              View complete history <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No attendance records recorded yet. Start your first session!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Classroom</th>
                    <th className="py-2.5 px-3 text-right">Students</th>
                    <th className="py-2.5 px-3 text-right">Present</th>
                    <th className="py-2.5 px-3 text-right">Absent</th>
                    <th className="py-2.5 px-3 text-right">Attendance %</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {sessions.slice(0, 5).map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-800 tabular-nums">
                        {s.attendance_date}
                      </td>
                      <td className="py-3 px-3 font-sans font-medium text-slate-700">
                        {s.class_name}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-slate-600">
                        {s.total_students}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-emerald-600 font-bold">
                        {s.present_count}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums text-rose-600 font-bold">
                        {s.absent_count}
                      </td>
                      <td className="py-3 px-3 text-right tabular-nums">
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
                      <td className="py-3 px-3 text-right font-sans">
                        <Link
                          to={`/faculty/attendance?sessionId=${s.id}`}
                          className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                        >
                          View Session
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      <CreateClassroomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreateClassroom}
      />
    </div>
  );
};
