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

export interface BranchSeatingConfig {
  branch: string;
  rows: number;
  columns: number;
  total_seats: number;
  start_row?: number;
  end_row?: number;
  start_col?: number;
  end_col?: number;
}

export interface GenderSeatingConfig {
  arrangement: 'side_by_side' | 'front_to_back';
  girls_placement: 'left' | 'right' | 'front' | 'back';
  girls_rows: number;
  girls_columns: number;
  girls_total_seats: number;
  boys_rows: number;
  boys_columns: number;
  boys_total_seats: number;
  girls_start_row: number;
  girls_end_row: number;
  girls_start_col: number;
  girls_end_col: number;
  boys_start_row: number;
  boys_end_row: number;
  boys_start_col: number;
  boys_end_col: number;
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
  branch?: string;
  branches?: string[];
  branch_configs?: BranchSeatingConfig[];
  seating_division_mode?: 'gender' | 'branch' | 'both' | 'unified';
  gender_config?: GenderSeatingConfig;
  enforce_seating_rule?: boolean; // Must and should follow rule
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
  section_wing?: 'boys' | 'girls';
  section?: string;
  email?: string;
  mobile?: string;
  seat_id?: string;
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
