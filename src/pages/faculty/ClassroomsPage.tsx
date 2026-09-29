import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Classroom } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { CreateClassroomModal } from '../../components/classroom/CreateClassroomModal';
import { 
  Plus, 
  LayoutGrid, 
  CalendarCheck, 
  FileSpreadsheet, 
  Trash2, 
  Users, 
  Calendar,
  AlertTriangle
} from 'lucide-react';

export const ClassroomsPage: React.FC = () => {
  const { user } = useAuth();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Classroom | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadClassrooms = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await api.getClassrooms(user.id);
      setClassrooms(data);
    } catch (err) {
      console.error('Failed to load classrooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassrooms();
  }, [user]);

  const handleCreate = async (data: {
    class_name: string;
    rows: number;
    columns: number;
    layout_type?: 'dual_matrix' | 'single_matrix';
    boys_rows?: number;
    boys_columns?: number;
    girls_rows?: number;
    girls_columns?: number;
  }) => {
    if (!user) return;
    await api.createClassroom({
      faculty_id: user.id,
      ...data
    });
    await loadClassrooms();
  };

  const handleUpdate = async (id: string, updates: Partial<Classroom>) => {
    await api.updateClassroom(id, updates);
    setEditTarget(null);
    await loadClassrooms();
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !user) return;
    try {
      setDeleting(true);
      await api.deleteClassroom(deleteTarget.id, user.id);
      setDeleteTarget(null);
      await loadClassrooms();
    } catch (err) {
      console.error('Failed to delete classroom:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                Classroom Management
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-display">
              My Classrooms
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fixed tiered positions, dimension configurations, and direct roll-call actions.
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" /> Create Classroom
          </button>
        </div>

        {/* Classroom Cards Grid */}
        {classrooms.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-16 text-center">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No classrooms created yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Create your first lecture room with custom row and column matrix dimensions.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
            >
              Create Classroom
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {classrooms.map(c => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {c.rows} × {c.columns} = {c.total_positions} Seats
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditTarget(c)}
                        className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        title="Edit Classroom Configuration"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(c)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Classroom"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {c.class_name}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-3.5 h-3.5 text-blue-500" />
                        {c.student_count || 0} / {c.total_positions} Students
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Created {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {c.latest_attendance && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 text-xs flex items-center justify-between">
                      <span className="text-slate-500">Latest Session:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {c.latest_attendance} ({c.attendance_percentage || 0}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <Link
                    to={`/faculty/classrooms/${c.id}`}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" /> Seating Matrix
                  </Link>

                  <Link
                    to={`/faculty/classrooms/${c.id}/attendance`}
                    className="flex-1 py-2 px-3 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center justify-center gap-1 shadow-2xs"
                  >
                    <CalendarCheck className="w-3.5 h-3.5" /> Take Attendance
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>

      <CreateClassroomModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreate}
      />

      {editTarget && (
        <CreateClassroomModal
          isOpen={Boolean(editTarget)}
          onClose={() => setEditTarget(null)}
          onCreate={async () => {}}
          editClassroom={editTarget}
          onUpdate={handleUpdate}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Permanently Delete Classroom?
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800">"{deleteTarget.class_name}"</strong>? All associated {deleteTarget.student_count || 0} fixed student seats and attendance records will be removed.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Classroom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
