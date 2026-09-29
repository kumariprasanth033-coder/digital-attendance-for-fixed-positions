import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  Classroom, 
  Student, 
  AttendanceSession, 
  AttendanceRecord, 
  Profile, 
  ActivityLog,
  StudentAggregateReport,
  MarkState
} from '../types';

// ============================================================================
// INITIAL REALISTIC SEED DATA (Used when Supabase is initially unconnected)
// ============================================================================

const SEED_PROFILES: Profile[] = [
  {
    id: 'faculty-demo-001',
    full_name: 'Dr. Ramesh Kumar',
    email: 'ramesh.faculty@university.edu',
    role: 'faculty',
    account_status: 'active',
    created_at: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'admin-demo-001',
    full_name: 'Admin Dean Office',
    email: 'admin.portal@university.edu',
    role: 'admin',
    account_status: 'active',
    created_at: new Date(Date.now() - 60 * 86400000).toISOString()
  }
];

const SEED_CLASSROOMS: Classroom[] = [
  {
    id: 'cls-aids-001',
    faculty_id: 'faculty-demo-001',
    class_name: 'AI & DS - Section A',
    rows: 4,
    columns: 4,
    total_positions: 16,
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    faculty_name: 'Dr. Ramesh Kumar'
  },
  {
    id: 'cls-cse-002',
    faculty_id: 'faculty-demo-001',
    class_name: 'CSE - Cloud Computing Lab',
    rows: 3,
    columns: 4,
    total_positions: 12,
    created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    faculty_name: 'Dr. Ramesh Kumar'
  }
];

const SEED_STUDENTS: Student[] = [
  // 16 Students for AI & DS - Section A (4x4 = 16)
  { id: 'st-01', classroom_id: 'cls-aids-001', student_name: 'Aarav Sharma', roll_number: '23A81A0501', branch: 'AI & DS', gender: 'Male', row_number: 1, column_number: 1, position_number: 1, created_at: new Date().toISOString() },
  { id: 'st-02', classroom_id: 'cls-aids-001', student_name: 'Rohan Verma', roll_number: '23A81A0502', branch: 'AI & DS', gender: 'Male', row_number: 1, column_number: 2, position_number: 2, created_at: new Date().toISOString() },
  { id: 'st-03', classroom_id: 'cls-aids-001', student_name: 'Ananya Iyer', roll_number: '23A81A0503', branch: 'AI & DS', gender: 'Female', row_number: 1, column_number: 3, position_number: 3, created_at: new Date().toISOString() },
  { id: 'st-04', classroom_id: 'cls-aids-001', student_name: 'Diya Reddy', roll_number: '23A81A0504', branch: 'AI & DS', gender: 'Female', row_number: 1, column_number: 4, position_number: 4, created_at: new Date().toISOString() },

  { id: 'st-05', classroom_id: 'cls-aids-001', student_name: 'Rahul Nair', roll_number: '23A81A0505', branch: 'AI & DS', gender: 'Male', row_number: 2, column_number: 1, position_number: 5, created_at: new Date().toISOString() },
  { id: 'st-06', classroom_id: 'cls-aids-001', student_name: 'Siddharth Sen', roll_number: '23A81A0506', branch: 'AI & DS', gender: 'Male', row_number: 2, column_number: 2, position_number: 6, created_at: new Date().toISOString() },
  { id: 'st-07', classroom_id: 'cls-aids-001', student_name: 'Kavya Pillai', roll_number: '23A81A0507', branch: 'AI & DS', gender: 'Female', row_number: 2, column_number: 3, position_number: 7, created_at: new Date().toISOString() },
  { id: 'st-08', classroom_id: 'cls-aids-001', student_name: 'Sneha Patel', roll_number: '23A81A0508', branch: 'AI & DS', gender: 'Female', row_number: 2, column_number: 4, position_number: 8, created_at: new Date().toISOString() },

  { id: 'st-09', classroom_id: 'cls-aids-001', student_name: 'Aditya Joshi', roll_number: '23A81A0509', branch: 'AI & DS', gender: 'Male', row_number: 3, column_number: 1, position_number: 9, created_at: new Date().toISOString() },
  { id: 'st-10', classroom_id: 'cls-aids-001', student_name: 'Karan Gupta', roll_number: '23A81A0510', branch: 'AI & DS', gender: 'Male', row_number: 3, column_number: 2, position_number: 10, created_at: new Date().toISOString() },
  { id: 'st-11', classroom_id: 'cls-aids-001', student_name: 'Pooja Hegde', roll_number: '23A81A0511', branch: 'AI & DS', gender: 'Female', row_number: 3, column_number: 3, position_number: 11, created_at: new Date().toISOString() },
  { id: 'st-12', classroom_id: 'cls-aids-001', student_name: 'Meera Menon', roll_number: '23A81A0512', branch: 'AI & DS', gender: 'Female', row_number: 3, column_number: 4, position_number: 12, created_at: new Date().toISOString() },

  { id: 'st-13', classroom_id: 'cls-aids-001', student_name: 'Vikram Malhotra', roll_number: '23A81A0513', branch: 'AI & DS', gender: 'Male', row_number: 4, column_number: 1, position_number: 13, created_at: new Date().toISOString() },
  { id: 'st-14', classroom_id: 'cls-aids-001', student_name: 'Arjun Saxena', roll_number: '23A81A0514', branch: 'AI & DS', gender: 'Male', row_number: 4, column_number: 2, position_number: 14, created_at: new Date().toISOString() },
  { id: 'st-15', classroom_id: 'cls-aids-001', student_name: 'Tanvi Deshmukh', roll_number: '23A81A0515', branch: 'AI & DS', gender: 'Female', row_number: 4, column_number: 3, position_number: 15, created_at: new Date().toISOString() },
  { id: 'st-16', classroom_id: 'cls-aids-001', student_name: 'Isha Kulkarni', roll_number: '23A81A0516', branch: 'AI & DS', gender: 'Female', row_number: 4, column_number: 4, position_number: 16, created_at: new Date().toISOString() },

  // Students for CSE Lab
  { id: 'st-cse-01', classroom_id: 'cls-cse-002', student_name: 'Manish Pandey', roll_number: '23A81A0401', branch: 'CSE', gender: 'Male', row_number: 1, column_number: 1, position_number: 1, created_at: new Date().toISOString() },
  { id: 'st-cse-02', classroom_id: 'cls-cse-002', student_name: 'Priyanka Bose', roll_number: '23A81A0402', branch: 'CSE', gender: 'Female', row_number: 1, column_number: 2, position_number: 2, created_at: new Date().toISOString() },
  { id: 'st-cse-03', classroom_id: 'cls-cse-002', student_name: 'Nikhil Rathi', roll_number: '23A81A0403', branch: 'CSE', gender: 'Male', row_number: 1, column_number: 3, position_number: 3, created_at: new Date().toISOString() }
];

const SEED_SESSIONS: AttendanceSession[] = [
  {
    id: 'ses-001',
    classroom_id: 'cls-aids-001',
    faculty_id: 'faculty-demo-001',
    attendance_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    start_time: '09:00:00',
    notes: 'Lecture on Deep Learning & CNN Architecture',
    created_at: new Date(Date.now() - 86400000).toISOString(),
    class_name: 'AI & DS - Section A',
    total_students: 16,
    present_count: 14,
    absent_count: 2,
    attendance_percentage: 87.5
  },
  {
    id: 'ses-002',
    classroom_id: 'cls-aids-001',
    faculty_id: 'faculty-demo-001',
    attendance_date: new Date().toISOString().split('T')[0],
    start_time: '11:30:00',
    notes: 'Lab Session: Matrix Seating & Graph Theory',
    created_at: new Date().toISOString(),
    class_name: 'AI & DS - Section A',
    total_students: 16,
    present_count: 15,
    absent_count: 1,
    attendance_percentage: 93.8
  }
];

const SEED_RECORDS: AttendanceRecord[] = [
  // Session 1: 14 Present, 2 Absent (6 & 15 Absent)
  ...SEED_STUDENTS.filter(s => s.classroom_id === 'cls-aids-001').map(s => ({
    id: `rec-ses1-${s.id}`,
    session_id: 'ses-001',
    student_id: s.id,
    status: (s.position_number === 6 || s.position_number === 15 ? 'Absent' : 'Present') as 'Present' | 'Absent',
    marked_at: new Date(Date.now() - 86400000).toISOString(),
    student_name: s.student_name,
    roll_number: s.roll_number,
    branch: s.branch,
    gender: s.gender,
    row_number: s.row_number,
    column_number: s.column_number,
    position_number: s.position_number
  })),
  // Session 2: 15 Present, 1 Absent (10 Absent)
  ...SEED_STUDENTS.filter(s => s.classroom_id === 'cls-aids-001').map(s => ({
    id: `rec-ses2-${s.id}`,
    session_id: 'ses-002',
    student_id: s.id,
    status: (s.position_number === 10 ? 'Absent' : 'Present') as 'Present' | 'Absent',
    marked_at: new Date().toISOString(),
    student_name: s.student_name,
    roll_number: s.roll_number,
    branch: s.branch,
    gender: s.gender,
    row_number: s.row_number,
    column_number: s.column_number,
    position_number: s.position_number
  }))
];

const SEED_LOGS: ActivityLog[] = [
  { id: 'log-1', user_id: 'faculty-demo-001', action: 'CREATE_CLASSROOM', description: 'Classroom "AI & DS - Section A" created with 4x4 layout', created_at: new Date(Date.now() - 14 * 86400000).toISOString(), user_name: 'Dr. Ramesh Kumar' },
  { id: 'log-2', user_id: 'faculty-demo-001', action: 'ASSIGN_STUDENTS', description: 'Assigned 16 students to fixed seating positions', created_at: new Date(Date.now() - 13 * 86400000).toISOString(), user_name: 'Dr. Ramesh Kumar' },
  { id: 'log-3', user_id: 'faculty-demo-001', action: 'SUBMIT_ATTENDANCE', description: 'Marked attendance session: 14 Present, 2 Absent (87.5%)', created_at: new Date(Date.now() - 86400000).toISOString(), user_name: 'Dr. Ramesh Kumar' },
  { id: 'log-4', user_id: 'admin-demo-001', action: 'ADMIN_AUDIT', description: 'Routine system audit completed across faculty departments', created_at: new Date().toISOString(), user_name: 'Admin Dean Office' }
];

// Persistent state wrapper
class LocalStorageDatabase {
  private getItem<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(`digital_att_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(`digital_att_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage write failed:', e);
    }
  }

  getProfiles(): Profile[] {
    return this.getItem<Profile[]>('profiles', SEED_PROFILES);
  }
  setProfiles(profiles: Profile[]): void {
    this.setItem('profiles', profiles);
  }

  getClassrooms(): Classroom[] {
    return this.getItem<Classroom[]>('classrooms', SEED_CLASSROOMS);
  }
  setClassrooms(classrooms: Classroom[]): void {
    this.setItem('classrooms', classrooms);
  }

  getStudents(): Student[] {
    return this.getItem<Student[]>('students', SEED_STUDENTS);
  }
  setStudents(students: Student[]): void {
    this.setItem('students', students);
  }

  getSessions(): AttendanceSession[] {
    return this.getItem<AttendanceSession[]>('sessions', SEED_SESSIONS);
  }
  setSessions(sessions: AttendanceSession[]): void {
    this.setItem('sessions', sessions);
  }

  getRecords(): AttendanceRecord[] {
    return this.getItem<AttendanceRecord[]>('records', SEED_RECORDS);
  }
  setRecords(records: AttendanceRecord[]): void {
    this.setItem('records', records);
  }

  getLogs(): ActivityLog[] {
    return this.getItem<ActivityLog[]>('logs', SEED_LOGS);
  }
  setLogs(logs: ActivityLog[]): void {
    this.setItem('logs', logs);
  }

  resetToSeed(): void {
    this.setProfiles(SEED_PROFILES);
    this.setClassrooms(SEED_CLASSROOMS);
    this.setStudents(SEED_STUDENTS);
    this.setSessions(SEED_SESSIONS);
    this.setRecords(SEED_RECORDS);
    this.setLogs(SEED_LOGS);
  }
}

export const localDb = new LocalStorageDatabase();

// ============================================================================
// UNIFIED DATA SERVICE (Supabase + Resilient Local Persistence)
// ============================================================================

export const api = {
  // --------------------------------------------------------------------------
  // CLASSROOMS CRUD
  // --------------------------------------------------------------------------
  async getClassrooms(facultyId?: string): Promise<Classroom[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        let query = client.from('classrooms').select(`
          id, faculty_id, class_name, rows, columns, total_positions, created_at, updated_at
        `);
        if (facultyId) {
          query = query.eq('faculty_id', facultyId);
        }
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        
        // Enrich with student count
        const classrooms: Classroom[] = [];
        for (const item of (data || [])) {
          const { count } = await client
            .from('students')
            .select('*', { count: 'exact', head: true })
            .eq('classroom_id', item.id);
          classrooms.push({
            ...item,
            student_count: count ?? 0
          });
        }
        return classrooms;
      } catch (err) {
        console.warn('Supabase query error, using local database:', err);
      }
    }

    // Local fallback
    const all = localDb.getClassrooms();
    const students = localDb.getStudents();
    const sessions = localDb.getSessions();

    const filtered = facultyId ? all.filter(c => c.faculty_id === facultyId) : all;
    return filtered.map(c => {
      const clsStudents = students.filter(s => s.classroom_id === c.id);
      const clsSessions = sessions.filter(s => s.classroom_id === c.id);
      const latestSession = clsSessions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      return {
        ...c,
        student_count: clsStudents.length,
        latest_attendance: latestSession?.attendance_date,
        attendance_percentage: latestSession?.attendance_percentage
      };
    });
  },

  async getClassroomById(id: string): Promise<Classroom | null> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('classrooms')
          .select('*')
          .eq('id', id)
          .single();
        if (error) throw error;
        return data as Classroom;
      } catch (err) {
        console.warn('Supabase getClassroomById error:', err);
      }
    }
    const all = localDb.getClassrooms();
    const found = all.find(c => c.id === id);
    if (!found) return null;
    const students = localDb.getStudents().filter(s => s.classroom_id === id);
    return { ...found, student_count: students.length };
  },

  async createClassroom(payload: { faculty_id: string; class_name: string; rows: number; columns: number }): Promise<Classroom> {
    const total_positions = payload.rows * payload.columns;

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('classrooms')
          .insert([{
            faculty_id: payload.faculty_id,
            class_name: payload.class_name.trim(),
            rows: payload.rows,
            columns: payload.columns
          }])
          .select()
          .single();
        if (error) throw error;
        
        await this.logActivity(payload.faculty_id, 'CREATE_CLASSROOM', `Created classroom "${payload.class_name}" (${payload.rows}x${payload.columns})`);
        return data as Classroom;
      } catch (err) {
        console.warn('Supabase createClassroom error, falling back:', err);
      }
    }

    const newClassroom: Classroom = {
      id: `cls-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      faculty_id: payload.faculty_id,
      class_name: payload.class_name.trim(),
      rows: payload.rows,
      columns: payload.columns,
      total_positions,
      created_at: new Date().toISOString(),
      student_count: 0
    };

    const current = localDb.getClassrooms();
    localDb.setClassrooms([newClassroom, ...current]);
    await this.logActivity(payload.faculty_id, 'CREATE_CLASSROOM', `Created classroom "${payload.class_name}" (${payload.rows}x${payload.columns})`);
    return newClassroom;
  },

  async updateClassroom(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('classrooms')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Classroom;
      } catch (err) {
        console.warn('Supabase updateClassroom error:', err);
      }
    }

    const current = localDb.getClassrooms();
    const idx = current.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Classroom not found');
    const updated = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
    current[idx] = updated;
    localDb.setClassrooms(current);
    return updated;
  },

  async deleteClassroom(id: string, userId?: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { error } = await client.from('classrooms').delete().eq('id', id);
        if (error) throw error;
        if (userId) {
          await this.logActivity(userId, 'DELETE_CLASSROOM', `Deleted classroom ID ${id}`);
        }
        return true;
      } catch (err) {
        console.warn('Supabase deleteClassroom error:', err);
      }
    }

    // Delete cascade locally
    const classrooms = localDb.getClassrooms().filter(c => c.id !== id);
    localDb.setClassrooms(classrooms);

    const students = localDb.getStudents().filter(s => s.classroom_id !== id);
    localDb.setStudents(students);

    const sessionsToDelete = localDb.getSessions().filter(s => s.classroom_id === id).map(s => s.id);
    const sessions = localDb.getSessions().filter(s => s.classroom_id !== id);
    localDb.setSessions(sessions);

    const records = localDb.getRecords().filter(r => !sessionsToDelete.includes(r.session_id));
    localDb.setRecords(records);

    if (userId) {
      await this.logActivity(userId, 'DELETE_CLASSROOM', `Deleted classroom ID: ${id}`);
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // STUDENTS CRUD & FIXED POSITION MANAGEMENT
  // --------------------------------------------------------------------------
  async getStudentsByClassroom(classroomId: string): Promise<Student[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('students')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('position_number', { ascending: true });
        if (error) throw error;
        return data as Student[];
      } catch (err) {
        console.warn('Supabase getStudentsByClassroom error:', err);
      }
    }

    const students = localDb.getStudents()
      .filter(s => s.classroom_id === classroomId)
      .sort((a, b) => a.position_number - b.position_number);
    return students;
  },

  async getAllStudents(): Promise<Student[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('students')
          .select('*')
          .order('student_name', { ascending: true });
        if (error) throw error;
        return data as Student[];
      } catch (err) {
        console.warn('Supabase getAllStudents error:', err);
      }
    }
    return localDb.getStudents();
  },

  async assignStudent(student: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
    // 1. Validation checks
    const existingStudents = await this.getStudentsByClassroom(student.classroom_id);

    // Prevent duplicate roll number in same classroom
    const duplicateRoll = existingStudents.find(
      s => s.roll_number.toLowerCase() === student.roll_number.toLowerCase()
    );
    if (duplicateRoll) {
      throw new Error(`Roll number "${student.roll_number}" is already assigned to ${duplicateRoll.student_name}.`);
    }

    // Prevent duplicate seat assignment
    const duplicateSeat = existingStudents.find(
      s => s.row_number === student.row_number && s.column_number === student.column_number
    );
    if (duplicateSeat) {
      throw new Error(`Seat (Row ${student.row_number}, Column ${student.column_number}) is already occupied by ${duplicateSeat.student_name}.`);
    }

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('students')
          .insert([student])
          .select()
          .single();
        if (error) throw error;
        return data as Student;
      } catch (err) {
        console.warn('Supabase assignStudent error:', err);
      }
    }

    const newStudent: Student = {
      ...student,
      id: `st-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      created_at: new Date().toISOString()
    };

    const current = localDb.getStudents();
    localDb.setStudents([...current, newStudent]);
    return newStudent;
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('students')
          .update(updates)
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data as Student;
      } catch (err) {
        console.warn('Supabase updateStudent error:', err);
      }
    }

    const current = localDb.getStudents();
    const idx = current.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Student not found');
    const updated = { ...current[idx], ...updates, updated_at: new Date().toISOString() };
    current[idx] = updated;
    localDb.setStudents(current);
    return updated;
  },

  async removeStudent(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { error } = await client.from('students').delete().eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.warn('Supabase removeStudent error:', err);
      }
    }

    const students = localDb.getStudents().filter(s => s.id !== id);
    localDb.setStudents(students);
    return true;
  },

  // --------------------------------------------------------------------------
  // ATTENDANCE SESSIONS & RECORDS
  // --------------------------------------------------------------------------
  async submitAttendanceSession(payload: {
    classroom_id: string;
    faculty_id: string;
    attendance_date: string;
    start_time: string;
    notes?: string;
    marks: Record<string, MarkState>; // student_id -> 'Present' | 'Absent'
  }): Promise<AttendanceSession> {
    const students = await this.getStudentsByClassroom(payload.classroom_id);
    const total_students = students.length;
    
    let present_count = 0;
    let absent_count = 0;

    const recordsToInsert: Array<{ student_id: string; status: 'Present' | 'Absent' }> = [];

    students.forEach(s => {
      const mark = payload.marks[s.id];
      const status: 'Present' | 'Absent' = mark === 'Absent' ? 'Absent' : 'Present'; // default to present if unmarked, or mark as present
      if (status === 'Present') present_count++;
      else absent_count++;

      recordsToInsert.push({
        student_id: s.id,
        status
      });
    });

    const attendance_percentage = total_students > 0 
      ? Math.round((present_count / total_students) * 1000) / 10 
      : 0;

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        // Insert session
        const { data: sessionData, error: sessionErr } = await client
          .from('attendance_sessions')
          .insert([{
            classroom_id: payload.classroom_id,
            faculty_id: payload.faculty_id,
            attendance_date: payload.attendance_date,
            start_time: payload.start_time,
            notes: payload.notes || null
          }])
          .select()
          .single();

        if (sessionErr) throw sessionErr;

        // Insert batch records
        const recordsPayload = recordsToInsert.map(r => ({
          session_id: sessionData.id,
          student_id: r.student_id,
          status: r.status
        }));

        const { error: recordsErr } = await client
          .from('attendance_records')
          .insert(recordsPayload);

        if (recordsErr) throw recordsErr;

        await this.logActivity(
          payload.faculty_id, 
          'SUBMIT_ATTENDANCE', 
          `Submitted attendance session: ${present_count} Present, ${absent_count} Absent (${attendance_percentage}%)`
        );

        return {
          ...sessionData,
          total_students,
          present_count,
          absent_count,
          attendance_percentage
        } as AttendanceSession;
      } catch (err) {
        console.warn('Supabase submitAttendanceSession error, using local:', err);
      }
    }

    const sessionId = `ses-${Date.now()}`;
    const newSession: AttendanceSession = {
      id: sessionId,
      classroom_id: payload.classroom_id,
      faculty_id: payload.faculty_id,
      attendance_date: payload.attendance_date,
      start_time: payload.start_time,
      notes: payload.notes,
      created_at: new Date().toISOString(),
      total_students,
      present_count,
      absent_count,
      attendance_percentage
    };

    const newRecords: AttendanceRecord[] = students.map(s => {
      const status: 'Present' | 'Absent' = payload.marks[s.id] === 'Absent' ? 'Absent' : 'Present';
      return {
        id: `rec-${sessionId}-${s.id}`,
        session_id: sessionId,
        student_id: s.id,
        status,
        marked_at: new Date().toISOString(),
        student_name: s.student_name,
        roll_number: s.roll_number,
        branch: s.branch,
        gender: s.gender,
        row_number: s.row_number,
        column_number: s.column_number,
        position_number: s.position_number
      };
    });

    const sessions = localDb.getSessions();
    localDb.setSessions([newSession, ...sessions]);

    const records = localDb.getRecords();
    localDb.setRecords([...records, ...newRecords]);

    await this.logActivity(
      payload.faculty_id, 
      'SUBMIT_ATTENDANCE', 
      `Recorded attendance: ${present_count} Present, ${absent_count} Absent (${attendance_percentage}%)`
    );

    return newSession;
  },

  async getAttendanceSessions(filter?: { faculty_id?: string; classroom_id?: string; date?: string }): Promise<AttendanceSession[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        let query = client.from('attendance_sessions').select(`
          id, classroom_id, faculty_id, attendance_date, start_time, notes, created_at,
          classrooms(class_name)
        `);

        if (filter?.faculty_id) query = query.eq('faculty_id', filter.faculty_id);
        if (filter?.classroom_id) query = query.eq('classroom_id', filter.classroom_id);
        if (filter?.date) query = query.eq('attendance_date', filter.date);

        const { data, error } = await query.order('attendance_date', { ascending: false });
        if (error) throw error;

        // Fetch counts for each session
        const enriched: AttendanceSession[] = [];
        for (const item of (data || [])) {
          const { data: recs } = await client
            .from('attendance_records')
            .select('status')
            .eq('session_id', item.id);
          
          const present = recs?.filter(r => r.status === 'Present').length || 0;
          const absent = recs?.filter(r => r.status === 'Absent').length || 0;
          const total = present + absent;
          const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

          enriched.push({
            id: item.id,
            classroom_id: item.classroom_id,
            faculty_id: item.faculty_id,
            attendance_date: item.attendance_date,
            start_time: item.start_time,
            notes: item.notes,
            created_at: item.created_at,
            class_name: (item.classrooms as unknown as { class_name: string })?.class_name || 'Classroom',
            total_students: total,
            present_count: present,
            absent_count: absent,
            attendance_percentage: pct
          });
        }
        return enriched;
      } catch (err) {
        console.warn('Supabase getAttendanceSessions error:', err);
      }
    }

    let sessions = localDb.getSessions();
    const classrooms = localDb.getClassrooms();
    const records = localDb.getRecords();

    if (filter?.faculty_id) sessions = sessions.filter(s => s.faculty_id === filter.faculty_id);
    if (filter?.classroom_id) sessions = sessions.filter(s => s.classroom_id === filter.classroom_id);
    if (filter?.date) sessions = sessions.filter(s => s.attendance_date === filter.date);

    return sessions.map(s => {
      const cls = classrooms.find(c => c.id === s.classroom_id);
      const sessionRecords = records.filter(r => r.session_id === s.id);
      const present = sessionRecords.filter(r => r.status === 'Present').length;
      const absent = sessionRecords.filter(r => r.status === 'Absent').length;
      const total = sessionRecords.length || (s.total_students ?? 0);
      const pct = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

      return {
        ...s,
        class_name: cls?.class_name || 'Classroom',
        total_students: total,
        present_count: present,
        absent_count: absent,
        attendance_percentage: pct
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('attendance_records')
          .select(`
            id, session_id, student_id, status, marked_at,
            students(student_name, roll_number, branch, gender, row_number, column_number, position_number)
          `)
          .eq('session_id', sessionId);
        if (error) throw error;
        return (data || []).map(r => {
          const st = r.students as unknown as Student;
          return {
            id: r.id,
            session_id: r.session_id,
            student_id: r.student_id,
            status: r.status,
            marked_at: r.marked_at,
            student_name: st?.student_name,
            roll_number: st?.roll_number,
            branch: st?.branch,
            gender: st?.gender,
            row_number: st?.row_number,
            column_number: st?.column_number,
            position_number: st?.position_number
          };
        });
      } catch (err) {
        console.warn('Supabase getSessionRecords error:', err);
      }
    }

    const records = localDb.getRecords().filter(r => r.session_id === sessionId);
    const students = localDb.getStudents();
    return records.map(r => {
      const student = students.find(s => s.id === r.student_id);
      return {
        ...r,
        student_name: student?.student_name || r.student_name,
        roll_number: student?.roll_number || r.roll_number,
        branch: student?.branch || r.branch,
        gender: student?.gender || r.gender,
        row_number: student?.row_number || r.row_number,
        column_number: student?.column_number || r.column_number,
        position_number: student?.position_number || r.position_number
      };
    }).sort((a, b) => (a.position_number || 0) - (b.position_number || 0));
  },

  // --------------------------------------------------------------------------
  // COMBINED ATTENDANCE REPORTS & CSV GENERATION
  // --------------------------------------------------------------------------
  async getCombinedReport(classroomId: string): Promise<StudentAggregateReport[]> {
    const students = await this.getStudentsByClassroom(classroomId);
    const sessions = await this.getAttendanceSessions({ classroom_id: classroomId });
    const sessionIds = sessions.map(s => s.id);
    const cls = await this.getClassroomById(classroomId);

    let allRecords: AttendanceRecord[] = [];
    if (isSupabaseConfigured() && sessionIds.length > 0) {
      try {
        const client = getSupabase();
        const { data } = await client
          .from('attendance_records')
          .select('*')
          .in('session_id', sessionIds);
        allRecords = data || [];
      } catch {
        allRecords = localDb.getRecords().filter(r => sessionIds.includes(r.session_id));
      }
    } else {
      allRecords = localDb.getRecords().filter(r => sessionIds.includes(r.session_id));
    }

    const report: StudentAggregateReport[] = students.map(student => {
      const studentRecords = allRecords.filter(r => r.student_id === student.id);
      const total_sessions = sessions.length;
      const present_count = studentRecords.filter(r => r.status === 'Present').length;
      const absent_count = studentRecords.filter(r => r.status === 'Absent').length;
      const percentage = total_sessions > 0 ? Math.round((present_count / total_sessions) * 1000) / 10 : 0;

      return {
        student_id: student.id,
        roll_number: student.roll_number,
        student_name: student.student_name,
        branch: student.branch,
        gender: student.gender,
        row_number: student.row_number,
        column_number: student.column_number,
        position_number: student.position_number,
        classroom_name: cls?.class_name || 'Classroom',
        total_sessions,
        present_count,
        absent_count,
        percentage
      };
    });

    return report.sort((a, b) => a.position_number - b.position_number);
  },

  downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
    const sanitize = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(sanitize).join(','),
      ...rows.map(row => row.map(sanitize).join(','))
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  // --------------------------------------------------------------------------
  // USER PROFILES & ADMIN MANAGEMENT
  // --------------------------------------------------------------------------
  async getProfiles(): Promise<Profile[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client.from('profiles').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data as Profile[];
      } catch (err) {
        console.warn('Supabase getProfiles error:', err);
      }
    }
    return localDb.getProfiles();
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client.from('profiles').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as Profile;
      } catch (err) {
        console.warn('Supabase updateProfile error:', err);
      }
    }

    const profiles = localDb.getProfiles();
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Profile not found');
    const updated = { ...profiles[idx], ...updates, updated_at: new Date().toISOString() };
    profiles[idx] = updated;
    localDb.setProfiles(profiles);
    return updated;
  },

  async deleteAccount(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        await client.from('profiles').delete().eq('id', id);
        // Supabase auth deletion is handled via service-role or cascading triggers
        return true;
      } catch (err) {
        console.warn('Supabase deleteAccount error:', err);
      }
    }

    // Delete locally
    const profiles = localDb.getProfiles().filter(p => p.id !== id);
    localDb.setProfiles(profiles);

    // Delete their classrooms & students
    const classrooms = localDb.getClassrooms().filter(c => c.faculty_id === id);
    for (const c of classrooms) {
      await this.deleteClassroom(c.id);
    }
    return true;
  },

  async logActivity(userId: string, action: string, description: string): Promise<void> {
    try {
      const logs = localDb.getLogs();
      const newLog: ActivityLog = {
        id: `log-${Date.now()}`,
        user_id: userId,
        action,
        description,
        created_at: new Date().toISOString()
      };
      localDb.setLogs([newLog, ...logs.slice(0, 99)]);
    } catch {
      // quiet fail
    }
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    return localDb.getLogs();
  }
};
