import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Profile, Classroom, AttendanceSession, Student, ActivityLog } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { AttendanceDoughnut } from '../../components/charts/AttendanceDoughnut';
import { AttendanceBarChart } from '../../components/charts/AttendanceBarChart';
import { 
  Users, 
  LayoutGrid, 
  CalendarCheck, 
  ShieldCheck, 
  TrendingUp, 
  ArrowRight, 
  Activity, 
  CheckCircle2, 
  Clock, 
  Building
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        const [profList, clsList, sessList, stList, logList] = await Promise.all([
          api.getProfiles(),
          api.getClassrooms(),
          api.getAttendanceSessions(),
          api.getAllStudents(),
          api.getActivityLogs()
        ]);
        setProfiles(profList);
        setClassrooms(clsList);
        setSessions(sessList);
        setStudents(stList);
        setLogs(logList);
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const facultyProfiles = profiles.filter(p => p.role === 'faculty');
  const activeProfiles = profiles.filter(p => p.account_status === 'active');

  const todayStr = new Date().toISOString().split('T')[0];
  const todaySessions = sessions.filter(s => s.attendance_date === todayStr);

  const totalPresent = sessions.reduce((acc, s) => acc + (s.present_count || 0), 0);
  const totalAbsent = sessions.reduce((acc, s) => acc + (s.absent_count || 0), 0);
  const avgAttendance = sessions.length > 0
    ? Math.round((totalPresent / (totalPresent + totalAbsent || 1)) * 1000) / 10
    : 0;

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
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                System Administration
              </span>
              <span className="text-xs text-slate-400 font-mono">Central Database</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
              Institutional Governance Console
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              System-wide audit of all faculty accounts, fixed seating matrices, and roll-call integrity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/admin/faculty"
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" /> Manage Faculty
            </Link>
            <Link
              to="/admin/analytics"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              System Analytics
            </Link>
          </div>
        </div>

        {/* 6 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Total Faculty</span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {facultyProfiles.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Registered professors</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Total Classrooms</span>
              <LayoutGrid className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {classrooms.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Fixed matrices</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Total Students</span>
              <Building className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {students.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Across all sections</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Total Sessions</span>
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
              {sessions.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Submitted sessions</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Campus Turnout</span>
              <TrendingUp className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-extrabold text-indigo-700 font-mono tabular-nums">
              {avgAttendance}%
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Overall average</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold text-slate-600">Active Accounts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
              {activeProfiles.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">Verified active</span>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Campus Attendance Distribution</h3>
              <p className="text-xs text-slate-500">Institution-wide present vs absent tally</p>
            </div>
            <AttendanceDoughnut present={totalPresent} absent={totalAbsent} />
          </div>

          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Recent Session Trends</h3>
                <p className="text-xs text-slate-500">Attendance percentages recorded across all faculties</p>
              </div>
              <Link to="/admin/analytics" className="text-xs text-purple-700 hover:underline flex items-center gap-1 font-semibold">
                Analytics <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <AttendanceBarChart data={barChartData} />
          </div>
        </div>

        {/* System Activity Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600" />
              <h2 className="text-base font-bold text-slate-900">Live Institutional Audit Trail</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Real-time log events</span>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {logs.slice(0, 6).map(log => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-start sm:items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-purple-500 shrink-0 mt-1.5 sm:mt-0" />
                  <div>
                    <span className="font-semibold text-slate-800">{log.action}:</span>{' '}
                    <span className="text-slate-600">{log.description}</span>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono shrink-0 pl-5 sm:pl-0">
                  {new Date(log.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
};
