import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { isSupabaseConfigured } from '../../lib/supabase';
import { Profile, Classroom, AttendanceSession, Student, ActivityLog } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { AttendanceDoughnut } from '../../components/charts/AttendanceDoughnut';
import { AttendanceBarChart } from '../../components/charts/AttendanceBarChart';
import { 
  Users, 
  LayoutGrid, 
  CalendarCheck, 
  TrendingUp, 
  ArrowRight, 
  Activity, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  RefreshCw,
  Download,
  Filter,
  Search,
  Sparkles,
  PlusCircle,
  FileSpreadsheet,
  X,
  Database
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Department & Audit Log filters
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [logFilter, setLogFilter] = useState<string>('all');
  const [logSearch, setLogSearch] = useState<string>('');

  // Quick Audit Note Modal
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [auditNoteText, setAuditNoteText] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const loadAdminData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      const [profList, clsList, sessList, stList, logList] = await Promise.all([
        api.getProfiles(),
        api.getClassrooms(),
        api.getAttendanceSessions(),
        api.getAllStudents(),
        api.getActivityLogs()
      ]);
      setProfiles(profList || []);
      setClassrooms(clsList || []);
      setSessions(sessList || []);
      setStudents(stList || []);
      setLogs(logList || []);
      setLastSync(new Date());
    } catch (err) {
      console.error('Failed to load dynamic admin data:', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  // Periodic dynamic auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadAdminData();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadAdminData]);

  // Dynamic metrics calculation
  const facultyProfiles = useMemo(() => profiles.filter(p => p.role === 'faculty'), [profiles]);
  const activeProfiles = useMemo(() => profiles.filter(p => p.account_status === 'active'), [profiles]);
  const activeFaculty = useMemo(() => facultyProfiles.filter(p => p.account_status === 'active'), [facultyProfiles]);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todaySessions = useMemo(() => sessions.filter(s => s.attendance_date === todayStr), [sessions, todayStr]);

  const totalPresent = useMemo(() => sessions.reduce((acc, s) => acc + (s.present_count || 0), 0), [sessions]);
  const totalAbsent = useMemo(() => sessions.reduce((acc, s) => acc + (s.absent_count || 0), 0), [sessions]);
  const totalTurnout = totalPresent + totalAbsent;
  const avgAttendance = totalTurnout > 0
    ? Math.round((totalPresent / totalTurnout) * 1000) / 10
    : 0;

  const totalPositions = useMemo(() => {
    return classrooms.reduce((acc, c) => acc + (c.rows * c.columns || c.total_positions || 0), 0);
  }, [classrooms]);

  // Branch / Department list detected dynamically from classrooms & students
  const departments = useMemo(() => {
    const set = new Set<string>();
    classrooms.forEach(c => {
      if (c.branch) set.add(c.branch);
      if (c.branches) c.branches.forEach(b => set.add(b));
    });
    students.forEach(s => {
      if (s.branch) set.add(s.branch);
    });
    return Array.from(set).sort();
  }, [classrooms, students]);

  // Filtered lists according to selected department
  const filteredClassrooms = useMemo(() => {
    if (selectedBranch === 'all') return classrooms;
    return classrooms.filter(c => c.branch === selectedBranch || c.branches?.includes(selectedBranch));
  }, [classrooms, selectedBranch]);

  const filteredStudents = useMemo(() => {
    if (selectedBranch === 'all') return students;
    return students.filter(s => s.branch === selectedBranch);
  }, [students, selectedBranch]);

  // Department Breakdown
  const departmentBreakdown = useMemo(() => {
    return departments.map(dept => {
      const deptClassrooms = classrooms.filter(c => c.branch === dept || c.branches?.includes(dept));
      const deptClassroomIds = new Set(deptClassrooms.map(c => c.id));
      const deptStudents = students.filter(s => s.branch === dept || deptClassroomIds.has(s.classroom_id));
      const deptCapacity = deptClassrooms.reduce((acc, c) => acc + (c.rows * c.columns || c.total_positions || 0), 0);
      const deptSessions = sessions.filter(s => deptClassroomIds.has(s.classroom_id));
      const deptPresent = deptSessions.reduce((acc, s) => acc + (s.present_count || 0), 0);
      const deptAbsent = deptSessions.reduce((acc, s) => acc + (s.absent_count || 0), 0);
      const deptTotal = deptPresent + deptAbsent;
      const deptPct = deptTotal > 0 ? Math.round((deptPresent / deptTotal) * 1000) / 10 : 0;

      return {
        name: dept,
        classroomCount: deptClassrooms.length,
        studentCount: deptStudents.length,
        capacity: deptCapacity,
        sessionCount: deptSessions.length,
        turnoutPct: deptPct
      };
    });
  }, [departments, classrooms, students, sessions]);

  // Safe bar chart data with resilient date labels
  const barChartData = useMemo(() => {
    return sessions.slice(0, 7).reverse().map(s => {
      let label = 'Session';
      if (s.attendance_date) {
        label = s.attendance_date.length > 5 ? s.attendance_date.slice(5) : s.attendance_date;
      }
      return {
        label,
        percentage: s.attendance_percentage || 0,
        present: s.present_count || 0,
        total: s.total_students || 0
      };
    });
  }, [sessions]);

  // Low turnout alerts (< 75%)
  const lowAttendanceSessions = useMemo(() => {
    return sessions.filter(s => typeof s.attendance_percentage === 'number' && s.attendance_percentage < 75);
  }, [sessions]);

  // Filtered Activity Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (logFilter !== 'all') {
        if (logFilter === 'classroom' && !log.action.includes('CLASSROOM')) return false;
        if (logFilter === 'attendance' && !log.action.includes('ATTENDANCE')) return false;
        if (logFilter === 'students' && !log.action.includes('STUDENT')) return false;
        if (logFilter === 'audit' && !log.action.includes('AUDIT') && !log.action.includes('ADMIN')) return false;
      }
      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        return log.description.toLowerCase().includes(q) || log.action.toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, logFilter, logSearch]);

  // Export Campus Attendance Report
  const handleExportCampusReport = () => {
    const filename = `Campus_Audit_Report_${todayStr}`;
    const headers = ['Session ID', 'Date', 'Classroom ID', 'Total Students', 'Present', 'Absent', 'Turnout %', 'Faculty ID'];
    const rows = sessions.map(s => [
      s.id,
      s.attendance_date || '',
      s.classroom_id,
      s.total_students || 0,
      s.present_count || 0,
      s.absent_count || 0,
      `${s.attendance_percentage || 0}%`,
      s.faculty_id
    ]);
    api.downloadCSV(filename, headers, rows);
  };

  // Submit quick audit note to live log
  const handleAddAuditNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditNoteText.trim()) return;
    try {
      setSubmittingNote(true);
      await api.logActivity('admin-demo-001', 'ADMIN_AUDIT', auditNoteText.trim());
      setAuditNoteText('');
      setShowNoteModal(false);
      await loadAdminData(true);
    } catch (err) {
      console.error('Failed to log audit note:', err);
    } finally {
      setSubmittingNote(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Top Header & Dynamic Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                System Administration
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isSupabaseConfigured() ? 'Supabase Live Connected' : 'Local Storage Engine'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
              Institutional Governance Console
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Live campus-wide monitoring of professors, fixed seating matrices, student enrollments, and roll-call records.
            </p>
          </div>

          {/* Action buttons & Live Sync controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs text-xs text-slate-600 font-mono">
              <span className="text-[11px] text-slate-400">Synced:</span>
              <span className="font-semibold">{lastSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              <button
                type="button"
                onClick={() => loadAdminData(true)}
                disabled={refreshing}
                title="Sync and refresh live data"
                className="p-1 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors ml-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-purple-600' : ''}`} />
              </button>
            </div>

            <button
              type="button"
              onClick={() => setAutoRefresh(prev => !prev)}
              className={`px-3 py-2 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                autoRefresh 
                  ? 'bg-purple-50 border-purple-200 text-purple-700 font-semibold' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title="Automatically poll and update metrics every 30s"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{autoRefresh ? 'Live Sync (30s)' : 'Live Sync Paused'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCampusReport}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <Link
              to="/admin/faculty"
              className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Manage Faculty</span>
            </Link>
          </div>
        </div>

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-slate-200 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 h-64 bg-slate-200 rounded-2xl" />
              <div className="lg:col-span-8 h-64 bg-slate-200 rounded-2xl" />
            </div>
          </div>
        ) : (
          <>
            {/* 6 Dynamic KPI Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-purple-200 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-slate-600">Total Faculty</span>
                  <Users className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {facultyProfiles.length}
                </div>
                <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">
                  {activeFaculty.length} active in system
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-slate-600">Total Classrooms</span>
                  <LayoutGrid className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {classrooms.length}
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {totalPositions} seats capacity
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-blue-200 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-slate-600">Total Students</span>
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {students.length}
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Across {departments.length} department{departments.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-slate-600">Total Sessions</span>
                  <CalendarCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                  {sessions.length}
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {todaySessions.length} recorded today
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-indigo-200 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-slate-600">Campus Turnout</span>
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="text-2xl font-extrabold text-indigo-700 font-mono tabular-nums">
                  {avgAttendance}%
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {totalPresent}P / {totalAbsent}A recorded
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs hover:border-emerald-200 transition-colors">
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-xs font-semibold text-slate-600">Active Accounts</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-extrabold text-emerald-600 font-mono tabular-nums">
                  {activeProfiles.length}
                </div>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  {profiles.length} total registered
                </span>
              </div>
            </div>

            {/* Department Quick Filter */}
            {departments.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" /> Department Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBranch('all')}
                  className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                    selectedBranch === 'all'
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  All Campus ({classrooms.length} rooms)
                </button>
                {departments.map(dept => {
                  const count = classrooms.filter(c => c.branch === dept || c.branches?.includes(dept)).length;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setSelectedBranch(dept)}
                      className={`px-3 py-1 rounded-full font-medium transition-colors whitespace-nowrap cursor-pointer ${
                        selectedBranch === dept
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {dept} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {/* Turnout Warning Banner if any session is < 75% */}
            {lowAttendanceSessions.length > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start sm:items-center justify-between gap-3 text-amber-900">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold text-xs">Institutional Compliance Notice:</span>{' '}
                    <span className="text-xs text-amber-800">
                      {lowAttendanceSessions.length} session{lowAttendanceSessions.length !== 1 ? 's' : ''} recorded turnout below 75% requirement.
                    </span>
                  </div>
                </div>
                <Link
                  to="/admin/analytics"
                  className="px-3 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Inspect in Analytics
                </Link>
              </div>
            )}

            {/* Analytics Grid: Visual Doughnut & Bar Chart */}
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

            {/* Department Breakdown Performance Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Departmental Matrix & Performance</h3>
                  <p className="text-xs text-slate-500">Real-time breakdown of seating configurations and attendance by academic branch</p>
                </div>
                <Link
                  to="/admin/classrooms"
                  className="text-xs font-semibold text-purple-700 hover:text-purple-800 flex items-center gap-1"
                >
                  View All Classrooms <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                      <th className="py-3 px-4">Academic Department</th>
                      <th className="py-3 px-4 text-right">Classrooms</th>
                      <th className="py-3 px-4 text-right">Seating Capacity</th>
                      <th className="py-3 px-4 text-right">Enrolled Students</th>
                      <th className="py-3 px-4 text-right">Sessions Run</th>
                      <th className="py-3 px-4 text-right">Turnout Rate</th>
                      <th className="py-3 px-4 text-center">Audit Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {departmentBreakdown.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs text-slate-400 font-sans">
                          No department data currently available.
                        </td>
                      </tr>
                    ) : (
                      departmentBreakdown.map(dept => (
                        <tr key={dept.name} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-sans font-bold text-slate-900">
                            {dept.name}
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-700">
                            {dept.classroomCount}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-600">
                            {dept.capacity} seats
                          </td>
                          <td className="py-3.5 px-4 text-right font-semibold text-slate-900">
                            {dept.studentCount}
                          </td>
                          <td className="py-3.5 px-4 text-right text-slate-600">
                            {dept.sessionCount}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-indigo-700">
                            {dept.turnoutPct}%
                          </td>
                          <td className="py-3.5 px-4 text-center font-sans">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              dept.turnoutPct >= 80 
                                ? 'bg-emerald-50 text-emerald-700' 
                                : dept.turnoutPct >= 75 
                                ? 'bg-indigo-50 text-indigo-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}>
                              {dept.turnoutPct >= 75 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {dept.turnoutPct >= 75 ? 'Compliant' : 'Review'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* System Activity Logs & Real-Time Audit Trail */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <h2 className="text-base font-bold text-slate-900">Live Institutional Audit Trail</h2>
                  <span className="text-xs text-slate-400 font-mono">({filteredLogs.length} events)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowNoteModal(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Log Audit Note</span>
                  </button>
                </div>
              </div>

              {/* Filter & Search Bar for Audit Trail */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                <div className="flex-1 relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={e => setLogSearch(e.target.value)}
                    placeholder="Search logs by action or description..."
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-400 font-mono text-[11px]">Filter:</span>
                  <select
                    value={logFilter}
                    onChange={e => setLogFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30"
                  >
                    <option value="all">All Events</option>
                    <option value="classroom">Classroom Actions</option>
                    <option value="attendance">Attendance Submissions</option>
                    <option value="students">Student Assignments</option>
                    <option value="audit">Admin Audits</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {filteredLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    No activity logs match your filter criteria.
                  </div>
                ) : (
                  filteredLogs.slice(0, 8).map(log => (
                    <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start sm:items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 sm:mt-0 ${
                          log.action.includes('ATTENDANCE') 
                            ? 'bg-emerald-500' 
                            : log.action.includes('CLASSROOM')
                            ? 'bg-indigo-500'
                            : log.action.includes('AUDIT')
                            ? 'bg-purple-500'
                            : 'bg-blue-500'
                        }`} />
                        <div>
                          <span className="font-semibold text-slate-800">{log.action}:</span>{' '}
                          <span className="text-slate-600">{log.description}</span>
                          {log.user_name && (
                            <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded font-mono">
                              {log.user_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono shrink-0 pl-5 sm:pl-0">
                        {new Date(log.created_at).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

      </main>

      {/* Quick Audit Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Record Institutional Audit Note</h3>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              This note will be logged permanently in the university central activity audit trail with your administrator credentials.
            </p>
            <form onSubmit={handleAddAuditNote} className="space-y-4">
              <div>
                <textarea
                  rows={3}
                  required
                  value={auditNoteText}
                  onChange={e => setAuditNoteText(e.target.value)}
                  placeholder="e.g., Verified AI & DS attendance rosters against exam eligibility thresholds..."
                  className="w-full p-3 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingNote || !auditNoteText.trim()}
                  className="px-4 py-2 text-xs font-semibold text-white bg-purple-700 hover:bg-purple-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{submittingNote ? 'Saving...' : 'Record Audit Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
