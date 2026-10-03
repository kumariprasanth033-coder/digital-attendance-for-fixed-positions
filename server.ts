import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const PORT = 3000;
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS & Headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// ============================================================================
// PERSISTENT DATABASE SETUP (node:sqlite)
// ============================================================================

const dbDir = path.resolve(process.cwd(), 'database');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const dbPath = path.join(dbDir, 'attendance_sync.db');
const db = new DatabaseSync(dbPath);

// Initialize normalized schema
db.exec(`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'faculty',
    account_status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS classrooms (
    id TEXT PRIMARY KEY,
    faculty_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    rows INTEGER NOT NULL,
    columns INTEGER NOT NULL,
    total_positions INTEGER NOT NULL,
    branch TEXT,
    branches TEXT,
    branch_configs TEXT,
    seating_division_mode TEXT DEFAULT 'gender',
    gender_config TEXT,
    enforce_seating_rule INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS seats (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL,
    row_number INTEGER NOT NULL,
    column_number INTEGER NOT NULL,
    position_number INTEGER NOT NULL,
    seat_code TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    UNIQUE(classroom_id, row_number, column_number)
  );

  CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    branch TEXT NOT NULL,
    gender TEXT NOT NULL,
    section_wing TEXT,
    section TEXT,
    email TEXT,
    mobile TEXT,
    seat_id TEXT,
    row_number INTEGER NOT NULL,
    column_number INTEGER NOT NULL,
    position_number INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    UNIQUE(classroom_id, roll_number),
    UNIQUE(classroom_id, row_number, column_number)
  );

  CREATE TABLE IF NOT EXISTS attendance_sessions (
    id TEXT PRIMARY KEY,
    classroom_id TEXT NOT NULL,
    faculty_id TEXT NOT NULL,
    attendance_date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (classroom_id) REFERENCES classrooms(id) ON DELETE CASCADE,
    FOREIGN KEY (faculty_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    status TEXT NOT NULL,
    marked_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(session_id, student_id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

// Seed default verified profiles if empty
const profileCount = db.prepare('SELECT COUNT(*) as count FROM profiles').get() as { count: number };
if (profileCount.count === 0) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO profiles (id, full_name, email, role, account_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'a0000000-0000-0000-0000-000000000001',
    'Dr. Ramesh Kumar',
    'ramesh.faculty@university.edu',
    'faculty',
    'active',
    now,
    now
  );

  db.prepare(`
    INSERT INTO profiles (id, full_name, email, role, account_status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    'a0000000-0000-0000-0000-000000000002',
    'Admin Dean Office',
    'admin.portal@university.edu',
    'admin',
    'active',
    now,
    now
  );
}

// Seed default verified demo classroom with 16 seats and 16 students from database/seed.sql if empty
const classroomCount = db.prepare('SELECT COUNT(*) as count FROM classrooms').get() as { count: number };
if (classroomCount.count === 0) {
  const now = new Date().toISOString();
  const demoClassroomId = 'c0000000-0000-0000-0000-000000000001';
  const facultyId = 'a0000000-0000-0000-0000-000000000001';

  db.prepare(`
    INSERT INTO classrooms (
      id, faculty_id, class_name, rows, columns, total_positions,
      branch, branches, branch_configs, seating_division_mode, gender_config,
      enforce_seating_rule, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    demoClassroomId,
    facultyId,
    'AI & DS - Section A',
    4,
    4,
    16,
    'AI & DS',
    JSON.stringify(['AI & DS']),
    null,
    'gender',
    null,
    1,
    now,
    now
  );

  // 16 seats (R1-C1 through R4-C4)
  const insertSeat = db.prepare(`
    INSERT INTO seats (id, classroom_id, row_number, column_number, position_number, seat_code, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (let r = 1; r <= 4; r++) {
    for (let c = 1; c <= 4; c++) {
      const posNum = (r - 1) * 4 + c;
      const seatCode = `R${r}-C${c}`;
      insertSeat.run(`s-c1-r${r}-c${c}`, demoClassroomId, r, c, posNum, seatCode, now);
    }
  }

  // 16 Students from database/seed.sql
  const demoStudents = [
    { name: 'Aarav Sharma', roll: '23A81A0501', branch: 'AI & DS', gender: 'Male', r: 1, c: 1, pos: 1 },
    { name: 'Rohan Verma', roll: '23A81A0502', branch: 'AI & DS', gender: 'Male', r: 1, c: 2, pos: 2 },
    { name: 'Ananya Iyer', roll: '23A81A0503', branch: 'AI & DS', gender: 'Female', r: 1, c: 3, pos: 3 },
    { name: 'Diya Reddy', roll: '23A81A0504', branch: 'AI & DS', gender: 'Female', r: 1, c: 4, pos: 4 },
    { name: 'Rahul Nair', roll: '23A81A0505', branch: 'AI & DS', gender: 'Male', r: 2, c: 1, pos: 5 },
    { name: 'Siddharth Sen', roll: '23A81A0506', branch: 'AI & DS', gender: 'Male', r: 2, c: 2, pos: 6 },
    { name: 'Kavya Pillai', roll: '23A81A0507', branch: 'AI & DS', gender: 'Female', r: 2, c: 3, pos: 7 },
    { name: 'Sneha Patel', roll: '23A81A0508', branch: 'AI & DS', gender: 'Female', r: 2, c: 4, pos: 8 },
    { name: 'Aditya Joshi', roll: '23A81A0509', branch: 'AI & DS', gender: 'Male', r: 3, c: 1, pos: 9 },
    { name: 'Karan Gupta', roll: '23A81A0510', branch: 'AI & DS', gender: 'Male', r: 3, c: 2, pos: 10 },
    { name: 'Pooja Hegde', roll: '23A81A0511', branch: 'AI & DS', gender: 'Female', r: 3, c: 3, pos: 11 },
    { name: 'Meera Menon', roll: '23A81A0512', branch: 'AI & DS', gender: 'Female', r: 3, c: 4, pos: 12 },
    { name: 'Vikram Malhotra', roll: '23A81A0513', branch: 'AI & DS', gender: 'Male', r: 4, c: 1, pos: 13 },
    { name: 'Arjun Saxena', roll: '23A81A0514', branch: 'AI & DS', gender: 'Male', r: 4, c: 2, pos: 14 },
    { name: 'Tanvi Deshmukh', roll: '23A81A0515', branch: 'AI & DS', gender: 'Female', r: 4, c: 3, pos: 15 },
    { name: 'Isha Kulkarni', roll: '23A81A0516', branch: 'AI & DS', gender: 'Female', r: 4, c: 4, pos: 16 },
  ];

  const insertStudent = db.prepare(`
    INSERT INTO students (
      id, classroom_id, student_name, roll_number, branch, gender,
      section_wing, section, email, mobile, seat_id,
      row_number, column_number, position_number, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const st of demoStudents) {
    const studentId = `st-c1-${st.pos}`;
    const seatId = `R${st.r}-C${st.c}`;
    insertStudent.run(
      studentId,
      demoClassroomId,
      st.name,
      st.roll,
      st.branch,
      st.gender,
      'A Wing',
      'Section A',
      `${st.roll.toLowerCase()}@university.edu`,
      '9876543210',
      seatId,
      st.r,
      st.c,
      st.pos,
      now,
      now
    );
  }

  // 1 Demo Attendance Session
  const demoSessionId = 'd0000000-0000-0000-0000-000000000001';
  db.prepare(`
    INSERT INTO attendance_sessions (
      id, classroom_id, faculty_id, attendance_date, start_time, end_time, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    demoSessionId,
    demoClassroomId,
    facultyId,
    now.split('T')[0],
    '09:00:00',
    '10:00:00',
    'Morning lecture: Neural Networks Foundations',
    now
  );

  const insertRecord = db.prepare(`
    INSERT INTO attendance_records (id, session_id, student_id, status, marked_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  demoStudents.forEach((st, idx) => {
    const studentId = `st-c1-${st.pos}`;
    // Position 6 and 15 marked Absent, others Present
    const status = (st.pos === 6 || st.pos === 15) ? 'Absent' : 'Present';
    insertRecord.run(`rec-d1-${idx + 1}`, demoSessionId, studentId, status, now);
  });
}

// Optional Supabase client for dual sync
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dusvdwadmdivholhzmcu.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1c3Zkd2FkbWRpdmhvbGh6bWN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA2NTU1OTQsImV4cCI6MjEwNjIzMTU5NH0.laWyFMreBpVmvBSEN1F_ixLFwSKLUqW7EzQ7HP9yiw8';
let supabaseClient: SupabaseClient | null = null;
try {
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch {
  // Supabase client optional
}

function safeSupabaseSync(fn: () => Promise<unknown>) {
  if (!supabaseClient) return;
  fn().catch((err: unknown) => {
    console.warn('[Supabase Sync Warning]:', err instanceof Error ? err.message : String(err));
  });
}

// Realtime listeners map
const clients = new Set<express.Response>();
function broadcastUpdate(type: string, data: unknown) {
  const payload = `data: ${JSON.stringify({ type, data, timestamp: Date.now() })}\n\n`;
  for (const client of clients) {
    try {
      client.write(payload);
    } catch {
      clients.delete(client);
    }
  }
}

// Helper: generate UUID
function genUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// REST API ENDPOINTS
// ============================================================================

// Server-Sent Events (SSE) for Realtime Multi-Device Sync
app.get('/api/realtime/updates', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write('data: {"type":"connected"}\n\n');
  clients.add(res);

  req.on('close', () => {
    clients.delete(res);
  });
});

// Auth: Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, roleHint } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    let profile = db.prepare('SELECT * FROM profiles WHERE lower(email) = ?').get(cleanEmail) as {
      id: string; full_name: string; email: string; role: string; account_status: string; created_at: string;
    } | undefined;

    if (!profile) {
      // Auto-register faculty user on first login
      const newId = genUUID();
      const now = new Date().toISOString();
      const fullName = cleanEmail.split('@')[0].replace(/[._]/g, ' ');
      const role = roleHint || (cleanEmail.includes('admin') ? 'admin' : 'faculty');
      db.prepare(`
        INSERT INTO profiles (id, full_name, email, role, account_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(newId, fullName, cleanEmail, role, 'active', now, now);

      profile = {
        id: newId,
        full_name: fullName,
        email: cleanEmail,
        role,
        account_status: 'active',
        created_at: now
      };
    }

    res.json({
      success: true,
      user: { id: profile.id, email: profile.email },
      profile
    });
  } catch (err: unknown) {
    console.error('API login error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Login failed' });
  }
});

// Auth: Register
app.post('/api/auth/register', (req, res) => {
  try {
    const { fullName, email, role } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ error: 'Full name and email are required' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const existing = db.prepare('SELECT id FROM profiles WHERE lower(email) = ?').get(cleanEmail);
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists.' });
    }

    const newId = genUUID();
    const now = new Date().toISOString();
    const assignedRole = role === 'admin' ? 'admin' : 'faculty';
    db.prepare(`
      INSERT INTO profiles (id, full_name, email, role, account_status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(newId, fullName.trim(), cleanEmail, assignedRole, 'active', now, now);

    const profile = {
      id: newId,
      full_name: fullName.trim(),
      email: cleanEmail,
      role: assignedRole,
      account_status: 'active',
      created_at: now
    };

    res.json({
      success: true,
      user: { id: newId, email: cleanEmail },
      profile
    });
  } catch (err: unknown) {
    console.error('API register error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Registration failed' });
  }
});

// Get current profile
app.get('/api/profiles/:id', (req, res) => {
  try {
    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
    if (!profile) return res.status(404).json({ error: 'Profile not found' });
    res.json(profile);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// Update profile
app.put('/api/profiles/:id', (req, res) => {
  try {
    const { full_name } = req.body;
    const now = new Date().toISOString();
    db.prepare('UPDATE profiles SET full_name = ?, updated_at = ? WHERE id = ?').run(full_name, now, req.params.id);
    const updated = db.prepare('SELECT * FROM profiles WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

// Delete account
app.delete('/api/profiles/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM profiles WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Deletion failed' });
  }
});

// List all profiles (Admin)
app.get('/api/profiles', (req, res) => {
  try {
    const profiles = db.prepare('SELECT * FROM profiles ORDER BY created_at DESC').all();
    res.json(profiles);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// ============================================================================
// CLASSROOMS CRUD
// ============================================================================

// List classrooms for faculty
app.get('/api/classrooms', (req, res) => {
  try {
    const facultyId = req.query.faculty_id as string | undefined;
    let query = 'SELECT * FROM classrooms';
    const params: string[] = [];
    if (facultyId) {
      query += ' WHERE faculty_id = ?';
      params.push(facultyId);
    }
    query += ' ORDER BY created_at DESC';
    const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;

    const classrooms = rows.map(r => {
      const studentCount = (db.prepare('SELECT COUNT(*) as count FROM students WHERE classroom_id = ?').get(r.id as string) as { count: number }).count;
      return {
        ...r,
        student_count: studentCount,
        branches: r.branches ? JSON.parse(r.branches as string) : undefined,
        branch_configs: r.branch_configs ? JSON.parse(r.branch_configs as string) : undefined,
        gender_config: r.gender_config ? JSON.parse(r.gender_config as string) : undefined,
        enforce_seating_rule: Boolean(r.enforce_seating_rule)
      };
    });

    res.json(classrooms);
  } catch (err: unknown) {
    console.error('API get classrooms error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// Get single classroom by ID
app.get('/api/classrooms/:id', (req, res) => {
  try {
    const r = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
    if (!r) {
      return res.status(404).json({ error: 'Classroom not found' });
    }
    const studentCount = (db.prepare('SELECT COUNT(*) as count FROM students WHERE classroom_id = ?').get(r.id as string) as { count: number }).count;
    const classroom = {
      ...r,
      student_count: studentCount,
      branches: r.branches ? JSON.parse(r.branches as string) : undefined,
      branch_configs: r.branch_configs ? JSON.parse(r.branch_configs as string) : undefined,
      gender_config: r.gender_config ? JSON.parse(r.gender_config as string) : undefined,
      enforce_seating_rule: Boolean(r.enforce_seating_rule)
    };
    res.json(classroom);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// Create classroom + automatically create all seat records
app.post('/api/classrooms', (req, res) => {
  try {
    const {
      faculty_id,
      class_name,
      rows,
      columns,
      branch,
      branches,
      branch_configs,
      seating_division_mode,
      gender_config,
      enforce_seating_rule
    } = req.body;

    if (!faculty_id || !class_name || !rows || !columns) {
      return res.status(400).json({ error: 'Missing required classroom fields' });
    }

    const nRows = Number(rows);
    const nCols = Number(columns);
    const total_positions = nRows * nCols;
    const classroomId = genUUID();
    const now = new Date().toISOString();

    // 1. Insert classroom
    db.prepare(`
      INSERT INTO classrooms (
        id, faculty_id, class_name, rows, columns, total_positions,
        branch, branches, branch_configs, seating_division_mode, gender_config,
        enforce_seating_rule, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      classroomId,
      faculty_id,
      class_name.trim(),
      nRows,
      nCols,
      total_positions,
      branch || (branches && branches.length > 0 ? branches.join(' + ') : 'General'),
      branches ? JSON.stringify(branches) : null,
      branch_configs ? JSON.stringify(branch_configs) : null,
      seating_division_mode || 'gender',
      gender_config ? JSON.stringify(gender_config) : null,
      enforce_seating_rule === false ? 0 : 1,
      now,
      now
    );

    // 2. Automatically create all seat records (R1-C1 ... Rr-Cc)
    const insertSeat = db.prepare(`
      INSERT INTO seats (id, classroom_id, row_number, column_number, position_number, seat_code, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (let r = 1; r <= nRows; r++) {
      for (let c = 1; c <= nCols; c++) {
        const posNum = (r - 1) * nCols + c;
        const seatCode = `R${r}-C${c}`;
        insertSeat.run(genUUID(), classroomId, r, c, posNum, seatCode, now);
      }
    }

    const created = {
      id: classroomId,
      faculty_id,
      class_name: class_name.trim(),
      rows: nRows,
      columns: nCols,
      total_positions,
      branch,
      branches,
      branch_configs,
      seating_division_mode: seating_division_mode || 'gender',
      gender_config,
      enforce_seating_rule: enforce_seating_rule !== false,
      student_count: 0,
      created_at: now,
      updated_at: now
    };

    // Log activity
    db.prepare('INSERT INTO activity_logs (id, user_id, action, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
      genUUID(),
      faculty_id,
      'CREATE_CLASSROOM',
      `Created classroom "${class_name}" (${nRows}x${nCols} = ${total_positions} seats)`,
      now
    );

    broadcastUpdate('CLASSROOM_CREATED', created);

    safeSupabaseSync(async () => {
      const { error } = await supabaseClient!.from('classrooms').upsert({
        id: classroomId,
        faculty_id,
        class_name: class_name.trim(),
        rows: nRows,
        columns: nCols
      });
      if (error) console.warn('[Supabase Sync classrooms error]:', error.message);
    });

    res.status(201).json(created);
  } catch (err: unknown) {
    console.error('API create classroom error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Creation failed' });
  }
});

// Update classroom
app.put('/api/classrooms/:id', (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    const {
      class_name,
      rows,
      columns,
      branch,
      branches,
      branch_configs,
      seating_division_mode,
      gender_config,
      enforce_seating_rule
    } = req.body;

    const nRows = rows !== undefined ? Number(rows) : Number(existing.rows);
    const nCols = columns !== undefined ? Number(columns) : Number(existing.columns);
    const total_positions = nRows * nCols;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE classrooms SET
        class_name = ?,
        rows = ?,
        columns = ?,
        total_positions = ?,
        branch = ?,
        branches = ?,
        branch_configs = ?,
        seating_division_mode = ?,
        gender_config = ?,
        enforce_seating_rule = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      class_name !== undefined ? class_name.trim() : (existing.class_name as string),
      nRows,
      nCols,
      total_positions,
      branch !== undefined ? branch : (existing.branch as string | null),
      branches !== undefined ? JSON.stringify(branches) : (existing.branches as string | null),
      branch_configs !== undefined ? JSON.stringify(branch_configs) : (existing.branch_configs as string | null),
      seating_division_mode !== undefined ? seating_division_mode : (existing.seating_division_mode as string | null),
      gender_config !== undefined ? JSON.stringify(gender_config) : (existing.gender_config as string | null),
      enforce_seating_rule !== undefined ? (enforce_seating_rule ? 1 : 0) : Number(existing.enforce_seating_rule),
      now,
      id
    );

    // If rows/cols changed, recreate seat records
    if (nRows !== Number(existing.rows) || nCols !== Number(existing.columns)) {
      db.prepare('DELETE FROM seats WHERE classroom_id = ?').run(id);
      const insertSeat = db.prepare(`
        INSERT INTO seats (id, classroom_id, row_number, column_number, position_number, seat_code, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (let r = 1; r <= nRows; r++) {
        for (let c = 1; c <= nCols; c++) {
          const posNum = (r - 1) * nCols + c;
          const seatCode = `R${r}-C${c}`;
          insertSeat.run(genUUID(), id, r, c, posNum, seatCode, now);
        }
      }
    }

    const updated = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id) as Record<string, unknown>;
    const studentCount = (db.prepare('SELECT COUNT(*) as count FROM students WHERE classroom_id = ?').get(id) as { count: number }).count;

    const result = {
      ...updated,
      student_count: studentCount,
      branches: updated.branches ? JSON.parse(updated.branches as string) : undefined,
      branch_configs: updated.branch_configs ? JSON.parse(updated.branch_configs as string) : undefined,
      gender_config: updated.gender_config ? JSON.parse(updated.gender_config as string) : undefined,
      enforce_seating_rule: Boolean(updated.enforce_seating_rule)
    };

    broadcastUpdate('CLASSROOM_UPDATED', result);
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

// Delete classroom (cascading)
app.delete('/api/classrooms/:id', (req, res) => {
  try {
    const id = req.params.id;
    // Delete dependent records
    db.prepare('DELETE FROM attendance_records WHERE session_id IN (SELECT id FROM attendance_sessions WHERE classroom_id = ?)').run(id);
    db.prepare('DELETE FROM attendance_sessions WHERE classroom_id = ?').run(id);
    db.prepare('DELETE FROM students WHERE classroom_id = ?').run(id);
    db.prepare('DELETE FROM seats WHERE classroom_id = ?').run(id);
    db.prepare('DELETE FROM classrooms WHERE id = ?').run(id);

    broadcastUpdate('CLASSROOM_DELETED', { id });

    safeSupabaseSync(async () => {
      const { error } = await supabaseClient!.from('classrooms').delete().eq('id', id);
      if (error) console.warn('[Supabase Sync delete classroom error]:', error.message);
    });

    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Deletion failed' });
  }
});

// ============================================================================
// SEATS & STUDENTS CRUD
// ============================================================================

// Get classroom seats
app.get('/api/classrooms/:id/seats', (req, res) => {
  try {
    const seats = db.prepare('SELECT * FROM seats WHERE classroom_id = ? ORDER BY row_number ASC, column_number ASC').all(req.params.id);
    res.json(seats);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// Get classroom students
app.get('/api/classrooms/:id/students', (req, res) => {
  try {
    const students = db.prepare('SELECT * FROM students WHERE classroom_id = ? ORDER BY row_number ASC, column_number ASC').all(req.params.id);
    res.json(students);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// Assign single student to seat
app.post('/api/classrooms/:id/students', (req, res) => {
  try {
    const classroomId = req.params.id;
    const {
      student_name,
      roll_number,
      branch,
      gender,
      section_wing,
      section,
      email,
      mobile,
      row_number,
      column_number,
      position_number
    } = req.body;

    if (!student_name || !roll_number || !row_number || !column_number) {
      return res.status(400).json({ error: 'Missing required student fields' });
    }

    const cleanRoll = roll_number.trim().toUpperCase();
    const existingRoll = db.prepare('SELECT id FROM students WHERE classroom_id = ? AND roll_number = ?').get(classroomId, cleanRoll);
    if (existingRoll) {
      return res.status(400).json({ error: `Roll number ${cleanRoll} is already registered in this classroom.` });
    }

    const occupiedSeat = db.prepare('SELECT student_name FROM students WHERE classroom_id = ? AND row_number = ? AND column_number = ?').get(classroomId, row_number, column_number) as { student_name: string } | undefined;
    if (occupiedSeat) {
      return res.status(400).json({ error: `Seat R${row_number}-C${column_number} is already occupied by ${occupiedSeat.student_name}.` });
    }

    const studentId = genUUID();
    const now = new Date().toISOString();
    const seatId = `R${row_number}-C${column_number}`;
    const posNum = Number(position_number) || (Number(row_number) - 1) * 4 + Number(column_number);

    db.prepare(`
      INSERT INTO students (
        id, classroom_id, student_name, roll_number, branch, gender,
        section_wing, section, email, mobile, seat_id,
        row_number, column_number, position_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      studentId,
      classroomId,
      student_name.trim(),
      cleanRoll,
      branch ? branch.trim() : 'General',
      gender || 'Male',
      section_wing || null,
      section || null,
      email || null,
      mobile || null,
      seatId,
      Number(row_number),
      Number(column_number),
      posNum,
      now,
      now
    );

    const created = db.prepare('SELECT * FROM students WHERE id = ?').get(studentId);
    broadcastUpdate('STUDENT_ASSIGNED', { classroomId, student: created });

    safeSupabaseSync(async () => {
      const { error } = await supabaseClient!.from('students').upsert({
        id: studentId,
        classroom_id: classroomId,
        student_name: student_name.trim(),
        roll_number: cleanRoll,
        branch: branch ? branch.trim() : 'General',
        gender: gender || 'Male',
        row_number: Number(row_number),
        column_number: Number(column_number),
        position_number: posNum
      });
      if (error) console.warn('[Supabase Sync student error]:', error.message);
    });

    res.status(201).json(created);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Assignment failed' });
  }
});

// Bulk assign students (Transaction-safe)
app.post('/api/classrooms/:id/students/bulk', (req, res) => {
  try {
    const classroomId = req.params.id;
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return res.json({ inserted: [], count: 0 });
    }

    const existingStudents = db.prepare('SELECT roll_number, row_number, column_number FROM students WHERE classroom_id = ?').all(classroomId) as Array<{
      roll_number: string; row_number: number; column_number: number;
    }>;

    const existingRolls = new Set(existingStudents.map(s => s.roll_number.trim().toUpperCase()));
    const occupiedSeats = new Set(existingStudents.map(s => `${s.row_number}-${s.column_number}`));

    const now = new Date().toISOString();
    const insertStmt = db.prepare(`
      INSERT INTO students (
        id, classroom_id, student_name, roll_number, branch, gender,
        section_wing, section, email, mobile, seat_id,
        row_number, column_number, position_number, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const inserted: Array<Record<string, unknown>> = [];

    // Transaction execution
    db.exec('BEGIN TRANSACTION');
    try {
      for (const st of students) {
        const cleanRoll = String(st.roll_number).trim().toUpperCase();
        const seatKey = `${st.row_number}-${st.column_number}`;

        if (existingRolls.has(cleanRoll)) continue;
        if (occupiedSeats.has(seatKey)) continue;

        existingRolls.add(cleanRoll);
        occupiedSeats.add(seatKey);

        const newId = genUUID();
        const seatCode = `R${st.row_number}-C${st.column_number}`;
        const posNum = Number(st.position_number) || (Number(st.row_number) - 1) * 4 + Number(st.column_number);

        insertStmt.run(
          newId,
          classroomId,
          String(st.student_name).trim(),
          cleanRoll,
          st.branch ? String(st.branch).trim() : 'General',
          st.gender === 'Female' ? 'Female' : 'Male',
          st.section_wing || null,
          st.section || null,
          st.email || null,
          st.mobile || null,
          seatCode,
          Number(st.row_number),
          Number(st.column_number),
          posNum,
          now,
          now
        );

        inserted.push({
          id: newId,
          classroom_id: classroomId,
          student_name: String(st.student_name).trim(),
          roll_number: cleanRoll,
          branch: st.branch || 'General',
          gender: st.gender === 'Female' ? 'Female' : 'Male',
          seat_id: seatCode,
          row_number: Number(st.row_number),
          column_number: Number(st.column_number),
          position_number: posNum,
          created_at: now,
          updated_at: now
        });
      }
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }

    broadcastUpdate('STUDENTS_BULK_IMPORTED', { classroomId, count: inserted.length });

    if (inserted.length > 0) {
      safeSupabaseSync(async () => {
        const records = inserted.map(s => ({
          id: s.id as string,
          classroom_id: classroomId,
          student_name: s.student_name as string,
          roll_number: s.roll_number as string,
          branch: s.branch as string,
          gender: s.gender as string,
          row_number: s.row_number as number,
          column_number: s.column_number as number,
          position_number: s.position_number as number
        }));
        const { error } = await supabaseClient!.from('students').upsert(records);
        if (error) console.warn('[Supabase Sync bulk students error]:', error.message);
      });
    }

    res.json({ inserted, count: inserted.length });
  } catch (err: unknown) {
    console.error('API bulk import error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Bulk import failed' });
  }
});

// Update student (including moving seat)
app.put('/api/students/:id', (req, res) => {
  try {
    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM students WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!existing) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const {
      student_name,
      roll_number,
      branch,
      gender,
      row_number,
      column_number,
      position_number
    } = req.body;

    const classroomId = existing.classroom_id as string;
    const newRoll = roll_number !== undefined ? String(roll_number).trim().toUpperCase() : (existing.roll_number as string);
    const newRow = row_number !== undefined ? Number(row_number) : Number(existing.row_number);
    const newCol = column_number !== undefined ? Number(column_number) : Number(existing.column_number);

    // Validate seat vacancy if seat moved
    if (newRow !== Number(existing.row_number) || newCol !== Number(existing.column_number)) {
      const occupant = db.prepare('SELECT id, student_name FROM students WHERE classroom_id = ? AND row_number = ? AND column_number = ? AND id != ?').get(classroomId, newRow, newCol, id) as { id: string; student_name: string } | undefined;
      if (occupant) {
        return res.status(400).json({ error: `Seat R${newRow}-C${newCol} is occupied by ${occupant.student_name}` });
      }
    }

    const now = new Date().toISOString();
    const newSeatCode = `R${newRow}-C${newCol}`;
    const newPos = position_number !== undefined ? Number(position_number) : (newRow - 1) * 4 + newCol;

    db.prepare(`
      UPDATE students SET
        student_name = ?,
        roll_number = ?,
        branch = ?,
        gender = ?,
        row_number = ?,
        column_number = ?,
        position_number = ?,
        seat_id = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      student_name !== undefined ? String(student_name).trim() : (existing.student_name as string),
      newRoll,
      branch !== undefined ? String(branch).trim() : (existing.branch as string),
      gender !== undefined ? String(gender) : (existing.gender as string),
      newRow,
      newCol,
      newPos,
      newSeatCode,
      now,
      id
    );

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    broadcastUpdate('STUDENT_UPDATED', { classroomId, student: updated });
    res.json(updated);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Update failed' });
  }
});

// Remove student
app.delete('/api/students/:id', (req, res) => {
  try {
    const student = db.prepare('SELECT classroom_id FROM students WHERE id = ?').get(req.params.id) as { classroom_id: string } | undefined;
    db.prepare('DELETE FROM attendance_records WHERE student_id = ?').run(req.params.id);
    db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
    broadcastUpdate('STUDENT_REMOVED', { id: req.params.id, classroomId: student?.classroom_id });
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Deletion failed' });
  }
});

// ============================================================================
// ATTENDANCE SESSIONS & RECORDS
// ============================================================================

// Submit attendance session
app.post('/api/classrooms/:id/attendance', (req, res) => {
  try {
    const classroomId = req.params.id;
    const { faculty_id, attendance_date, start_time, end_time, notes, marks } = req.body;

    if (!faculty_id || !marks) {
      return res.status(400).json({ error: 'Missing faculty_id or marks' });
    }

    const students = db.prepare('SELECT id FROM students WHERE classroom_id = ?').all(classroomId) as Array<{ id: string }>;
    const sessionId = genUUID();
    const now = new Date().toISOString();
    const dateStr = attendance_date || now.split('T')[0];
    const timeStr = start_time || now.split('T')[1].split('.')[0];

    db.exec('BEGIN TRANSACTION');
    try {
      db.prepare(`
        INSERT INTO attendance_sessions (id, classroom_id, faculty_id, attendance_date, start_time, end_time, notes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        sessionId,
        classroomId,
        faculty_id,
        dateStr,
        timeStr,
        end_time || null,
        notes || null,
        now
      );

      const recordStmt = db.prepare(`
        INSERT INTO attendance_records (id, session_id, student_id, status, marked_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      let presentCount = 0;
      let absentCount = 0;

      for (const st of students) {
        const mark = marks[st.id];
        const status = mark === 'Absent' ? 'Absent' : 'Present';
        if (status === 'Present') presentCount++;
        else absentCount++;

        recordStmt.run(genUUID(), sessionId, st.id, status, now);
      }

      db.exec('COMMIT');

      const session = {
        id: sessionId,
        classroom_id: classroomId,
        faculty_id,
        attendance_date: dateStr,
        start_time: timeStr,
        end_time: end_time || null,
        notes: notes || null,
        total_students: students.length,
        present_count: presentCount,
        absent_count: absentCount,
        attendance_percentage: students.length > 0 ? Math.round((presentCount / students.length) * 1000) / 10 : 0,
        created_at: now
      };

      broadcastUpdate('ATTENDANCE_SUBMITTED', { classroomId, session });

      if (supabaseClient) {
        safeSupabaseSync(async () => {
          const { error: sessErr } = await supabaseClient!.from('attendance_sessions').upsert({
            id: sessionId,
            classroom_id: classroomId,
            faculty_id,
            attendance_date: dateStr,
            start_time: timeStr,
            notes: notes || null
          });
          if (sessErr) {
            console.warn('[Supabase Sync session error]:', sessErr.message);
            return;
          }
          const recBatch = students.map(st => {
            const mark = marks[st.id];
            const status = mark === 'Absent' ? 'Absent' : 'Present';
            return {
              id: genUUID(),
              session_id: sessionId,
              student_id: st.id,
              status
            };
          });
          const { error: recErr } = await supabaseClient!.from('attendance_records').upsert(recBatch);
          if (recErr) console.warn('[Supabase Sync records error]:', recErr.message);
        });
      }

      res.status(201).json(session);
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
  } catch (err: unknown) {
    console.error('API submit attendance error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Submission failed' });
  }
});

// Get attendance sessions
app.get('/api/attendance/sessions', (req, res) => {
  try {
    const { faculty_id, classroom_id, date } = req.query;
    let query = `
      SELECT s.*, c.class_name,
        (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = s.id AND r.status = 'Present') as present_count,
        (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = s.id AND r.status = 'Absent') as absent_count,
        (SELECT COUNT(*) FROM attendance_records r WHERE r.session_id = s.id) as total_students
      FROM attendance_sessions s
      LEFT JOIN classrooms c ON c.id = s.classroom_id
      WHERE 1=1
    `;
    const params: string[] = [];

    if (classroom_id) {
      query += ' AND s.classroom_id = ?';
      params.push(classroom_id as string);
    }
    if (faculty_id) {
      query += ' AND s.faculty_id = ?';
      params.push(faculty_id as string);
    }
    if (date) {
      query += ' AND s.attendance_date = ?';
      params.push(date as string);
    }

    query += ' ORDER BY s.created_at DESC';

    const rows = db.prepare(query).all(...params) as Array<Record<string, unknown>>;
    const sessions = rows.map(r => {
      const total = Number(r.total_students) || 0;
      const present = Number(r.present_count) || 0;
      return {
        ...r,
        attendance_percentage: total > 0 ? Math.round((present / total) * 1000) / 10 : 0
      };
    });

    res.json(sessions);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// Get records for a session
app.get('/api/attendance/sessions/:id/records', (req, res) => {
  try {
    const query = `
      SELECT r.*, s.student_name, s.roll_number, s.branch, s.gender, s.row_number, s.column_number, s.position_number
      FROM attendance_records r
      JOIN students s ON s.id = r.student_id
      WHERE r.session_id = ?
      ORDER BY s.row_number ASC, s.column_number ASC
    `;
    const records = db.prepare(query).all(req.params.id);
    res.json(records);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

// Aggregate Report for a classroom
app.get('/api/classrooms/:id/reports', (req, res) => {
  try {
    const classroomId = req.params.id;
    const cls = db.prepare('SELECT class_name FROM classrooms WHERE id = ?').get(classroomId) as { class_name: string } | undefined;
    const students = db.prepare('SELECT * FROM students WHERE classroom_id = ? ORDER BY row_number ASC, column_number ASC').all(classroomId) as Array<Record<string, unknown>>;

    const sessions = db.prepare('SELECT id FROM attendance_sessions WHERE classroom_id = ?').all(classroomId) as Array<{ id: string }>;
    const totalSessions = sessions.length;

    const report = students.map(st => {
      const studentId = st.id as string;
      const presentCount = (db.prepare(`
        SELECT COUNT(*) as count FROM attendance_records r
        JOIN attendance_sessions s ON s.id = r.session_id
        WHERE s.classroom_id = ? AND r.student_id = ? AND r.status = 'Present'
      `).get(classroomId, studentId) as { count: number }).count;

      const absentCount = (db.prepare(`
        SELECT COUNT(*) as count FROM attendance_records r
        JOIN attendance_sessions s ON s.id = r.session_id
        WHERE s.classroom_id = ? AND r.student_id = ? AND r.status = 'Absent'
      `).get(classroomId, studentId) as { count: number }).count;

      const percentage = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 1000) / 10 : 100;

      return {
        student_id: studentId,
        roll_number: st.roll_number,
        student_name: st.student_name,
        branch: st.branch,
        gender: st.gender,
        row_number: st.row_number,
        column_number: st.column_number,
        position_number: st.position_number,
        classroom_name: cls?.class_name || 'Classroom',
        total_sessions: totalSessions,
        present_count: presentCount,
        absent_count: absentCount,
        percentage
      };
    });

    res.json(report);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Report generation failed' });
  }
});

// Activity logs
app.get('/api/logs', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT l.*, p.full_name as user_name
      FROM activity_logs l
      LEFT JOIN profiles p ON p.id = l.user_id
      ORDER BY l.created_at DESC
      LIMIT 100
    `).all();
    res.json(logs);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Query failed' });
  }
});

app.post('/api/logs', (req, res) => {
  try {
    const { user_id, action, description } = req.body;
    const now = new Date().toISOString();
    db.prepare('INSERT INTO activity_logs (id, user_id, action, description, created_at) VALUES (?, ?, ?, ?, ?)').run(
      genUUID(),
      user_id || null,
      action,
      description,
      now
    );
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Logging failed' });
  }
});

// ============================================================================
// SERVER INITIALIZATION (Dev with Vite middlewares & Production static)
// ============================================================================

async function initialSupabasePull() {
  if (!supabaseClient) return;
  try {
    const { data: remoteClassrooms } = await supabaseClient.from('classrooms').select('*');
    if (remoteClassrooms && remoteClassrooms.length > 0) {
      for (const rc of remoteClassrooms) {
        const exists = db.prepare('SELECT id FROM classrooms WHERE id = ?').get(rc.id);
        const now = rc.created_at || new Date().toISOString();
        if (!exists) {
          db.prepare(`
            INSERT INTO classrooms (id, faculty_id, class_name, rows, columns, total_positions, branch, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(rc.id, rc.faculty_id, rc.class_name, rc.rows, rc.columns, rc.rows * rc.columns, rc.branch || 'General', now, now);

          for (let r = 1; r <= rc.rows; r++) {
            for (let c = 1; c <= rc.columns; c++) {
              const posNum = (r - 1) * rc.columns + c;
              db.prepare(`
                INSERT OR IGNORE INTO seats (id, classroom_id, row_number, column_number, position_number, seat_code, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `).run(genUUID(), rc.id, r, c, posNum, `R${r}-C${c}`, now);
            }
          }
        }

        const { data: remoteStudents } = await supabaseClient.from('students').select('*').eq('classroom_id', rc.id);
        if (remoteStudents && remoteStudents.length > 0) {
          for (const rs of remoteStudents) {
            const stExists = db.prepare('SELECT id FROM students WHERE id = ?').get(rs.id);
            if (!stExists) {
              const seatCode = `R${rs.row_number}-C${rs.column_number}`;
              db.prepare(`
                INSERT OR IGNORE INTO students (
                  id, classroom_id, student_name, roll_number, branch, gender,
                  section_wing, section, email, mobile, seat_id,
                  row_number, column_number, position_number, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `).run(
                rs.id, rc.id, rs.student_name, rs.roll_number, rs.branch || 'General',
                rs.gender || 'Male', rs.section_wing || null, rs.section || null,
                rs.email || null, rs.mobile || null, seatCode,
                rs.row_number, rs.column_number, rs.position_number,
                rs.created_at || now, rs.updated_at || now
              );
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[Supabase Initial Pull Notice]:', err);
  }
}

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Attendance API] Server listening on http://0.0.0.0:${PORT}`);
    initialSupabasePull().catch(() => {});
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
