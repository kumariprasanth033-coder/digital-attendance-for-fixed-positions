import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Classroom, AttendanceSession, Student, Profile } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { AttendanceDoughnut } from '../../components/charts/AttendanceDoughnut';
import { AttendanceBarChart } from '../../components/charts/AttendanceBarChart';
import { 
  TrendingUp, 
  Users, 
  LayoutGrid, 
  CalendarCheck, 
  Award, 
  AlertTriangle,
  Building
} from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [cList, sList, stList, pList] = await Promise.all([
          api.getClassrooms(),
          api.getAttendanceSessions(),
          api.getAllStudents(),
          api.getProfiles()
        ]);
        setClassrooms(cList);
        setSessions(sList);
        setStudents(stList);
        setProfiles(pList);
      } catch (err) {
        console.error('Failed to load admin analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const totalPresent = sessions.reduce((acc, s) => acc + (s.present_count || 0), 0);
  const totalAbsent = sessions.reduce((acc, s) => acc + (s.absent_count || 0), 0);
  const totalMarked = totalPresent + totalAbsent;
  const overallPct = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 1000) / 10 : 0;

  // Best & worst session
  const sortedSessions = [...sessions].sort((a, b) => (b.attendance_percentage || 0) - (a.attendance_percentage || 0));
  const bestSession = sortedSessions[0];
  const lowestSession = sortedSessions[sortedSessions.length - 1];

  const barChartData = sessions.slice(0, 8).reverse().map(s => ({
    label: s.attendance_date ? (s.attendance_date.length > 5 ? s.attendance_date.slice(5) : s.attendance_date) : 'N/A',
    percentage: s.attendance_percentage || 0,
    present: s.present_count || 0,
    total: s.total_students || 0
  }));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Institutional Intelligence
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
            Campus-Wide Attendance Analytics
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregated metrics derived in real-time from active classroom attendance records.
          </p>
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Overall Campus Turnout</span>
            <div className="text-3xl font-extrabold text-indigo-700 font-mono mt-1 tabular-nums">
              {overallPct}%
            </div>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono">
              {totalPresent} Present / {totalAbsent} Absent
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-slate-500 block">Active Students Enrolled</span>
            <div className="text-3xl font-extrabold text-slate-900 font-mono mt-1 tabular-nums">
              {students.length}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1 font-mono">
              In {classrooms.length} fixed matrices
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-emerald-700 block flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Highest Attendance Session
            </span>
            <div className="text-3xl font-extrabold text-emerald-600 font-mono mt-1 tabular-nums">
              {bestSession ? `${bestSession.attendance_percentage}%` : 'N/A'}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1 truncate">
              {bestSession?.class_name || 'None recorded'}
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-semibold text-rose-700 block flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> Lowest Recorded Turnout
            </span>
            <div className="text-3xl font-extrabold text-rose-600 font-mono mt-1 tabular-nums">
              {lowestSession ? `${lowestSession.attendance_percentage}%` : 'N/A'}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1 truncate">
              {lowestSession?.class_name || 'None recorded'}
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Total Attendance Proportion</h3>
              <p className="text-xs text-slate-500">Aggregate Present vs Absent across all sessions</p>
            </div>
            <AttendanceDoughnut present={totalPresent} absent={totalAbsent} size={200} />
          </div>

          <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chronological Roll-Call Percentages</h3>
              <p className="text-xs text-slate-500">Turnout trends across all departments</p>
            </div>
            <AttendanceBarChart data={barChartData} />
          </div>
        </div>

      </main>
    </div>
  );
};
