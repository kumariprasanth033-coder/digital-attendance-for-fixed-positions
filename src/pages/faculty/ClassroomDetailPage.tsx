import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Classroom, Student, AttendanceFilter } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { SeatingMatrix } from '../../components/classroom/SeatingMatrix';
import { StudentFormModal } from '../../components/classroom/StudentFormModal';
import { 
  ArrowLeft, 
  CalendarCheck, 
  Plus, 
  FileSpreadsheet, 
  Users, 
  Monitor, 
  Sparkles,
  Download
} from 'lucide-react';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filter, setFilter] = useState<AttendanceFilter>('all');
  const [loading, setLoading] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [targetRow, setTargetRow] = useState(1);
  const [targetCol, setTargetCol] = useState(1);

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
    setModalOpen(true);
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

  const downloadRosterCSV = () => {
    if (!classroom) return;
    const filename = `${classroom.class_name.replace(/[^a-zA-Z0-9]/g, '_')}_Student_Roster`;
    const headers = ['Seat #', 'Row', 'Column', 'Roll Number', 'Student Name', 'Branch', 'Gender'];
    const rows = students.map(s => [
      s.position_number,
      s.row_number,
      s.column_number,
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
            Loading seating layout...
          </div>
        </div>
      </div>
    );
  }

  const capacityPct = Math.round((students.length / classroom.total_positions) * 100);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Back and title bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link
              to="/faculty/classrooms"
              className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Classrooms
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-display">
                {classroom.class_name}
              </h1>
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                {classroom.rows} × {classroom.columns} ({classroom.total_positions} Seats)
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Assigned fixed positions: {students.length} of {classroom.total_positions} seats occupied ({capacityPct}% capacity).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={downloadRosterCSV}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" /> Roster CSV
            </button>

            <button
              onClick={() => {
                setSelectedStudent(null);
                setTargetRow(1);
                setTargetCol(1);
                setModalOpen(true);
              }}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Student
            </button>

            <Link
              to={`/faculty/classrooms/${classroom.id}/attendance`}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CalendarCheck className="w-3.5 h-3.5" /> Start Attendance
            </Link>
          </div>
        </div>

        {/* Visual Seating Matrix Component */}
        <SeatingMatrix
          classroom={classroom}
          students={students}
          mode="view"
          filter={filter}
          onFilterChange={setFilter}
          onSeatClick={handleSeatClick}
        />

      </main>

      <StudentFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        classroom={classroom}
        existingStudent={selectedStudent}
        targetRow={targetRow}
        targetCol={targetCol}
        onSave={handleSaveStudent}
        onDelete={handleDeleteStudent}
      />
    </div>
  );
};
