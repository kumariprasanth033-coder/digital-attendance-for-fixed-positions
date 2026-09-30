import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Classroom, Student, AttendanceFilter } from '../../types';
import { Navbar } from '../../components/common/Navbar';
import { SeatingMatrix } from '../../components/classroom/SeatingMatrix';
import { StudentFormModal } from '../../components/classroom/StudentFormModal';
import { CreateClassroomModal } from '../../components/classroom/CreateClassroomModal';
import { BulkImportModal } from '../../components/classroom/BulkImportModal';
import { 
  ArrowLeft, 
  CalendarCheck, 
  Plus, 
  Users, 
  Monitor, 
  Sparkles,
  Download,
  Upload,
  Edit3,
  Trash2,
  AlertTriangle,
  Search,
  Armchair,
  FileSpreadsheet,
  History,
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid
} from 'lucide-react';

export const ClassroomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const actionProcessedRef = useRef(false);

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  // Active view: 'manage' (Manage Students CRUD table) or 'seating' (Cinema Seating Visualization)
  const [activeTab, setActiveTab] = useState<'manage' | 'seating'>('manage');

  // Search & Filter in Manage Students
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState<AttendanceFilter>('all');

  // Student Form Modal states (Add & Edit)
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [targetRow, setTargetRow] = useState(1);
  const [targetCol, setTargetCol] = useState(1);

  // Student Delete Confirmation
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deletingStudent, setDeletingStudent] = useState(false);

  // Classroom Edit & Delete Modal states
  const [showEditClassroomModal, setShowEditClassroomModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingClassroom, setDeletingClassroom] = useState(false);

  // Bulk Student Import Modal state (CSV / Excel)
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Success Notification banner
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3500);
  };

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

      if (!actionProcessedRef.current) {
        actionProcessedRef.current = true;
        const action = searchParams.get('action');
        if (action === 'assign_student') {
          // Immediately open Assign Student to Seat modal (the exact modal requested)
          setSelectedStudent(null);
          setTargetRow(1);
          setTargetCol(1);
          setStudentModalOpen(true);
        } else if (action === 'bulk_import') {
          setBulkImportOpen(true);
        }
      }
    } catch (err) {
      console.error('Failed to load classroom detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassroomData();
  }, [id]);

  // Open Add Student Modal
  const handleOpenAddStudent = () => {
    setSelectedStudent(null);
    // Find first vacant seat if possible
    let nextRow = 1;
    let nextCol = 1;
    if (classroom) {
      const occupied = new Set(students.map(s => `${s.row_number}-${s.column_number}`));
      let found = false;
      for (let r = 1; r <= classroom.rows && !found; r++) {
        for (let c = 1; c <= classroom.columns && !found; c++) {
          if (!occupied.has(`${r}-${c}`)) {
            nextRow = r;
            nextCol = c;
            found = true;
          }
        }
      }
    }
    setTargetRow(nextRow);
    setTargetCol(nextCol);
    setStudentModalOpen(true);
  };

  // Open Edit Student Modal
  const handleOpenEditStudent = (student: Student) => {
    setSelectedStudent(student);
    setTargetRow(student.row_number);
    setTargetCol(student.column_number);
    setStudentModalOpen(true);
  };

  // Seat Click in Seating Visualization
  const handleSeatClick = (row: number, col: number, student?: Student) => {
    if (student) {
      handleOpenEditStudent(student);
    } else {
      setSelectedStudent(null);
      setTargetRow(row);
      setTargetCol(col);
      setStudentModalOpen(true);
    }
  };

  // Save Student (Add or Edit) with Supabase
  const handleSaveStudent = async (data: Omit<Student, 'id' | 'created_at'>, studentId?: string) => {
    if (studentId) {
      await api.updateStudent(studentId, data);
      showNotification(`Updated student "${data.student_name}" successfully.`);
    } else {
      await api.assignStudent(data);
      showNotification(`Added "${data.student_name}" to Seat R${data.row_number}-C${data.column_number}.`);
    }
    await loadClassroomData();
  };

  // Delete Student
  const handleConfirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setDeletingStudent(true);
      await api.removeStudent(studentToDelete.id);
      showNotification(`Deleted "${studentToDelete.student_name}" from classroom. Position is now VACANT.`);
      await loadClassroomData();
      setStudentToDelete(null);
    } catch (err) {
      console.error('Failed to delete student:', err);
      showNotification('Failed to delete student. Please try again.');
    } finally {
      setDeletingStudent(false);
    }
  };

  // Update Classroom
  const handleUpdateClassroom = async (classroomId: string, updates: Partial<Classroom>) => {
    await api.updateClassroom(classroomId, updates);
    await loadClassroomData();
    setShowEditClassroomModal(false);
    showNotification('Classroom details updated successfully.');
  };

  // Delete Classroom
  const handleDeleteClassroom = async () => {
    if (!classroom) return;
    try {
      setDeletingClassroom(true);
      await api.deleteClassroom(classroom.id);
      navigate('/faculty/classrooms');
    } catch (err) {
      console.error('Failed to delete classroom:', err);
    } finally {
      setDeletingClassroom(false);
      setShowDeleteConfirm(false);
    }
  };

  const downloadRosterCSV = () => {
    if (!classroom) return;
    const filename = `${classroom.class_name.replace(/[^a-zA-Z0-9]/g, '_')}_Student_Roster`;
    const headers = ['Position', 'Row', 'Column', 'Roll Number', 'Student Name', 'Branch', 'Gender'];
    const rows = students.map(s => [
      `R${s.row_number}-C${s.column_number}`,
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
            <span>Loading classroom data...</span>
          </div>
        </div>
      </div>
    );
  }

  const maleCount = students.filter(s => s.gender === 'Male').length;
  const femaleCount = students.filter(s => s.gender === 'Female').length;
  const totalPositions = classroom.total_positions || (classroom.rows * classroom.columns);
  const vacantPositions = Math.max(0, totalPositions - students.length);

  // Filtered students for Manage Students table
  const filteredStudents = students.filter(s => {
    // Gender filter
    if (genderFilter === 'boys' && s.gender !== 'Male') return false;
    if (genderFilter === 'girls' && s.gender !== 'Female') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        s.student_name.toLowerCase().includes(q) ||
        s.roll_number.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        `r${s.row_number}-c${s.column_number}`.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Success Alert Banner */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Back Link */}
        <div>
          <Link 
            to="/faculty/classrooms" 
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to My Classrooms
          </Link>
        </div>

        {/* Empty Classroom Onboarding Banner */}
        {students.length === 0 && (
          <div className="p-6 rounded-3xl bg-linear-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200/80 shadow-xs space-y-3 animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Armchair className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-display">
                    Classroom Ready with {totalPositions} Fixed Seats!
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Assign students to fixed cinema positions. Choose how you'd like to populate seats:
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleOpenAddStudent}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Assign Student to Seat</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBulkImportOpen(true)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-indigo-900 bg-white hover:bg-indigo-100 border border-indigo-300 transition-colors shadow-2xs flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Upload CSV / Excel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CLASSROOM OVERVIEW CARD */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                  {classroom.class_name}
                </h1>
                <span className="text-xs font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full">
                  {classroom.rows} Rows × {classroom.columns} Columns
                </span>
                {(() => {
                  const list = classroom.branches && classroom.branches.length > 0
                    ? classroom.branches
                    : classroom.branch
                    ? classroom.branch.split(/[+,/]/).map(s => s.trim()).filter(Boolean)
                    : [];
                  if (list.length === 0) return null;
                  return (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {list.map((br, idx) => (
                        <span
                          key={idx}
                          className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full border border-indigo-200"
                        >
                          {br}
                        </span>
                      ))}
                      {list.length > 1 && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                          Combined Classroom ({list.length} Streams)
                        </span>
                      )}
                    </div>
                  );
                })()}

                {/* Girls & Boys Seating Division Badges */}
                {classroom.gender_config && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-bold text-pink-800 bg-pink-100 border border-pink-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-600" />
                      👩 Girls: {classroom.gender_config.girls_rows}×{classroom.gender_config.girls_columns} ({classroom.gender_config.girls_total_seats} seats)
                    </span>
                    <span className="text-xs font-bold text-blue-800 bg-blue-100 border border-blue-300 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      👨 Boys: {classroom.gender_config.boys_rows}×{classroom.gender_config.boys_columns} ({classroom.gender_config.boys_total_seats} seats)
                    </span>
                    {classroom.enforce_seating_rule !== false && (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full shadow-2xs">
                        🛡️ Rule: Must & Should Follow
                      </span>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Cinema seating architecture for fixed student positions. Manage students, take live attendance, or view seating.
              </p>
            </div>

            {/* Quick Action Controls: Import, Edit, Delete, Roster */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setBulkImportOpen(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload CSV / Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setShowEditClassroomModal(true)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-slate-500" /> Edit Classroom
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3.5 py-2 text-xs font-semibold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" /> Delete
              </button>

              <button
                type="button"
                onClick={downloadRosterCSV}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
              </button>
            </div>
          </div>

          {/* Overview Stats: Rows x Cols, Total Positions, Total Students, Boys, Girls */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Rows × Cols</span>
              <span className="text-lg font-black text-slate-900 font-mono mt-0.5 block">
                {classroom.rows} × {classroom.columns}
              </span>
              <span className="text-[10px] text-slate-400">Class Dimensions</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
              <span className="text-[11px] font-semibold text-indigo-900 uppercase block">Total Positions</span>
              <span className="text-lg font-black text-indigo-700 font-mono mt-0.5 block">
                {totalPositions}
              </span>
              <span className="text-[10px] text-indigo-500">Fixed Seats</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-[11px] font-semibold text-emerald-900 uppercase block">Total Students</span>
              <span className="text-lg font-black text-emerald-700 font-mono mt-0.5 block">
                {students.length}
              </span>
              <span className="text-[10px] text-emerald-600">Assigned Seats</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="text-[11px] font-semibold text-blue-900 uppercase block">Boys Count</span>
              <span className="text-lg font-black text-blue-700 font-mono mt-0.5 block">
                {maleCount}
              </span>
              <span className="text-[10px] text-blue-600">Male Students</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-pink-50/50 border border-pink-100">
              <span className="text-[11px] font-semibold text-pink-900 uppercase block">Girls Count</span>
              <span className="text-lg font-black text-pink-700 font-mono mt-0.5 block">
                {femaleCount}
              </span>
              <span className="text-[10px] text-pink-600">Female Students</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="text-[11px] font-semibold text-amber-900 uppercase block">Vacant Seats</span>
              <span className="text-lg font-black text-amber-700 font-mono mt-0.5 block">
                {vacantPositions}
              </span>
              <span className="text-[10px] text-amber-600">Unassigned</span>
            </div>
          </div>

          {/* MAIN ACTION BUTTONS BAR: Manage Students | Take Attendance | Attendance History | Reports */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                activeTab === 'manage'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span>Manage Students</span>
            </button>

            <button
              onClick={() => setActiveTab('seating')}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs ${
                activeTab === 'seating'
                  ? 'bg-indigo-600 text-white shadow-indigo-600/20'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>View Seating</span>
            </button>

            <Link
              to={`/faculty/classrooms/${classroom.id}/attendance`}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-xs ml-auto sm:ml-0"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Take Attendance →</span>
            </Link>

            <Link
              to={`/faculty/attendance?classroomId=${classroom.id}`}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all flex items-center gap-2 shadow-2xs"
            >
              <History className="w-4 h-4 text-slate-500" />
              <span>Attendance History</span>
            </Link>

            <Link
              to={`/faculty/reports?classroomId=${classroom.id}`}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all flex items-center gap-2 shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-slate-500" />
              <span>Reports</span>
            </Link>
          </div>
        </div>

        {/* TAB 1: DEDICATED MANAGE STUDENTS INTERFACE (CRUD) */}
        {activeTab === 'manage' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6 animate-in fade-in duration-150">
            {/* Header & Controls Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">
                  Manage Students
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Classroom: <strong className="text-slate-800">{classroom.class_name}</strong> · Full CRUD operations powered by Supabase
                </p>
              </div>

              {/* Action: + Add Student & Import Students */}
              <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setBulkImportOpen(true)}
                  className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-all flex items-center gap-2 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Import Students (CSV / Excel)</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddStudent}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Student</span>
                </button>
              </div>
            </div>

            {/* Controls: Search + Gender Filters [ All ] [ Boys ] [ Girls ] */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by student name, roll number, branch, or position..."
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                />
              </div>

              {/* Gender Filter Buttons: [ All ] [ Boys ] [ Girls ] */}
              <div className="inline-flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setGenderFilter('all')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    genderFilter === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({students.length})
                </button>

                <button
                  type="button"
                  onClick={() => setGenderFilter('boys')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    genderFilter === 'boys'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-blue-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${genderFilter === 'boys' ? 'bg-blue-300' : 'bg-blue-500'}`} />
                  Boys ({maleCount})
                </button>

                <button
                  type="button"
                  onClick={() => setGenderFilter('girls')}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                    genderFilter === 'girls'
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-pink-700'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${genderFilter === 'girls' ? 'bg-pink-300' : 'bg-pink-500'}`} />
                  Girls ({femaleCount})
                </button>
              </div>
            </div>

            {/* Clean Student List Table (From Supabase) */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <th className="py-3 px-4">Position</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Roll Number</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <Armchair className="w-8 h-8 text-slate-300 mx-auto mb-2 opacity-60" />
                        <span className="font-semibold block text-sm text-slate-600">No students found</span>
                        <span className="text-xs text-slate-400 mt-0.5 block">
                          {searchQuery ? 'Try clearing your search query.' : 'Click "+ Add Student" to assign students to fixed positions.'}
                        </span>
                        {!searchQuery && (
                          <button
                            type="button"
                            onClick={handleOpenAddStudent}
                            className="mt-3 px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" /> + Add First Student
                          </button>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map(student => {
                      const posTag = `R${student.row_number}-C${student.column_number}`;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                              {posTag}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal ml-1.5">
                              #{student.position_number}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                            {student.student_name}
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            {student.roll_number}
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-600">
                            {student.branch}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              student.gender === 'Male'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}>
                              {student.gender === 'Male' ? 'Male (Boy)' : 'Female (Girl)'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditStudent(student)}
                                className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Edit3 className="w-3 h-3" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => setStudentToDelete(student)}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CINEMA / THEATRE SEATING VISUALIZATION */}
        {activeTab === 'seating' && (
          <div className="animate-in fade-in duration-150 space-y-4">
            {/* Seating Visualization Top Toolbar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 font-display">
                  Cinema Hall Seating Visualization
                </h3>
                <p className="text-xs text-slate-500">
                  Fixed coordinates: Click any occupied seat to edit student details, or click any vacant seat to assign.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setBulkImportOpen(true)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Upload CSV / Excel</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddStudent}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Student</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('manage')}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <TableIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Switch to Table List</span>
                </button>
              </div>
            </div>

            <SeatingMatrix
              classroom={classroom}
              students={students}
              mode="manage"
              filter={genderFilter}
              onFilterChange={setGenderFilter}
              onSeatClick={handleSeatClick}
              onEditStudent={handleOpenEditStudent}
              onDeleteStudent={st => setStudentToDelete(st)}
              onAddStudent={handleOpenAddStudent}
            />
          </div>
        )}

        {/* Professional Add / Edit Student Modal */}
        <StudentFormModal
          isOpen={studentModalOpen}
          onClose={() => setStudentModalOpen(false)}
          onSave={handleSaveStudent}
          onDelete={handleConfirmDeleteStudent}
          classroom={classroom}
          targetRow={targetRow}
          targetCol={targetCol}
          defaultGender={(() => {
            if (classroom?.gender_config && targetRow && targetCol) {
              const gc = classroom.gender_config;
              if (
                targetRow >= gc.girls_start_row &&
                targetRow <= gc.girls_end_row &&
                targetCol >= gc.girls_start_col &&
                targetCol <= gc.girls_end_col
              ) {
                return 'Female';
              }
              if (
                targetRow >= gc.boys_start_row &&
                targetRow <= gc.boys_end_row &&
                targetCol >= gc.boys_start_col &&
                targetCol <= gc.boys_end_col
              ) {
                return 'Male';
              }
            }
            return genderFilter === 'girls' ? 'Female' : 'Male';
          })()}
          existingStudent={selectedStudent}
          existingStudents={students}
        />

        {/* Confirm Delete Student Modal */}
        {studentToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 text-center animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                Delete {studentToDelete.student_name} from this classroom?
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Roll Number: <strong className="text-slate-800">{studentToDelete.roll_number}</strong>
                <br />
                Seat Position: <strong className="text-indigo-600">R{studentToDelete.row_number}-C{studentToDelete.column_number}</strong> will become <strong className="text-slate-800">VACANT</strong>.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  className="py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingStudent}
                  onClick={handleConfirmDeleteStudent}
                  className="py-2.5 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deletingStudent ? 'Deleting...' : 'Delete Student'}
                </button>
              </div>
            </div>
          </div>
        )}

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
                  className="py-2.5 px-3 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deletingClassroom}
                  onClick={handleDeleteClassroom}
                  className="py-2.5 px-3 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors disabled:opacity-50"
                >
                  {deletingClassroom ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Student Import Modal (CSV & Excel) */}
        <BulkImportModal
          isOpen={bulkImportOpen}
          onClose={() => setBulkImportOpen(false)}
          classroom={classroom}
          existingStudents={students}
          onImportComplete={async () => {
            await loadClassroomData();
            showNotification('Students successfully imported and auto-assigned to seats!');
          }}
          onExpandClassroom={async (newRows, newCols) => {
            await api.updateClassroom(classroom.id, { rows: newRows, columns: newCols, total_positions: newRows * newCols });
            await loadClassroomData();
            showNotification(`Classroom enlarged to ${newRows} Rows × ${newCols} Columns (${newRows * newCols} Seats).`);
          }}
        />

      </main>
    </div>
  );
};
