import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Classroom, Profile, Student } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { LayoutGrid, Search, Users, ExternalLink, Calendar } from 'lucide-react';

export const AdminClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllClassrooms = async () => {
      try {
        setLoading(true);
        const [cList, pList, stList] = await Promise.all([
          api.getClassrooms(),
          api.getProfiles(),
          api.getAllStudents()
        ]);
        setClassrooms(cList);
        setProfiles(pList);
        setStudents(stList);
      } catch (err) {
        console.error('Failed to load admin classrooms:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAllClassrooms();
  }, []);

  const facultyMap = new Map<string, string>();
  profiles.forEach(p => {
    facultyMap.set(p.id, p.full_name);
  });

  const filteredClassrooms = classrooms.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const facultyName = facultyMap.get(c.faculty_id)?.toLowerCase() || '';
    return c.class_name.toLowerCase().includes(q) || facultyName.includes(q);
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header */}
        <div className="pb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
            System Inspection
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
            All Campus Classrooms
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit fixed cinema/theatre layouts configured across all university academic departments.
          </p>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter by classroom name or faculty in charge..."
              className="w-full pl-10 pr-3.5 py-2 border border-slate-300 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600"
            />
          </div>
        </div>

        {/* Classrooms Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredClassrooms.map(c => {
            const facultyName = facultyMap.get(c.faculty_id) || 'Faculty Member';
            const count = students.filter(s => s.classroom_id === c.id).length;

            return (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                      {c.rows} × {c.columns} Matrix
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {count} / {c.total_positions} Enrolled
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    {c.class_name}
                  </h3>

                  <div className="text-xs text-slate-600">
                    <span className="text-slate-400">Faculty:</span>{' '}
                    <strong className="text-slate-800">{facultyName}</strong>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400 font-mono">
                    Created {new Date(c.created_at).toLocaleDateString()}
                  </div>
                  <Link
                    to={`/faculty/classrooms/${c.id}`}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900 flex items-center gap-1"
                  >
                    View Layout <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

      </main>
    </div>
  );
};
