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

const API_BASE = '/api';

/**
 * Unified Database API Service.
 * Connects directly to the central server persistence layer.
 * Zero device-specific localStorage for classroom or attendance records.
 * Multi-device synchronized.
 */
export const api = {
  // --------------------------------------------------------------------------
  // CLASSROOMS CRUD
  // --------------------------------------------------------------------------
  async getClassrooms(facultyId?: string): Promise<Classroom[]> {
    const url = facultyId 
      ? `${API_BASE}/classrooms?faculty_id=${encodeURIComponent(facultyId)}`
      : `${API_BASE}/classrooms`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load classrooms: ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getClassroomById(id: string): Promise<Classroom | null> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Failed to load classroom details: ${res.statusText}`);
    }
    return await res.json();
  },

  async createClassroom(payload: { 
    faculty_id: string; 
    class_name: string; 
    rows: number; 
    columns: number;
    branch?: string;
    branches?: string[];
    branch_configs?: import('../types').BranchSeatingConfig[];
    seating_division_mode?: 'gender' | 'branch' | 'both' | 'unified';
    gender_config?: import('../types').GenderSeatingConfig;
    enforce_seating_rule?: boolean;
  }): Promise<Classroom> {
    const res = await fetch(`${API_BASE}/classrooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to create classroom');
    }
    return await res.json();
  },

  async updateClassroom(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to update classroom');
    }
    return await res.json();
  },

  async deleteClassroom(id: string, userId?: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to delete classroom');
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // SEATS & STUDENTS CRUD
  // --------------------------------------------------------------------------
  async getSeatsByClassroom(classroomId: string): Promise<Array<{
    id: string;
    classroom_id: string;
    row_number: number;
    column_number: number;
    position_number: number;
    seat_code: string;
  }>> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(classroomId)}/seats`);
    if (!res.ok) {
      throw new Error(`Failed to load seats: ${res.statusText}`);
    }
    return await res.json();
  },

  async getStudentsByClassroom(classroomId: string): Promise<Student[]> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(classroomId)}/students`);
    if (!res.ok) {
      throw new Error(`Failed to load classroom students: ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getAllStudents(): Promise<Student[]> {
    const classrooms = await this.getClassrooms();
    let all: Student[] = [];
    for (const c of classrooms) {
      const st = await this.getStudentsByClassroom(c.id);
      all = [...all, ...st];
    }
    return all;
  },

  async assignStudent(student: Omit<Student, 'id' | 'created_at'>): Promise<Student> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(student.classroom_id)}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(student)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to assign student');
    }
    return await res.json();
  },

  async bulkAssignStudents(
    classroomId: string, 
    newStudents: Array<Omit<Student, 'id' | 'created_at'>>
  ): Promise<{ inserted: Student[]; count: number }> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(classroomId)}/students/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ students: newStudents })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to import students');
    }
    return await res.json();
  },

  async updateStudent(id: string, updates: Partial<Student>): Promise<Student> {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to update student');
    }
    return await res.json();
  },

  async removeStudent(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/students/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to remove student');
    }
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
    marks: Record<string, MarkState>;
  }): Promise<AttendanceSession> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(payload.classroom_id)}/attendance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Failed to submit attendance session');
    }
    return await res.json();
  },

  async getAttendanceSessions(filter?: { faculty_id?: string; classroom_id?: string; date?: string }): Promise<AttendanceSession[]> {
    const params = new URLSearchParams();
    if (filter?.faculty_id) params.append('faculty_id', filter.faculty_id);
    if (filter?.classroom_id) params.append('classroom_id', filter.classroom_id);
    if (filter?.date) params.append('date', filter.date);

    const res = await fetch(`${API_BASE}/attendance/sessions?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`Failed to load attendance sessions: ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getSessionRecords(sessionId: string): Promise<AttendanceRecord[]> {
    const res = await fetch(`${API_BASE}/attendance/sessions/${encodeURIComponent(sessionId)}/records`);
    if (!res.ok) {
      throw new Error(`Failed to load session records: ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  async getCombinedReport(classroomId: string): Promise<StudentAggregateReport[]> {
    const res = await fetch(`${API_BASE}/classrooms/${encodeURIComponent(classroomId)}/reports`);
    if (!res.ok) {
      throw new Error(`Failed to load attendance reports: ${res.statusText}`);
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  // --------------------------------------------------------------------------
  // PROFILES & ACTIVITY LOGS
  // --------------------------------------------------------------------------
  async getProfiles(): Promise<Profile[]> {
    const res = await fetch(`${API_BASE}/profiles`);
    if (!res.ok) {
      throw new Error(`Failed to load profiles: ${res.statusText}`);
    }
    return await res.json();
  },

  async updateProfile(id: string, updates: Partial<Profile>): Promise<Profile> {
    const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) {
      throw new Error(`Failed to update profile: ${res.statusText}`);
    }
    return await res.json();
  },

  async deleteAccount(id: string): Promise<boolean> {
    const res = await fetch(`${API_BASE}/profiles/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  },

  async logActivity(userId: string, action: string, description: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, action, description })
      });
    } catch {
      // Non-blocking
    }
  },

  async getActivityLogs(): Promise<ActivityLog[]> {
    const res = await fetch(`${API_BASE}/logs`);
    if (!res.ok) return [];
    return await res.json();
  },

  downloadCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
    const csvContent = [
      headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

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
  // REAL-TIME SYNCHRONIZATION (SSE)
  // --------------------------------------------------------------------------
  subscribeToUpdates(callback: (event: { type: string; data: unknown }) => void): () => void {
    if (typeof EventSource === 'undefined') {
      return () => {};
    }
    try {
      const eventSource = new EventSource(`${API_BASE}/realtime/updates`);
      eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          callback(parsed);
        } catch {
          // ignore
        }
      };
      return () => {
        eventSource.close();
      };
    } catch {
      return () => {};
    }
  }
};
