import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Classroom, Student, AttendanceFilter } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { SeatingMatrix } from '../../components/classroom/SeatingMatrix';
import { StudentFormModal } from '../../components/classroom/StudentFormModal';
import { CreateClassroomModal } from '../../components/classroom/CreateClassroomModal';
import { 
  ArrowLeft, 
  CalendarCheck, 
  Plus, 
  FileSpreadsheet, 
  Users, 
  Monitor, 
  Sparkles,
  Download,
  Edit3,
  Trash2,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [loading, setLoading] = useState(true);

  // Student Modal states
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [targetRow, setTargetRow] = useState(1);
  const [targetCol, setTargetCol] = useState(1);

  // Classroom Edit & Delete Modal states
  const [showEditClassroomModal, setShowEditClassroomModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadClassroomData = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const cls = await api.getClassroomById(id);
      if (!cls) {
        navigate('/faculty/classrooms');
        return;
      }
      setClassroom(cls);
      const stList = await api.getStudentsByClassroom(id);
      setStudents(stList);
    } catch (err) {
      console.error('Failed to load classroom detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassroomData();
  }, [id]);

  const handleSeatClick = (row: number, col: number, student?: Student) => {
    setTargetRow(row);
    setTargetCol(col);
    setSelectedStudent(student || null);
    setStudentModalOpen(true);
  };

  const handleSaveStudent = async (data: Omit<Student, 'id' | 'created_at'>, studentId?: string) => {
    if (studentId) {
      await api.updateStudent(studentId, data);
    } else {
      await api.assignStudent(data);
    }
    await loadClassroomData();
  };

  const handleDeleteStudent = async (studentId: string) => {
    await api.removeStudent(studentId);
    await loadClassroomData();
  };

  const handleUpdateClassroom = async (classroomId: string, updates: Partial<Classroom>) => {
    await api.updateClassroom(classroomId, updates);
    await loadClassroomData();
    setShowEditClassroomModal(false);
  };

  const handleDeleteClassroom = async () => {
    if (!classroom) return;
    try {
      setDeleting(true);
      await api.deleteClassroom(classroom.id);
      navigate('/faculty/classrooms');
    } catch (err) {
      console.error('Failed to delete classroom:', err);
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const downloadRosterCSV = () => {
    if (!classroom) return;
    const filename = `${classroom.class_name.replace(/[^a-zA-Z0-9]/g, '_')}_Student_Roster`;
    const headers = ['Seat #', 'Row', 'Column', 'Wing', 'Roll Number', 'Student Name', 'Branch', 'Gender'];
    const rows = students.map(s => [
      s.position_number,
      s.row_number,
      s.column_number,
      s.gender === 'Male' ? 'Boys Wing' : 'Girls Wing',
      s.roll_number,
      s.student_name,
      s.branch,
      s.gender
    ]);
    api.downloadCSV(filename, headers, rows);
  };

  if (loading || !classroom) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <span>Loading auditorium seating configuration...</span>
          </div>
        </div>
      </div>
    );
  }

  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;
  const totalCapacity = classroom.total_positions || (classroom.rows * classroom.columns);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link 
              to="/faculty/classrooms" 
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-2"
            >
              <ArrowLeft className="w-4 h-4" /> Back to My Classrooms
            </Link>

            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                {classroom.class_name}
              </h1>
              <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {classroom.rows}R × {classroom.columns}C ({totalCapacity} Fixed Seats)
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1">
              Classroom Seating Setup Window: Assign students to permanent matrix positions and manage classroom settings.
            </p>
          </div>

          {/* Action Buttons: Edit Classroom, Delete Classroom, Launch Live Attendance */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowEditClassroomModal(true)}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit Classroom
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
            </button>

            <button
              onClick={downloadRosterCSV}
              className="px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl transition-all shadow-2xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download Roster
            </button>

            {/* Launch Dedicated Attendance Window */}
            <Link
              to={`/faculty/classrooms/${classroom.id}/attendance`}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Launch Live Attendance Window →</span>
            </Link>
          </div>
        </div>

        {/* 3 Summary Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-500 font-medium">Total Enrolled</span>
              <div className="text-xl font-black text-slate-900 font-mono mt-0.5">
                {students.length} <span className="text-xs text-slate-400 font-normal">/ {totalCapacity} seats</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-blue-900 font-medium">Boys Wing Enrolled</span>
              <div className="text-xl font-black text-blue-700 font-mono mt-0.5">
                {maleCount} <span className="text-xs text-blue-500 font-normal">Students</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              B
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-pink-200 bg-pink-50/40 flex items-center justify-between">
            <div>
              <span className="text-xs text-pink-900 font-medium">Girls Wing Enrolled</span>
              <div className="text-xl font-black text-pink-700 font-mono mt-0.5">
                {femaleCount} <span className="text-xs text-pink-500 font-normal">Students</span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-pink-600 text-white flex items-center justify-center font-bold text-xs">
              G
            </div>
          </div>
        </div>

        {/* Main Cinema Seating Grid */}
        <SeatingMatrix
          classroom={classroom}
          students={students}
          mode="manage"
          filter={filter}
          onFilterChange={setFilter}
          onSeatClick={handleSeatClick}
        />

        {/* Quick Assign / Edit Student Modal */}
        <StudentFormModal
          isOpen={studentModalOpen}
          onClose={() => setStudentModalOpen(false)}
          onSave={handleSaveStudent}
          onDelete={handleDeleteStudent}
          classroom={classroom}
          targetRow={targetRow}
          targetCol={targetCol}
          existingStudent={selectedStudent}
        />

        {/* Edit Classroom Modal */}
        {showEditClassroomModal && (
          <CreateClassroomModal
            isOpen={showEditClassroomModal}
            onClose={() => setShowEditClassroomModal(false)}
            onCreate={async () => {}}
            editClassroom={classroom}
            onUpdate={handleUpdateClassroom}
          />
        )}

        {/* Delete Classroom Safeguard Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Delete Classroom?
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Are you sure you want to delete <strong>"{classroom.class_name}"</strong>? All assigned student seats and past attendance history for this class will be permanently removed.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="py-2 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteClassroom}
                  className="py-2 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
