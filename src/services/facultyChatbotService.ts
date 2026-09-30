import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { api, localDb } from './api';
import { Classroom, Student, AttendanceSession, AttendanceRecord } from '../types';

export interface ChatAction {
  label: string;
  url?: string;
  actionType?: 'navigate' | 'open_modal' | 'filter';
  payload?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  actions?: ChatAction[];
  dataPayload?: Record<string, unknown>;
  isError?: boolean;
}

export interface ChatbotConversationContext {
  facultyId: string;
  currentClassroomId?: string;
  lastClassroomId?: string;
  lastQueriedStudents?: Student[];
  lastQueryType?: string;
  lastDate?: string;
  lastFilterGender?: 'Male' | 'Female';
  lastFilterStatus?: 'Present' | 'Absent';
}

export class FacultyChatbotService {
  // --------------------------------------------------------------------------
  // 1. SAFE PREDEFINED DATABASE OPERATIONS (SUPABASE SOURCE OF TRUTH)
  // --------------------------------------------------------------------------

  /**
   * Only returns classrooms owned by the authenticated faculty member.
   * Enforces faculty security boundary and Row Level Security.
   */
  public static async getFacultyClassrooms(facultyId: string): Promise<Classroom[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('classrooms')
          .select('*')
          .eq('faculty_id', facultyId)
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data as Classroom[];
        }
      } catch (e) {
        console.warn('Supabase getFacultyClassrooms error, using local:', e);
      }
    }
    return localDb.getClassrooms().filter(c => c.faculty_id === facultyId);
  }

  /**
   * Fetch real student records for a specific classroom from Supabase.
   */
  public static async getClassroomStudents(classroomId: string): Promise<Student[]> {
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data, error } = await client
          .from('students')
          .select('*')
          .eq('classroom_id', classroomId)
          .order('position_number', { ascending: true });

        if (!error && data) {
          return data as Student[];
        }
      } catch (e) {
        console.warn('Supabase getClassroomStudents error, using local:', e);
      }
    }
    return localDb.getStudents().filter(s => s.classroom_id === classroomId);
  }

  /**
   * Calculate real seat statistics, occupied seats, and list vacant seats.
   */
  public static async getClassroomSeats(classroomId: string): Promise<{
    total: number;
    occupied: number;
    empty: number;
    classroom: Classroom | null;
    students: Student[];
    vacantSeats: Array<{ row: number; col: number; code: string; pos: number }>;
  }> {
    const cls = await api.getClassroomById(classroomId);
    const students = await this.getClassroomStudents(classroomId);

    const rows = cls?.rows || 4;
    const cols = cls?.columns || 4;
    const total = cls?.total_positions || rows * cols;
    const occupied = students.length;
    const empty = Math.max(0, total - occupied);

    const occupiedMap = new Set(students.map(s => `${s.row_number}-${s.column_number}`));
    const vacantSeats: Array<{ row: number; col: number; code: string; pos: number }> = [];

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        if (!occupiedMap.has(`${r}-${c}`)) {
          vacantSeats.push({
            row: r,
            col: c,
            code: `R${r}-C${c}`,
            pos: (r - 1) * cols + c
          });
        }
      }
    }

    return {
      total,
      occupied,
      empty,
      classroom: cls,
      students,
      vacantSeats
    };
  }

  /**
   * Search student by exact or clean roll number
   */
  public static async getStudentByRollNumber(classroomId: string, rollNumber: string): Promise<Student | null> {
    const students = await this.getClassroomStudents(classroomId);
    const cleanRoll = rollNumber.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    return students.find(s => s.roll_number.trim().toUpperCase().replace(/[^A-Z0-9]/g, '') === cleanRoll) || null;
  }

  /**
   * Search students matching name substring
   */
  public static async getStudentByName(classroomId: string, nameQuery: string): Promise<Student[]> {
    const students = await this.getClassroomStudents(classroomId);
    const clean = nameQuery.trim().toLowerCase();
    return students.filter(s => s.student_name.toLowerCase().includes(clean));
  }

  /**
   * Get occupant of a seat code like R2-C3 or R1C1
   */
  public static async getSeatOccupant(classroomId: string, seatCode: string): Promise<Student | null> {
    const match = seatCode.toUpperCase().match(/R(\d+)[-–_C\s]+(\d+)/i) || seatCode.toUpperCase().match(/(\d+)[,\s]+(\d+)/);
    if (!match) return null;
    const r = parseInt(match[1]);
    const c = parseInt(match[2]);

    const students = await this.getClassroomStudents(classroomId);
    return students.find(s => s.row_number === r && s.column_number === c) || null;
  }

  /**
   * Find students who have no seat assigned (missing seat coordinates)
   */
  public static async getUnassignedStudents(classroomId: string): Promise<Student[]> {
    const students = await this.getClassroomStudents(classroomId);
    return students.filter(s => !s.row_number || !s.column_number || s.row_number < 1 || s.column_number < 1);
  }

  /**
   * Check for duplicate roll numbers in classroom
   */
  public static async getDuplicateRollNumbers(classroomId: string): Promise<Array<{ roll: string; count: number; students: Student[] }>> {
    const students = await this.getClassroomStudents(classroomId);
    const map = new Map<string, Student[]>();
    for (const s of students) {
      const clean = s.roll_number.trim().toUpperCase();
      if (!map.has(clean)) map.set(clean, []);
      map.get(clean)!.push(s);
    }
    const duplicates: Array<{ roll: string; count: number; students: Student[] }> = [];
    map.forEach((list, roll) => {
      if (list.length > 1) {
        duplicates.push({ roll, count: list.length, students: list });
      }
    });
    return duplicates;
  }

  /**
   * Get attendance records for a specific date or return latest session if date not found
   */
  public static async getAttendanceForDate(
    classroomId: string, 
    dateStr: string
  ): Promise<{
    session: AttendanceSession | null;
    isLatestFallback?: boolean;
    sessionDate?: string;
    total: number;
    present: number;
    absent: number;
    percentage: number;
    presentStudents: Student[];
    absentStudents: Student[];
  }> {
    const students = await this.getClassroomStudents(classroomId);

    let session: AttendanceSession | null = null;
    let records: AttendanceRecord[] = [];
    let isLatestFallback = false;

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        // First try requested date
        const { data: sessList } = await client
          .from('attendance_sessions')
          .select('*')
          .eq('classroom_id', classroomId)
          .eq('attendance_date', dateStr)
          .order('created_at', { ascending: false })
          .limit(1);

        if (sessList && sessList.length > 0) {
          session = sessList[0] as AttendanceSession;
        } else {
          // If no session today, get most recent session
          const { data: latestList } = await client
            .from('attendance_sessions')
            .select('*')
            .eq('classroom_id', classroomId)
            .order('attendance_date', { ascending: false })
            .limit(1);

          if (latestList && latestList.length > 0) {
            session = latestList[0] as AttendanceSession;
            isLatestFallback = true;
          }
        }

        if (session) {
          const { data: recData } = await client
            .from('attendance_records')
            .select('*')
            .eq('session_id', session.id);
          if (recData) records = recData as AttendanceRecord[];
        }
      } catch (e) {
        console.warn('Supabase getAttendanceForDate error, using local fallback:', e);
      }
    }

    if (!session) {
      const localSessions = localDb.getSessions()
        .filter(s => s.classroom_id === classroomId)
        .sort((a, b) => new Date(b.attendance_date).getTime() - new Date(a.attendance_date).getTime());

      const todayMatch = localSessions.find(s => s.attendance_date === dateStr);
      if (todayMatch) {
        session = todayMatch;
      } else if (localSessions.length > 0) {
        session = localSessions[0];
        isLatestFallback = true;
      }

      if (session) {
        records = localDb.getRecords().filter(r => r.session_id === session!.id);
      }
    }

    if (!session) {
      return {
        session: null,
        total: students.length,
        present: students.length,
        absent: 0,
        percentage: 100,
        presentStudents: students,
        absentStudents: []
      };
    }

    const presentIds = new Set(records.filter(r => r.status === 'Present').map(r => r.student_id));
    const absentIds = new Set(records.filter(r => r.status === 'Absent').map(r => r.student_id));

    const presentStudents = students.filter(s => presentIds.has(s.id));
    const absentStudents = students.filter(s => absentIds.has(s.id));

    const total = students.length;
    const present = presentStudents.length;
    const absent = absentStudents.length;
    const percentage = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

    return {
      session,
      isLatestFallback,
      sessionDate: session.attendance_date,
      total,
      present,
      absent,
      percentage,
      presentStudents,
      absentStudents
    };
  }

  /**
   * Get students whose real calculated attendance rate across all sessions is below threshold
   */
  public static async getLowAttendanceStudents(
    classroomId: string,
    thresholdPercent: number = 75
  ): Promise<Array<{
    student: Student;
    rate: number;
    totalSessions: number;
    presentCount: number;
    absentCount: number;
  }>> {
    const students = await this.getClassroomStudents(classroomId);

    let sessions: AttendanceSession[] = [];
    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data } = await client
          .from('attendance_sessions')
          .select('*')
          .eq('classroom_id', classroomId);
        if (data) sessions = data as AttendanceSession[];
      } catch {
        sessions = localDb.getSessions().filter(s => s.classroom_id === classroomId);
      }
    } else {
      sessions = localDb.getSessions().filter(s => s.classroom_id === classroomId);
    }

    if (sessions.length === 0) {
      return [];
    }

    const sessionIds = sessions.map(s => s.id);
    let allRecords: AttendanceRecord[] = [];

    if (isSupabaseConfigured()) {
      try {
        const client = getSupabase();
        const { data } = await client
          .from('attendance_records')
          .select('*')
          .in('session_id', sessionIds);
        if (data) allRecords = data as AttendanceRecord[];
      } catch {
        allRecords = localDb.getRecords().filter(r => sessionIds.includes(r.session_id));
      }
    } else {
      allRecords = localDb.getRecords().filter(r => sessionIds.includes(r.session_id));
    }

    const results = students.map(st => {
      const studentRecs = allRecords.filter(r => r.student_id === st.id);
      const presentCount = studentRecs.filter(r => r.status === 'Present').length;
      const absentCount = studentRecs.filter(r => r.status === 'Absent').length;
      const totalSessions = studentRecs.length;
      const rate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 1000) / 10 : 100;

      return {
        student: st,
        rate,
        totalSessions,
        presentCount,
        absentCount
      };
    });

    return results
      .filter(r => r.rate < thresholdPercent)
      .sort((a, b) => a.rate - b.rate);
  }

  // --------------------------------------------------------------------------
  // 2. NATURAL LANGUAGE INTENT DETECTION & QUERY RESOLUTION
  // --------------------------------------------------------------------------

  public static async processFacultyQuery(
    rawPrompt: string,
    context: ChatbotConversationContext
  ): Promise<{ message: string; actions: ChatAction[]; updatedContext: ChatbotConversationContext }> {
    const prompt = rawPrompt.trim();
    const lower = prompt.toLowerCase();
    const updatedContext = { ...context };

    // 1. Identify Faculty's Classrooms (Strict RLS / Authorization)
    const classrooms = await this.getFacultyClassrooms(context.facultyId);

    if (classrooms.length === 0) {
      return {
        message: "I couldn't find any classrooms in your account. Would you like to create one now?",
        actions: [{ label: "+ Create Classroom", url: "/faculty/classrooms", actionType: "navigate" }],
        updatedContext
      };
    }

    // Determine target classroom
    let targetClassroom: Classroom | undefined;

    // A. Check if prompt explicitly mentions one of the faculty's classrooms
    for (const c of classrooms) {
      const cleanClassName = c.class_name.toLowerCase().replace(/[^a-z0-9]/g, ' ');
      const cleanPrompt = lower.replace(/[^a-z0-9]/g, ' ');
      if (cleanPrompt.includes(cleanClassName) || lower.includes(c.class_name.toLowerCase())) {
        targetClassroom = c;
        break;
      }
      // Check branch + section e.g. "AI & DS Section A"
      if (c.branch && lower.includes(c.branch.toLowerCase())) {
        targetClassroom = c;
        break;
      }
    }

    // B. If not mentioned in prompt, check current classroom context
    if (!targetClassroom) {
      const activeId = context.currentClassroomId || context.lastClassroomId;
      targetClassroom = classrooms.find(c => c.id === activeId) || classrooms[0];
    }

    updatedContext.lastClassroomId = targetClassroom.id;

    // ------------------------------------------------------------------------
    // INTENT: Classroom Switch / "Which classroom?" / Multiple Classrooms Prompt
    // ------------------------------------------------------------------------
    if (lower === 'which classroom' || lower === 'which classroom?' || lower.includes('change classroom') || lower.includes('switch classroom')) {
      const options = classrooms.map(c => `• **${c.class_name}** (${c.rows}×${c.columns}, ${c.student_count || 0} students)`).join('\n');
      return {
        message: `### Your Available Classrooms\n\n${options}\n\nSelect a classroom below to focus on:`,
        actions: classrooms.map(c => ({
          label: c.class_name.split('—')[0].trim(),
          actionType: "filter",
          payload: { query: `Summarize ${c.class_name}` }
        })),
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: Follow-up Queries ("Who are they?", "Where are they sitting?")
    // ------------------------------------------------------------------------
    if (
      (lower.includes('who are they') || lower.includes('show them') || lower.includes('name them')) &&
      context.lastQueriedStudents &&
      context.lastQueriedStudents.length > 0
    ) {
      const list = context.lastQueriedStudents;
      const rows = list.map(
        (s, i) => `| ${i + 1} | **${s.student_name}** | \`${s.roll_number}\` | ${s.gender === 'Female' ? '👧 Female' : '👦 Male'} | \`R${s.row_number}-C${s.column_number}\` |`
      ).join('\n');

      return {
        message: `### Identified Students (${list.length})\n\n| # | Name | Roll Number | Gender | Seat |\n|---|---|---|---|---|\n${rows}`,
        actions: [
          { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" },
          { label: "View Attendance", url: `/faculty/attendance`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    if (
      (lower.includes('where are they sitting') || lower.includes('where do they sit') || lower.includes('their seats')) &&
      context.lastQueriedStudents &&
      context.lastQueriedStudents.length > 0
    ) {
      const list = context.lastQueriedStudents;
      const rows = list.map(
        (s, i) => `• **${s.student_name}** (\`${s.roll_number}\`) → Seat **\`R${s.row_number}-C${s.column_number}\`** (Position #${s.position_number})`
      ).join('\n');

      return {
        message: `### Seating Positions (${list.length})\n\n${rows}`,
        actions: [
          { label: "View Seating Matrix", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: CSV / EXCEL IMPORT QUESTIONS & UNASSIGNED STUDENTS
    // ------------------------------------------------------------------------
    if (
      lower.includes('imported') ||
      lower.includes('import') ||
      lower.includes('duplicate roll') ||
      lower.includes('duplicate') ||
      lower.includes('missing seat') ||
      lower.includes('missing seats') ||
      lower.includes('unassigned') ||
      lower.includes('no seat assigned')
    ) {
      const students = await this.getClassroomStudents(targetClassroom.id);
      const boys = students.filter(s => s.gender === 'Male');
      const girls = students.filter(s => s.gender === 'Female');
      const unassigned = await this.getUnassignedStudents(targetClassroom.id);
      const duplicates = await this.getDuplicateRollNumbers(targetClassroom.id);
      const seatData = await this.getClassroomSeats(targetClassroom.id);

      // Sub-case: "Are there duplicate roll numbers?"
      if (lower.includes('duplicate')) {
        if (duplicates.length === 0) {
          return {
            message: `✅ **No duplicate roll numbers found** in **${targetClassroom.class_name}**.\n\nAll **${students.length}** enrolled students have verified unique institutional roll numbers.`,
            actions: [
              { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
            ],
            updatedContext
          };
        } else {
          const dupRows = duplicates.map(
            (d, i) => `| ${i + 1} | \`${d.roll}\` | **${d.count} duplicates** | ${d.students.map(s => s.student_name).join(', ')} |`
          ).join('\n');

          return {
            message: `⚠️ **Found ${duplicates.length} duplicate roll number(s)** in **${targetClassroom.class_name}**:\n\n| # | Roll Number | Duplicates | Student Names |\n|---|---|---|---|\n${dupRows}`,
            actions: [
              { label: "Manage Roster", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
            ],
            updatedContext
          };
        }
      }

      // Sub-case: "Are any students missing seats?" / "Show students who have no seat assigned" / "unassigned"
      if (lower.includes('missing') || lower.includes('unassigned') || lower.includes('no seat')) {
        if (unassigned.length === 0) {
          return {
            message: `✅ **All ${students.length} students have designated seats** in **${targetClassroom.class_name}**.\n\nThere are currently **0 unassigned students**. Available vacant positions remaining: **${seatData.empty}**.`,
            actions: [
              { label: "View Seating Matrix", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
            ],
            updatedContext
          };
        } else {
          const unassignedTable = unassigned.map(
            (s, i) => `| ${i + 1} | \`${s.roll_number}\` | **${s.student_name}** | ${s.gender} | ${s.branch} |`
          ).join('\n');

          updatedContext.lastQueriedStudents = unassigned;

          return {
            message: `⚠️ **${unassigned.length} Student(s) with No Seat Assigned** in **${targetClassroom.class_name}**:\n\n| # | Roll Number | Name | Gender | Branch |\n|---|---|---|---|---|\n${unassignedTable}\n\n*Classroom has ${seatData.empty} vacant seats available for assignment.*`,
            actions: [
              { label: "Assign Seats Now", url: `/faculty/classrooms/${targetClassroom.id}?action=assign_student`, actionType: "navigate" },
              { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
            ],
            updatedContext
          };
        }
      }

      // General Import Summary: "How many students were imported?", "How many boys/girls were imported?"
      return {
        message: `### 📊 Student Database & Import Status — ${targetClassroom.class_name}\n\n` +
          `• **Total Students In Roster:** **${students.length} students**\n` +
          `• **👦 Boys (Male):** **${boys.length}**\n` +
          `• **👧 Girls (Female):** **${girls.length}**\n` +
          `• **Seated Students:** **${students.length - unassigned.length}**\n` +
          `• **Unassigned Students:** **${unassigned.length}**\n` +
          `• **Duplicate Roll Numbers:** **${duplicates.length === 0 ? 'None (0)' : `${duplicates.length} duplicate(s)`}**\n` +
          `• **Classroom Capacity:** ${seatData.total} seats (${seatData.empty} currently empty)`,
        actions: [
          { label: "Upload CSV / Excel", url: `/faculty/classrooms/${targetClassroom.id}?action=bulk_import`, actionType: "navigate" },
          { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" },
          { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: CLASSROOM QUERIES (Dimensions, Count, Rows, Columns, Capacity)
    // ------------------------------------------------------------------------
    if (lower.includes('how many classrooms') || lower.includes('show my classrooms') || lower.includes('list my classrooms')) {
      const clsList = classrooms.map(
        (c, idx) => `| ${idx + 1} | **${c.class_name}** | ${c.rows}×${c.columns} (${c.total_positions} seats) | ${c.student_count || 0} Enrolled |`
      ).join('\n');

      return {
        message: `### Your Authorized Classrooms (${classrooms.length})\n\n| # | Classroom Name | Dimensions | Students |\n|---|---|---|---|\n${clsList}`,
        actions: classrooms.slice(0, 3).map(c => ({
          label: `Open ${c.class_name.split('—')[0].trim()}`,
          url: `/faculty/classrooms/${c.id}`,
          actionType: "navigate"
        })),
        updatedContext
      };
    }

    if (
      lower.includes('dimension') || 
      lower.includes('how many rows') || 
      lower.includes('how many columns') || 
      (lower.includes('rows') && lower.includes('columns'))
    ) {
      return {
        message: `**${targetClassroom.class_name}** has **${targetClassroom.rows} rows × ${targetClassroom.columns} columns**, giving **${targetClassroom.total_positions} fixed seating positions** in the classroom grid.\n\n` +
          (targetClassroom.gender_config 
            ? `• **Girls Zone:** Columns ${targetClassroom.gender_config.girls_start_col}–${targetClassroom.gender_config.girls_end_col} (${targetClassroom.gender_config.girls_total_seats} seats)\n` +
              `• **Boys Zone:** Columns ${targetClassroom.gender_config.boys_start_col}–${targetClassroom.gender_config.boys_end_col} (${targetClassroom.gender_config.boys_total_seats} seats)\n` +
              `• **Policy Enforcement:** ${targetClassroom.enforce_seating_rule !== false ? 'Strict (Must and should follow)' : 'Flexible'}`
            : `• **Configuration:** Unified Seating Grid`),
        actions: [
          { label: "View Seating Matrix", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: SEAT LOOKUPS ("Who is sitting at R2-C3?", "Which student is in R1-C1?")
    // ------------------------------------------------------------------------
    const seatMatch = prompt.match(/r(\d+)[-–_c\s]+(\d+)/i) || prompt.match(/row\s*(\d+)[,\s]+col(?:umn)?\s*(\d+)/i);
    if (seatMatch) {
      const r = parseInt(seatMatch[1]);
      const c = parseInt(seatMatch[2]);
      const code = `R${r}-C${c}`;
      const occupant = await this.getSeatOccupant(targetClassroom.id, code);

      if (occupant) {
        return {
          message: `Seat **\`${code}\`** in **${targetClassroom.class_name}** is assigned to:\n\n` +
            `• **Name:** **${occupant.student_name}**\n` +
            `• **Roll Number:** \`${occupant.roll_number}\`\n` +
            `• **Gender:** ${occupant.gender === 'Female' ? '👧 Female' : '👦 Male'}\n` +
            `• **Branch:** ${occupant.branch}\n` +
            `• **Position Number:** #${occupant.position_number}`,
          actions: [
            { label: "View Seat", url: `/faculty/classrooms/${targetClassroom.id}?seat=${code}`, actionType: "navigate" },
            { label: "View Student", url: `/faculty/classrooms/${targetClassroom.id}?roll=${occupant.roll_number}`, actionType: "navigate" },
            { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
          ],
          updatedContext
        };
      } else {
        return {
          message: `Seat **\`${code}\`** in **${targetClassroom.class_name}** is currently **VACANT (Unassigned)**.`,
          actions: [
            { label: "+ Assign Student to Seat", url: `/faculty/classrooms/${targetClassroom.id}?action=assign_student&seat=${code}`, actionType: "navigate" },
            { label: "View Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
          ],
          updatedContext
        };
      }
    }

    // ------------------------------------------------------------------------
    // INTENT: SPECIFIC ROLL NUMBER LOOKUP ("Find roll number 23A31A0501")
    // ------------------------------------------------------------------------
    const rollPatternMatch = prompt.match(/roll\s*(?:number|no)?\.?\s*([0-9a-z]+)/i) || 
                             prompt.match(/\b(2[0-9][A-Z0-9]{8,10})\b/i);

    if (rollPatternMatch) {
      const targetRoll = rollPatternMatch[1].toUpperCase();
      const student = await this.getStudentByRollNumber(targetClassroom.id, targetRoll);

      if (student) {
        return {
          message: `### Student Found: ${student.student_name}\n\n` +
            `• **Roll Number:** \`${student.roll_number}\`\n` +
            `• **Classroom:** **${targetClassroom.class_name}**\n` +
            `• **Assigned Seat:** **\`R${student.row_number}-C${student.column_number}\`** (Position #${student.position_number})\n` +
            `• **Gender:** ${student.gender === 'Female' ? '👧 Female' : '👦 Male'}\n` +
            `• **Branch / Section:** ${student.branch}`,
          actions: [
            { label: "View Student", url: `/faculty/classrooms/${targetClassroom.id}?roll=${student.roll_number}`, actionType: "navigate" },
            { label: "View Seat", url: `/faculty/classrooms/${targetClassroom.id}?seat=R${student.row_number}-C${student.column_number}`, actionType: "navigate" },
            { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
          ],
          updatedContext
        };
      } else {
        // Check if student exists in any other classroom of this faculty
        for (const other of classrooms) {
          if (other.id !== targetClassroom.id) {
            const stOther = await this.getStudentByRollNumber(other.id, targetRoll);
            if (stOther) {
              return {
                message: `Roll number \`${targetRoll}\` (**${stOther.student_name}**) is in your other classroom: **${other.class_name}**.\n\n` +
                  `• **Seat:** \`R${stOther.row_number}-C${stOther.column_number}\`\n` +
                  `• **Gender:** ${stOther.gender}\n` +
                  `• **Branch:** ${stOther.branch}`,
                actions: [
                  { label: `Open ${other.class_name.split('—')[0].trim()}`, url: `/faculty/classrooms/${other.id}`, actionType: "navigate" }
                ],
                updatedContext
              };
            }
          }
        }

        return {
          message: `I couldn't find roll number \`${targetRoll}\` in your current classroom data (${targetClassroom.class_name}).`,
          actions: [
            { label: "View Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
          ],
          updatedContext
        };
      }
    }

    // ------------------------------------------------------------------------
    // INTENT: SPECIFIC STUDENT SEARCH BY NAME ("Where is Aarav Sharma sitting?", "Find Rohan")
    // ------------------------------------------------------------------------
    if (lower.includes('where is ') || lower.includes('find student') || lower.includes('find ') || lower.includes('search student')) {
      const namePart = prompt
        .replace(/where is/gi, '')
        .replace(/sitting/gi, '')
        .replace(/find student/gi, '')
        .replace(/find/gi, '')
        .replace(/search student/gi, '')
        .replace(/search/gi, '')
        .replace(/[?.]/g, '')
        .trim();

      if (namePart.length >= 2) {
        const matches = await this.getStudentByName(targetClassroom.id, namePart);

        if (matches.length === 1) {
          const st = matches[0];
          return {
            message: `**${st.student_name}** is sitting at seat **\`R${st.row_number}-C${st.column_number}\`** (Seat #${st.position_number}) in **${targetClassroom.class_name}**.\n\n` +
              `• **Roll Number:** \`${st.roll_number}\`\n` +
              `• **Gender:** ${st.gender === 'Female' ? '👧 Female' : '👦 Male'}\n` +
              `• **Branch:** ${st.branch}`,
            actions: [
              { label: "View Seat", url: `/faculty/classrooms/${targetClassroom.id}?seat=R${st.row_number}-C${st.column_number}`, actionType: "navigate" },
              { label: "View Student", url: `/faculty/classrooms/${targetClassroom.id}?roll=${st.roll_number}`, actionType: "navigate" },
              { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
            ],
            updatedContext
          };
        } else if (matches.length > 1) {
          const table = matches.map(
            (s, i) => `| ${i + 1} | **${s.student_name}** | \`${s.roll_number}\` | ${s.gender} | \`R${s.row_number}-C${s.column_number}\` |`
          ).join('\n');

          updatedContext.lastQueriedStudents = matches;
          return {
            message: `I found **${matches.length}** students matching "${namePart}" in **${targetClassroom.class_name}**:\n\n| # | Name | Roll Number | Gender | Seat |\n|---|---|---|---|---|\n${table}\n\nWhich student would you like to view?`,
            actions: matches.map(s => ({
              label: `${s.student_name} (${s.roll_number.slice(-4)})`,
              url: `/faculty/classrooms/${targetClassroom.id}?roll=${s.roll_number}`,
              actionType: "navigate"
            })),
            updatedContext
          };
        } else {
          return {
            message: `I couldn't find any student matching "${namePart}" in your current classroom data (${targetClassroom.class_name}).`,
            actions: [
              { label: "View Full Roster", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
            ],
            updatedContext
          };
        }
      }
    }

    // ------------------------------------------------------------------------
    // INTENT: EMPTY / VACANT SEATS QUERIES
    // ------------------------------------------------------------------------
    if (
      lower.includes('empty seat') || 
      lower.includes('vacant seat') || 
      lower.includes('seats are empty') || 
      lower.includes('seats are available') ||
      lower.includes('total seats are available') ||
      lower.includes('how many empty') ||
      lower.includes('which seats are currently empty')
    ) {
      const seatData = await this.getClassroomSeats(targetClassroom.id);
      const vacantSummary = seatData.vacantSeats.slice(0, 10).map(s => `\`${s.code}\``).join(', ');
      const moreCount = Math.max(0, seatData.empty - 10);

      return {
        message: `### Seating Availability — ${targetClassroom.class_name}\n\n` +
          `• **Total Capacity:** ${seatData.total} seats (${targetClassroom.rows} rows × ${targetClassroom.columns} cols)\n` +
          `• **Occupied:** ${seatData.occupied} seats\n` +
          `• **Empty (Vacant):** **${seatData.empty} seats**\n\n` +
          (seatData.empty > 0 
            ? `Vacant Seat Codes: ${vacantSummary}${moreCount > 0 ? ` + ${moreCount} more` : ''}` 
            : 'Every position in this classroom is currently occupied by an enrolled student.'),
        actions: [
          { label: "Assign Student to Seat", url: `/faculty/classrooms/${targetClassroom.id}?action=assign_student`, actionType: "navigate" },
          { label: "Upload CSV Roster", url: `/faculty/classrooms/${targetClassroom.id}?action=bulk_import`, actionType: "navigate" },
          { label: "View Seating Matrix", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: ROW QUERIES ("Who is sitting in the first row?", "front row", "row 2")
    // ------------------------------------------------------------------------
    if (lower.includes('front row') || lower.includes('first row') || /row\s*(\d+)/i.test(lower)) {
      const rowMatch = lower.includes('front') || lower.includes('first') ? ['1', '1'] : lower.match(/row\s*(\d+)/i);
      const targetRow = rowMatch ? parseInt(rowMatch[1]) : 1;

      const students = await this.getClassroomStudents(targetClassroom.id);
      const rowStudents = students.filter(s => s.row_number === targetRow).sort((a, b) => a.column_number - b.column_number);

      if (rowStudents.length === 0) {
        return {
          message: `There are currently no students assigned to **Row ${targetRow}** in **${targetClassroom.class_name}**. (Row is completely empty).`,
          actions: [
            { label: "+ Assign Student to Row", url: `/faculty/classrooms/${targetClassroom.id}?action=assign_student`, actionType: "navigate" }
          ],
          updatedContext
        };
      }

      const rowsList = rowStudents.map(
        s => `| Col ${s.column_number} | \`R${s.row_number}-C${s.column_number}\` | **${s.student_name}** | \`${s.roll_number}\` | ${s.gender === 'Female' ? '👧 Female' : '👦 Male'} |`
      ).join('\n');

      updatedContext.lastQueriedStudents = rowStudents;

      return {
        message: `### Students in Row ${targetRow} — ${targetClassroom.class_name} (${rowStudents.length})\n\n` +
          `| Column | Seat | Name | Roll Number | Gender |\n|---|---|---|---|---|\n${rowsList}`,
        actions: [
          { label: "Open Seating Matrix", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" },
          { label: "Take Attendance", url: `/faculty/classrooms/${targetClassroom.id}/attendance`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: ATTENDANCE QUERIES (Present, Absent, Attendance Percentage, Boys/Girls Attendance)
    // ------------------------------------------------------------------------
    if (
      lower.includes('absent') || 
      lower.includes('present') || 
      lower.includes('attendance percentage') || 
      lower.includes('attendance summary') ||
      lower.includes('attendance rate')
    ) {
      const todayStr = new Date().toISOString().split('T')[0];
      const att = await this.getAttendanceForDate(targetClassroom.id, todayStr);

      const isGirlsOnly = lower.includes('girl') || lower.includes('female');
      const isBoysOnly = lower.includes('boy') || lower.includes('male');

      // Sub-case: "Who is absent today?" or "How many are absent?" or "How many girls are absent?"
      if (lower.includes('absent')) {
        let targetAbsents = att.absentStudents;
        if (isGirlsOnly) targetAbsents = targetAbsents.filter(s => s.gender === 'Female');
        if (isBoysOnly) targetAbsents = targetAbsents.filter(s => s.gender === 'Male');

        updatedContext.lastQueriedStudents = targetAbsents;
        updatedContext.lastFilterStatus = 'Absent';

        const labelGender = isGirlsOnly ? 'Girls' : isBoysOnly ? 'Boys' : 'Students';
        const dateNotice = att.isLatestFallback 
          ? `*(Note: Today's attendance session not yet submitted. Showing latest session from **${att.sessionDate}**)*\n\n` 
          : '';

        if (targetAbsents.length === 0) {
          return {
            message: `${dateNotice}🎉 **Zero ${labelGender.toLowerCase()} absent!** All ${labelGender.toLowerCase()} are marked **Present** in **${targetClassroom.class_name}**.`,
            actions: [
              { label: "Take Live Attendance", url: `/faculty/classrooms/${targetClassroom.id}/attendance`, actionType: "navigate" },
              { label: "View Attendance History", url: `/faculty/attendance`, actionType: "navigate" }
            ],
            updatedContext
          };
        }

        const absentTable = targetAbsents.map(
          (s, i) => `| ${i + 1} | \`${s.roll_number}\` | **${s.student_name}** | ${s.gender === 'Female' ? '👧 Female' : '👦 Male'} | \`R${s.row_number}-C${s.column_number}\` |`
        ).join('\n');

        return {
          message: `${dateNotice}### Today's Absent ${labelGender} — ${targetClassroom.class_name}\n\n` +
            `| Roll No | Name | Gender | Seat |\n|---|---|---|---|\n${absentTable}\n\n` +
            `**Total Absent:** **${targetAbsents.length}**\n` +
            `**Attendance:** **${att.percentage}%**`,
          actions: [
            { label: "Take Attendance", url: `/faculty/classrooms/${targetClassroom.id}/attendance`, actionType: "navigate" },
            { label: "View Attendance History", url: `/faculty/attendance`, actionType: "navigate" },
            { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" }
          ],
          updatedContext
        };
      }

      // Sub-case: "How many students are present?" or "How many boys are present?"
      if (lower.includes('present')) {
        let targetPresents = att.presentStudents;
        if (isGirlsOnly) targetPresents = targetPresents.filter(s => s.gender === 'Female');
        if (isBoysOnly) targetPresents = targetPresents.filter(s => s.gender === 'Male');

        updatedContext.lastQueriedStudents = targetPresents;
        updatedContext.lastFilterStatus = 'Present';

        const labelGender = isGirlsOnly ? 'Girls' : isBoysOnly ? 'Boys' : 'Students';
        const dateNotice = att.isLatestFallback 
          ? `*(Note: Today's attendance session not yet submitted. Showing latest session from **${att.sessionDate}**)*\n\n` 
          : '';

        return {
          message: `${dateNotice}### Today's Attendance — ${targetClassroom.class_name}\n\n` +
            `• **Total:** ${att.total}\n` +
            `• **Present:** **${targetPresents.length}** ${labelGender.toLowerCase()}\n` +
            `• **Absent:** **${att.absent}**\n` +
            `• **Attendance:** **${att.percentage}%**`,
          actions: [
            { label: "View Attendance", url: `/faculty/attendance`, actionType: "navigate" },
            { label: "Take Attendance", url: `/faculty/classrooms/${targetClassroom.id}/attendance`, actionType: "navigate" },
            { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" }
          ],
          updatedContext
        };
      }

      // General Attendance Summary
      const dateNotice = att.isLatestFallback 
        ? `*(Note: Today's attendance session not yet submitted. Showing latest session from **${att.sessionDate}**)*\n\n` 
        : '';

      return {
        message: `${dateNotice}### Today's Attendance — ${targetClassroom.class_name}\n\n` +
          `• **Total:** ${att.total}\n` +
          `• **Present:** **${att.present}**\n` +
          `• **Absent:** **${att.absent}**\n` +
          `• **Attendance:** **${att.percentage}%**`,
        actions: [
          { label: "Take Live Attendance", url: `/faculty/classrooms/${targetClassroom.id}/attendance`, actionType: "navigate" },
          { label: "View Attendance History", url: `/faculty/attendance`, actionType: "navigate" },
          { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: LOW ATTENDANCE QUERIES ("Who has less than 75% attendance?", "below 80%")
    // ------------------------------------------------------------------------
    if (lower.includes('less than') || lower.includes('below') || lower.includes('low attendance') || lower.includes('shortage') || lower.includes('need attention')) {
      const pctMatch = lower.match(/(\d+)\s*%/);
      const threshold = pctMatch ? parseInt(pctMatch[1]) : 75;

      const lowStudents = await this.getLowAttendanceStudents(targetClassroom.id, threshold);

      if (lowStudents.length === 0) {
        return {
          message: `✅ Great news! **No students in ${targetClassroom.class_name} have attendance below ${threshold}%.** Every student is meeting or exceeding the minimum institutional requirement.`,
          actions: [
            { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" }
          ],
          updatedContext
        };
      }

      const rows = lowStudents.map(
        (r, i) => `| ${i + 1} | \`${r.student.roll_number}\` | **${r.student.student_name}** | \`${r.rate}%\` (${r.presentCount}/${r.totalSessions}) | \`R${r.student.row_number}-C${r.student.column_number}\` |`
      ).join('\n');

      updatedContext.lastQueriedStudents = lowStudents.map(l => l.student);

      return {
        message: `### Students Below ${threshold}% Attendance — ${targetClassroom.class_name} (${lowStudents.length})\n\n` +
          `| # | Roll Number | Student Name | Attendance | Seat |\n|---|---|---|---|---|\n${rows}`,
        actions: [
          { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" },
          { label: "Download Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}&action=download`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: GENDER COUNTS & SEATING DIVISION QUERIES
    // ------------------------------------------------------------------------
    if (
      lower.includes('how many boy') || 
      lower.includes('how many girl') || 
      lower.includes('boys and girls') || 
      lower.includes('male student') || 
      lower.includes('female student') ||
      lower.includes('show girls') ||
      lower.includes('show boys')
    ) {
      const students = await this.getClassroomStudents(targetClassroom.id);
      const boys = students.filter(s => s.gender === 'Male');
      const girls = students.filter(s => s.gender === 'Female');

      return {
        message: `### Gender Breakdown — ${targetClassroom.class_name}\n\n` +
          `• **Total Students:** **${students.length}**\n` +
          `• **👦 Boys (Male):** **${boys.length}** students (${students.length > 0 ? Math.round((boys.length / students.length) * 100) : 0}%)\n` +
          `• **👧 Girls (Female):** **${girls.length}** students (${students.length > 0 ? Math.round((girls.length / students.length) * 100) : 0}%)\n\n` +
          (targetClassroom.gender_config 
            ? `• **Classroom Seating Division:** Dedicated Girls section (${targetClassroom.gender_config.girls_total_seats} seats) and Boys section (${targetClassroom.gender_config.boys_total_seats} seats) with **${targetClassroom.enforce_seating_rule !== false ? 'Strict Policy Active' : 'Flexible Placement'}**.`
            : `• **Seating Grid:** Unified auditorium layout`),
        actions: [
          { label: "View Seating Matrix", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" },
          { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: STUDENT ENROLLMENT LIST & BRANCH FILTER
    // ------------------------------------------------------------------------
    if (
      lower.includes('how many students') || 
      lower.includes('show all students') || 
      lower.includes('list students') || 
      lower.includes('enrolled') ||
      lower.includes('students from') ||
      lower.includes('ai & ds students')
    ) {
      const students = await this.getClassroomStudents(targetClassroom.id);
      const seatData = await this.getClassroomSeats(targetClassroom.id);

      const previewList = students.slice(0, 10).map(
        (s, i) => `| ${i + 1} | \`${s.roll_number}\` | **${s.student_name}** | ${s.gender} | \`R${s.row_number}-C${s.column_number}\` |`
      ).join('\n');

      updatedContext.lastQueriedStudents = students;

      return {
        message: `### Student Roster — ${targetClassroom.class_name}\n\n` +
          `• **Total Enrolled:** **${students.length} students**\n` +
          `• **Classroom Dimensions:** ${targetClassroom.rows} rows × ${targetClassroom.columns} columns (${seatData.total} fixed positions)\n` +
          `• **Vacant Seats:** ${seatData.empty} seats available\n\n` +
          `| # | Roll Number | Name | Gender | Seat |\n|---|---|---|---|---|\n${previewList}` +
          (students.length > 10 ? `\n\n*...and ${students.length - 10} more students enrolled in this classroom.*` : ''),
        actions: [
          { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" },
          { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" },
          { label: "Upload CSV / Excel", url: `/faculty/classrooms/${targetClassroom.id}?action=bulk_import`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // INTENT: REPORTS & CLASSROOM SUMMARY ("Show me the attendance report", "Summarize this classroom")
    // ------------------------------------------------------------------------
    if (
      lower.includes('report') || 
      lower.includes('summary') || 
      lower.includes('summarize')
    ) {
      const seatData = await this.getClassroomSeats(targetClassroom.id);
      const todayStr = new Date().toISOString().split('T')[0];
      const att = await this.getAttendanceForDate(targetClassroom.id, todayStr);
      const boys = seatData.students.filter(s => s.gender === 'Male').length;
      const girls = seatData.students.filter(s => s.gender === 'Female').length;

      return {
        message: `### 📋 Classroom Summary — ${targetClassroom.class_name}\n\n` +
          `• **Dimensions:** ${targetClassroom.rows} rows × ${targetClassroom.columns} columns (${targetClassroom.total_positions} total seats)\n` +
          `• **Students Enrolled:** **${seatData.occupied}** (${boys} Boys, ${girls} Girls)\n` +
          `• **Vacant Seats:** **${seatData.empty}** seats available\n` +
          `• **Today's Attendance:** **${att.present} Present**, **${att.absent} Absent** (${att.percentage}%)\n` +
          `• **Seating Division:** ${targetClassroom.gender_config ? 'Girls & Boys Divided Sections' : 'Standard Unified Grid'}`,
        actions: [
          { label: "Generate Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}`, actionType: "navigate" },
          { label: "Download Report", url: `/faculty/reports?classroom_id=${targetClassroom.id}&action=download`, actionType: "navigate" },
          { label: "Open Classroom", url: `/faculty/classrooms/${targetClassroom.id}`, actionType: "navigate" },
          { label: "Take Attendance", url: `/faculty/classrooms/${targetClassroom.id}/attendance`, actionType: "navigate" }
        ],
        updatedContext
      };
    }

    // ------------------------------------------------------------------------
    // FALLBACK / UNKNOWN QUERY
    // ------------------------------------------------------------------------
    return {
      message: `I couldn't find that information in your current classroom data.\n\n` +
        `You can ask me real database questions about **${targetClassroom.class_name}**:\n` +
        `• *"Who is absent today?"*\n` +
        `• *"How many boys and girls are there?"*\n` +
        `• *"Where is Aarav Sharma sitting?"*\n` +
        `• *"Which student is in R2-C3?"*\n` +
        `• *"How many seats are empty?"*\n` +
        `• *"Show me students with less than 75% attendance"*\n` +
        `• *"Are any students missing seats?"*`,
      actions: [
        { label: "Who is absent today?", actionType: "filter", payload: { query: "Who is absent today?" } },
        { label: "Show empty seats", actionType: "filter", payload: { query: "How many seats are empty?" } },
        { label: "Attendance summary", actionType: "filter", payload: { query: "Give me today's attendance summary" } }
      ],
      updatedContext
    };
  }
}
