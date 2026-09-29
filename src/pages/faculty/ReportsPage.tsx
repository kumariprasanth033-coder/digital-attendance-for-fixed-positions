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
  AlertCircle
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const { user } = useAuth();
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

  const handleDownloadCSV = () => {
    if (!currentClassroom || reports.length === 0) return;
    const today = new Date().toISOString().split('T')[0];
    const cleanClassName = currentClassroom.class_name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${cleanClassName}_Attendance_${today}`;

    const headers = [
      'Roll Number',
      'Student Name',
      'Branch',
      'Gender',
      'Fixed Seat',
      'Row',
      'Column',
      'Classroom',
      'Total Sessions',
      'Present Count',
      'Absent Count',
      'Attendance Percentage'
    ];

    const rows = reports.map(r => [
      r.roll_number,
      r.student_name,
      r.branch,
      r.gender,
      r.position_number,
      r.row_number,
      r.column_number,
      r.classroom_name,
      r.total_sessions,
      r.present_count,
      r.absent_count,
      `${r.percentage}%`
    ]);

    api.downloadCSV(filename, headers, rows);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Official Records
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
              Combined Attendance Reports
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumulative presence calculations and certified institutional CSV export.
            </p>
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={reports.length === 0}
            className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> Download Certified CSV
          </button>
        </div>

        {/* Classroom selector & Search */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Select Classroom Section
            </label>
            <select
              value={selectedClassroomId}
              onChange={e => setSelectedClassroomId(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs font-medium bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
            >
              {classrooms.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name} ({c.rows}x{c.columns} · {c.total_positions} Seats)
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[240px]">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Search by Student / Roll No
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter by name, roll number, or branch..."
                className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {reports.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No students or attendance records found for this classroom.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Seat #</th>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4 text-right">Total Sessions</th>
                    <th className="py-3 px-4 text-right">Present</th>
                    <th className="py-3 px-4 text-right">Absent</th>
                    <th className="py-3 px-4 text-right">Turnout %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredReports.map(r => (
                    <tr key={r.student_id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-700 tabular-nums">
                        #{r.position_number}
                        <span className="text-[10px] text-slate-400 font-normal ml-1">
                          (R{r.row_number}:C{r.column_number})
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {r.roll_number}
                      </td>
                      <td className="py-3 px-4 font-sans font-medium text-slate-800">
                        {r.student_name}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        {r.branch}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-600">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          r.gender === 'Male' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                          {r.gender}
                        </span>
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
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          r.percentage >= 85
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.percentage >= 70
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-rose-50 text-rose-700'
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

      </main>
    </div>
  );
};
