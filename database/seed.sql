-- ====================================================================
-- DIGITAL ATTENDANCE FOR FIXED POSITIONS
-- DEMO SEED DATA FOR TESTING & EVALUATION
-- Classroom: "AI & DS - Section A" (4 Rows x 4 Columns = 16 Students)
-- ====================================================================

-- 1. Ensure required cryptographic extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Ensure all columns exist on tables (in case tables were created with partial schema)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'faculty';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS faculty_id UUID;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS rows INTEGER;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS columns INTEGER;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS classroom_id UUID;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS row_number INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS column_number INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS position_number INTEGER;

ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS classroom_id UUID;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS faculty_id UUID;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT CURRENT_TIME;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS session_id UUID;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ DEFAULT NOW();

-- Safely add unique constraint for students if not present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_roll_per_classroom') THEN
        ALTER TABLE public.students ADD CONSTRAINT unique_roll_per_classroom UNIQUE (classroom_id, roll_number);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- 3. Insert Demo Users into Supabase auth.users FIRST
-- Satisfies the foreign key constraint: profiles.id -> auth.users(id)
-- Credentials:
--   Faculty:  ramesh.faculty@university.edu  /  Faculty@123
--   Admin:    admin.portal@university.edu    /  Admin@123
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
)
VALUES 
    (
        '00000000-0000-0000-0000-000000000000',
        'a0000000-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'ramesh.faculty@university.edu',
        crypt('Faculty@123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Dr. Ramesh Kumar","role":"faculty"}'::jsonb,
        NOW(),
        NOW(),
        '',
        ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'a0000000-0000-0000-0000-000000000002',
        'authenticated',
        'authenticated',
        'admin.portal@university.edu',
        crypt('Admin@123', gen_salt('bf')),
        NOW(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{"full_name":"Admin Dean Office","role":"admin"}'::jsonb,
        NOW(),
        NOW(),
        '',
        ''
    )
ON CONFLICT (id) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = NOW(),
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;

-- 4. Register Email Authentication Identities for Supabase GoTrue
DO $$
BEGIN
    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'ramesh.faculty@university.edu'),
        'email',
        'ramesh.faculty@university.edu',
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;

    INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
    ) VALUES (
        'a0000000-0000-0000-0000-000000000002',
        'a0000000-0000-0000-0000-000000000002',
        jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000002', 'email', 'admin.portal@university.edu'),
        'email',
        'admin.portal@university.edu',
        NOW(),
        NOW(),
        NOW()
    ) ON CONFLICT DO NOTHING;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Skipping identities: %', SQLERRM;
END $$;

-- 5. Upsert Profiles in public.profiles
INSERT INTO public.profiles (id, full_name, email, role, account_status)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Dr. Ramesh Kumar', 'ramesh.faculty@university.edu', 'faculty', 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'Admin Dean Office', 'admin.portal@university.edu', 'admin', 'active')
ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    account_status = EXCLUDED.account_status,
    updated_at = NOW();

-- 6. Insert Demo Classroom (4 Rows x 4 Columns = 16 Fixed Positions)
-- Note: 'c0000000-0000-0000-0000-000000000001' is a valid hex UUID
INSERT INTO public.classrooms (id, faculty_id, class_name, rows, columns)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'AI & DS - Section A',
    4,
    4
) ON CONFLICT (id) DO NOTHING;

-- 7. Insert 16 Fixed Students for 4x4 Cinema-Style Matrix
-- Each seat position has: Student Name, Roll Number, Branch, Gender, Row, Column, Position
INSERT INTO public.students (classroom_id, student_name, roll_number, branch, gender, row_number, column_number, position_number)
VALUES
    -- Row 1: Positions 1 to 4
    ('c0000000-0000-0000-0000-000000000001', 'Aarav Sharma', '23A81A0501', 'AI & DS', 'Male', 1, 1, 1),
    ('c0000000-0000-0000-0000-000000000001', 'Rohan Verma', '23A81A0502', 'AI & DS', 'Male', 1, 2, 2),
    ('c0000000-0000-0000-0000-000000000001', 'Ananya Iyer', '23A81A0503', 'AI & DS', 'Female', 1, 3, 3),
    ('c0000000-0000-0000-0000-000000000001', 'Diya Reddy', '23A81A0504', 'AI & DS', 'Female', 1, 4, 4),

    -- Row 2: Positions 5 to 8
    ('c0000000-0000-0000-0000-000000000001', 'Rahul Nair', '23A81A0505', 'AI & DS', 'Male', 2, 1, 5),
    ('c0000000-0000-0000-0000-000000000001', 'Siddharth Sen', '23A81A0506', 'AI & DS', 'Male', 2, 2, 6),
    ('c0000000-0000-0000-0000-000000000001', 'Kavya Pillai', '23A81A0507', 'AI & DS', 'Female', 2, 3, 7),
    ('c0000000-0000-0000-0000-000000000001', 'Sneha Patel', '23A81A0508', 'AI & DS', 'Female', 2, 4, 8),

    -- Row 3: Positions 9 to 12
    ('c0000000-0000-0000-0000-000000000001', 'Aditya Joshi', '23A81A0509', 'AI & DS', 'Male', 3, 1, 9),
    ('c0000000-0000-0000-0000-000000000001', 'Karan Gupta', '23A81A0510', 'AI & DS', 'Male', 3, 2, 10),
    ('c0000000-0000-0000-0000-000000000001', 'Pooja Hegde', '23A81A0511', 'AI & DS', 'Female', 3, 3, 11),
    ('c0000000-0000-0000-0000-000000000001', 'Meera Menon', '23A81A0512', 'AI & DS', 'Female', 3, 4, 12),

    -- Row 4: Positions 13 to 16
    ('c0000000-0000-0000-0000-000000000001', 'Vikram Malhotra', '23A81A0513', 'AI & DS', 'Male', 4, 1, 13),
    ('c0000000-0000-0000-0000-000000000001', 'Arjun Saxena', '23A81A0514', 'AI & DS', 'Male', 4, 2, 14),
    ('c0000000-0000-0000-0000-000000000001', 'Tanvi Deshmukh', '23A81A0515', 'AI & DS', 'Female', 4, 3, 15),
    ('c0000000-0000-0000-0000-000000000001', 'Isha Kulkarni', '23A81A0516', 'AI & DS', 'Female', 4, 4, 16)
ON CONFLICT (classroom_id, roll_number) DO UPDATE SET
    student_name = EXCLUDED.student_name,
    branch = EXCLUDED.branch,
    gender = EXCLUDED.gender,
    row_number = EXCLUDED.row_number,
    column_number = EXCLUDED.column_number,
    position_number = EXCLUDED.position_number;

-- 8. Insert Demo Attendance Session
-- Using valid hex UUID: 'd0000000-0000-0000-0000-000000000001' ('d' is valid hexadecimal)
INSERT INTO public.attendance_sessions (id, classroom_id, faculty_id, attendance_date, start_time, notes)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    '09:00:00',
    'Morning lecture: Neural Networks Foundations'
) ON CONFLICT (id) DO NOTHING;

-- 9. Mark Attendance Records (14 Present, 2 Absent)
INSERT INTO public.attendance_records (session_id, student_id, status)
SELECT 
    'd0000000-0000-0000-0000-000000000001',
    s.id,
    CASE 
        WHEN s.position_number IN (6, 15) THEN 'Absent'
        ELSE 'Present'
    END
FROM public.students s
WHERE s.classroom_id = 'c0000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;
