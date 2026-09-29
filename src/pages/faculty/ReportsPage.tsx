import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Classroom, StudentAggregateReport } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { 
  FileSpreadsheet, 
  Download, 
  Search, 
  LayoutGrid, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  Printer,
  Building,
  GraduationCap
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');
  const [reports, setReports] = useState<StudentAggregateReport[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Load classrooms on mount
  useEffect(() => {
    const loadClassrooms = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const list = await api.getClassrooms(user.id);
        setClassrooms(list);
        if (list.length > 0) {
          setSelectedClassroomId(list[0].id);
        }
      } catch (err) {
        console.error('Failed to load classrooms for reports:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClassrooms();
  }, [user]);

  // Load report when selected classroom changes
  useEffect(() => {
    const loadReportData = async () => {
      if (!selectedClassroomId) {
        setReports([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.getCombinedReport(selectedClassroomId);
        setReports(data);
      } catch (err) {
        console.error('Failed to load combined report:', err);
      } finally {
        setLoading(false);
      }
    };

    loadReportData();
  }, [selectedClassroomId]);

  const currentClassroom = classrooms.find(c => c.id === selectedClassroomId);

  const filteredReports = reports.filter(r => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(q) ||
      r.roll_number.toLowerCase().includes(q) ||
      r.branch.toLowerCase().includes(q)
    );
  });

  const totalEnrolled = reports.length;
  const avgAttendance = reports.length > 0
    ? Math.round(reports.reduce((acc, r) => acc + r.percentage, 0) / reports.length * 10) / 10
    : 0;

  const handleDownloadCSV = () => {
    if (!currentClassroom || reports.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const cleanClassName = currentClassroom.class_name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanClassName}_Cumulative_Attendance_Report_${today}`;

    const headers = [
      'S.No',
      'Seat Number',
      'Wing',
      'Row',
      'Column',
      'Roll Number',
      'Student Name',
      'Branch',
      'Gender',
      'Classroom Section',
      'Total Sessions Held',
      'Present Count',
      'Absent Count',
      'Attendance Percentage'
    ];

    const rows = filteredReports.map((r, idx) => [
      idx + 1,
      r.position_number,
      r.gender === 'Male' ? 'Boys Wing' : 'Girls Wing',
      r.row_number,
      r.column_number,
      r.roll_number,
      r.student_name,
      r.branch,
      r.gender,
      r.classroom_name,
      r.total_sessions,
      r.present_count,
      r.absent_count,
      `${r.percentage}%`
    ]);

    api.downloadCSV(filename, headers, rows);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Page Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Institutional Records
              </span>
              <span className="text-xs text-slate-400 font-mono">Academic Year 2026</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 font-display">
              Classroom Attendance Reports
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Official cumulative student presence calculations, seating allocations, and certified export.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={reports.length === 0}
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-500" /> Print Report
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={reports.length === 0}
              className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Download Certified CSV
            </button>
          </div>
        </div>

        {/* Classroom selector & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Select Classroom Section
            </label>
            <select
              value={selectedClassroomId}
              onChange={e => setSelectedClassroomId(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.rows}R × {c.columns}C · {c.total_positions || (c.rows * c.columns)} Seats)
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Search by Student / Roll No
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter by name, roll number, or branch..."
                className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Formal Institutional Report Card (With Details) */}
        {currentClassroom && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            
            {/* Header with College details */}
            <div className="text-center pb-5 border-b-2 border-slate-900 space-y-1">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Department of Computer Science & Engineering / Artificial Intelligence & Data Science
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight font-display">
                Digital Attendance System for Fixed Positions
              </h2>
              <div className="inline-block px-3 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-mono font-bold">
                CUMULATIVE CLASSROOM ATTENDANCE REGISTER
              </div>
            </div>

            {/* Classroom Details Summary */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Course Section</span>
                  <span className="font-bold text-slate-900 text-sm">{currentClassroom.class_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Faculty In-Charge</span>
                  <span className="font-bold text-slate-900">{profile?.full_name || 'Dr. Ramesh Kumar'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Enrolled</span>
                  <span className="font-bold text-slate-900 font-mono">{totalEnrolled} Students</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase block">Average Attendance</span>
                  <span className="font-black text-indigo-700 font-mono text-sm">{avgAttendance}%</span>
                </div>
              </div>
            </div>

            {/* Table Format Student Attendance */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              {filteredReports.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-400">
                  No matching student records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px]">
                        <th className="py-3 px-4">S.No</th>
                        <th className="py-3 px-4">Seat #</th>
                        <th className="py-3 px-4">Wing</th>
                        <th className="py-3 px-4">Roll Number</th>
                        <th className="py-3 px-4">Student Name</th>
                        <th className="py-3 px-4">Branch</th>
                        <th className="py-3 px-4">Gender</th>
                        <th className="py-3 px-4 text-right">Sessions Held</th>
                        <th className="py-3 px-4 text-right">Present</th>
                        <th className="py-3 px-4 text-right">Absent</th>
                        <th className="py-3 px-4 text-right">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {filteredReports.map((r, idx) => (
                        <tr key={r.student_id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-slate-400 tabular-nums">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-slate-800 tabular-nums">
                            #{r.position_number}
                            <span className="text-[10px] text-slate-400 font-normal ml-1">
                              (R{r.row_number}:C{r.column_number})
                            </span>
                          </td>
                          <td className="py-3 px-4 font-sans">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              r.gender === 'Male' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                            }`}>
                              {r.gender === 'Male' ? 'Boys Wing' : 'Girls Wing'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {r.roll_number}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-slate-900">
                            {r.student_name}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-600">
                            {r.branch}
                          </td>
                          <td className="py-3 px-4 font-sans text-slate-600">
                            {r.gender}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-slate-600">
                            {r.total_sessions}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-emerald-600 font-bold">
                            {r.present_count}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums text-rose-600 font-bold">
                            {r.absent_count}
                          </td>
                          <td className="py-3 px-4 text-right tabular-nums">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              r.percentage >= 85
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.percentage >= 70
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {r.percentage}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Official Report Sign-off */}
            <div className="pt-6 flex items-center justify-between text-xs text-slate-400 border-t border-slate-200">
              <div>
                Official Institutional Record · Generated on {new Date().toLocaleDateString()}
              </div>
              <div className="text-right">
                <div className="h-8 border-b border-slate-300 w-44 ml-auto mb-1" />
                <span className="font-semibold text-slate-700">Faculty Signature & Stamp</span>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
