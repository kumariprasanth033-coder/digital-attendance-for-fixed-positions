export type UserRole = 'faculty' | 'admin';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  account_status: 'active' | 'suspended' | 'pending';
  created_at: string;
  updated_at?: string;
}

export interface Classroom {
  id: string;
  faculty_id: string;
  class_name: string;
  rows: number;
  columns: number;
  total_positions: number;
  created_at: string;
  updated_at?: string;
  student_count?: number;
  faculty_name?: string;
  latest_attendance?: string;
  attendance_percentage?: number;
}

export type StudentGender = 'Male' | 'Female';

export interface Student {
  id: string;
  classroom_id: string;
  student_name: string;
  roll_number: string;
  branch: string;
  gender: StudentGender;
  row_number: number;
  column_number: number;
  position_number: number;
  created_at: string;
  updated_at?: string;
}

export interface AttendanceSession {
  id: string;
  classroom_id: string;
  faculty_id: string;
  attendance_date: string;
  start_time: string;
  end_time?: string;
  notes?: string;
  created_at: string;
  class_name?: string;
  total_students?: number;
  present_count?: number;
  absent_count?: number;
  attendance_percentage?: number;
}

export type AttendanceStatus = 'Present' | 'Absent';

export interface AttendanceRecord {
  id: string;
  session_id: string;
  student_id: string;
  status: AttendanceStatus;
  marked_at: string;
  student_name?: string;
  roll_number?: string;
  branch?: string;
  gender?: StudentGender;
  row_number?: number;
  column_number?: number;
  position_number?: number;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  created_at: string;
  user_name?: string;
}

export type AttendanceFilter = 'all' | 'boys' | 'girls';
export type MarkState = 'Unmarked' | 'Present' | 'Absent';

export interface StudentAggregateReport {
  student_id: string;
  roll_number: string;
  student_name: string;
  branch: string;
  gender: StudentGender;
  row_number: number;
  column_number: number;
  position_number: number;
  classroom_name: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  percentage: number;
}
