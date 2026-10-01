import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Profile, Classroom, AttendanceSession, Student } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  X, 
  LayoutGrid, 
  CalendarCheck,
  Building,
  Mail
} from 'lucide-react';

export const FacultyManagementPage: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [selectedFaculty, setSelectedFaculty] = useState<Profile | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pList, cList, sList, stList] = await Promise.all([
        api.getProfiles(),
        api.getClassrooms(),
        api.getAttendanceSessions(),
        api.getAllStudents()
      ]);
      setProfiles(pList.filter(p => p.role === 'faculty'));
      setClassrooms(cList);
      setSessions(sList);
      setStudents(stList);
    } catch (err) {
      console.error('Failed to load faculty:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleStatus = async (faculty: Profile) => {
    const nextStatus = faculty.account_status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateProfile(faculty.id, { account_status: nextStatus });
      await loadData();
      if (selectedFaculty?.id === faculty.id) {
        setSelectedFaculty({ ...faculty, account_status: nextStatus });
      }
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  // Filtered faculty
  const filteredFaculty = profiles.filter(p => {
    if (statusFilter !== 'all' && p.account_status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    }
    return true;
  });

  // Selected faculty stats
  const facultyClassrooms = selectedFaculty ? classrooms.filter(c => c.faculty_id === selectedFaculty.id || (selectedFaculty.id === 'faculty-demo-001' && c.faculty_id === 'a0000000-0000-0000-0000-000000000001') || (selectedFaculty.id === 'a0000000-0000-0000-0000-000000000001' && c.faculty_id === 'faculty-demo-001')) : [];
  const facultyClassroomIds = facultyClassrooms.map(c => c.id);
  const facultyStudents = students.filter(s => facultyClassroomIds.includes(s.classroom_id) || (facultyClassroomIds.includes('c0000000-0000-0000-0000-000000000001') && s.classroom_id === 'cls-aids-001') || (facultyClassroomIds.includes('cls-aids-001') && s.classroom_id === 'c0000000-0000-0000-0000-000000000001'));
  const facultySessions = sessions.filter(s => s.faculty_id === selectedFaculty?.id || (selectedFaculty?.id === 'faculty-demo-001' && s.faculty_id === 'a0000000-0000-0000-0000-000000000001') || (selectedFaculty?.id === 'a0000000-0000-0000-0000-000000000001' && s.faculty_id === 'faculty-demo-001'));

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            Administrative Management
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
            Faculty Directory & Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor registered professors, their fixed classroom configurations, and account permissions.
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search faculty by name or email address..."
              className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
            />
          </div>

          <div className="sm:w-48">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
            >
              <option value="all">All Statuses ({profiles.length})</option>
              <option value="active">Active Only</option>
              <option value="suspended">Suspended Only</option>
            </select>
          </div>
        </div>

        {/* Faculty Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredFaculty.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No faculty accounts match your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px]">
                    <th className="py-3 px-4">Faculty Member</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-right">Classrooms</th>
                    <th className="py-3 px-4 text-right">Students</th>
                    <th className="py-3 px-4 text-right">Sessions</th>
                    <th className="py-3 px-4">Account Created</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {filteredFaculty.map(f => {
                    const fClassrooms = classrooms.filter(c => c.faculty_id === f.id || (f.id === 'faculty-demo-001' && c.faculty_id === 'a0000000-0000-0000-0000-000000000001') || (f.id === 'a0000000-0000-0000-0000-000000000001' && c.faculty_id === 'faculty-demo-001'));
                    const fClassroomIds = fClassrooms.map(c => c.id);
                    const fStudents = students.filter(s => fClassroomIds.includes(s.classroom_id) || (fClassroomIds.includes('c0000000-0000-0000-0000-000000000001') && s.classroom_id === 'cls-aids-001') || (fClassroomIds.includes('cls-aids-001') && s.classroom_id === 'c0000000-0000-0000-0000-000000000001'));
                    const fSessions = sessions.filter(s => s.faculty_id === f.id || (f.id === 'faculty-demo-001' && s.faculty_id === 'a0000000-0000-0000-0000-000000000001') || (f.id === 'a0000000-0000-0000-0000-000000000001' && s.faculty_id === 'faculty-demo-001'));

                    return (
                      <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-4 font-sans font-bold text-slate-900">
                          {f.full_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {f.email}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums font-semibold text-slate-800">
                          {fClassrooms.length}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-600">
                          {fStudents.length}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums text-slate-600">
                          {fSessions.length}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 tabular-nums">
                          {new Date(f.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-sans">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            f.account_status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}>
                            {f.account_status === 'active' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {f.account_status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-sans space-x-2">
                          <button
                            onClick={() => setSelectedFaculty(f)}
                            className="px-2.5 py-1 text-xs font-semibold text-purple-700 hover:text-purple-900 hover:bg-purple-50 rounded-lg transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>

      {/* Faculty Details Modal */}
      {selectedFaculty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedFaculty.full_name}</h3>
                <p className="text-xs text-slate-500 font-mono">{selectedFaculty.email}</p>
              </div>
              <button
                onClick={() => setSelectedFaculty(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Quick stats grid */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                  <span className="text-[10px] text-purple-600 font-semibold uppercase block">Classrooms</span>
                  <span className="text-xl font-extrabold text-purple-900 font-mono">{facultyClassrooms.length}</span>
                </div>
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-indigo-600 font-semibold uppercase block">Total Students</span>
                  <span className="text-xl font-extrabold text-indigo-900 font-mono">{facultyStudents.length}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase block">Sessions Held</span>
                  <span className="text-xl font-extrabold text-emerald-900 font-mono">{facultySessions.length}</span>
                </div>
              </div>

              {/* Classrooms list */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Configured Fixed Classrooms
                </h4>
                {facultyClassrooms.length === 0 ? (
                  <p className="text-xs text-slate-400">No classrooms configured yet.</p>
                ) : (
                  <div className="space-y-2">
                    {facultyClassrooms.map(c => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{c.class_name}</span>
                          <span className="text-slate-500 font-mono block text-[11px]">
                            {c.rows} Rows × {c.columns} Columns ({c.total_positions} Positions)
                          </span>
                        </div>
                        <span className="font-mono text-slate-600 text-xs">
                          {students.filter(s => s.classroom_id === c.id).length} Enrolled
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleToggleStatus(selectedFaculty)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                  selectedFaculty.account_status === 'active'
                    ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                    : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {selectedFaculty.account_status === 'active' ? 'Suspend Faculty Account' : 'Activate Faculty Account'}
              </button>

              <button
                type="button"
                onClick={() => setSelectedFaculty(null)}
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
