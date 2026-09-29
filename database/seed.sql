-- ====================================================================
-- DEMO SEED DATA FOR TESTING & EVALUATION
-- Classroom: "AI & DS - Section A" (4 Rows x 4 Columns = 16 Students)
-- ====================================================================

-- 1. Insert Demo Profiles (Requires matching UUIDs in auth.users if deploying to live Supabase Auth)
-- In live Supabase, register through the app UI or Supabase Auth dashboard.
-- For local / SQL testing:
INSERT INTO public.profiles (id, full_name, email, role, account_status)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'Dr. Ramesh Kumar', 'ramesh.faculty@university.edu', 'faculty', 'active'),
    ('a0000000-0000-0000-0000-000000000002', 'Admin Dean Office', 'admin.portal@university.edu', 'admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Demo Classroom
INSERT INTO public.classrooms (id, faculty_id, class_name, rows, columns)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'AI & DS - Section A',
    4,
    4
) ON CONFLICT (id) DO NOTHING;

-- 3. Insert 16 Fixed Students for 4x4 Grid
-- Row 1: Positions 1 to 4
INSERT INTO public.students (classroom_id, student_name, roll_number, branch, gender, row_number, column_number, position_number)
VALUES
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
ON CONFLICT (classroom_id, roll_number) DO NOTHING;

-- 4. Insert Demo Attendance Session
INSERT INTO public.attendance_sessions (id, classroom_id, faculty_id, attendance_date, start_time, notes)
VALUES (
    's0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    CURRENT_DATE,
    '09:00:00',
    'Morning lecture: Neural Networks Foundations'
) ON CONFLICT (id) DO NOTHING;

-- 5. Mark Attendance Records (14 Present, 2 Absent)
INSERT INTO public.attendance_records (session_id, student_id, status)
SELECT 
    's0000000-0000-0000-0000-000000000001',
    s.id,
    CASE 
        WHEN s.position_number IN (6, 15) THEN 'Absent'
        ELSE 'Present'
    END
FROM public.students s
WHERE s.classroom_id = 'c0000000-0000-0000-0000-000000000001'
ON CONFLICT (session_id, student_id) DO NOTHING;
