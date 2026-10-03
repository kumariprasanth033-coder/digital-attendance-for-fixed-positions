-- ====================================================================
-- DIGITAL ATTENDANCE FOR FIXED POSITIONS
-- Supabase PostgreSQL Database Schema with Row Level Security (RLS)
-- ====================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (Linked with Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('faculty', 'admin')) DEFAULT 'faculty',
    account_status TEXT NOT NULL CHECK (account_status IN ('active', 'suspended', 'pending')) DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CLASSROOMS TABLE
CREATE TABLE IF NOT EXISTS public.classrooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    rows INTEGER NOT NULL CHECK (rows > 0 AND rows <= 20),
    columns INTEGER NOT NULL CHECK (columns > 0 AND columns <= 20),
    total_positions INTEGER GENERATED ALWAYS AS (rows * columns) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.1 SEATS TABLE (Fixed Classroom Positions)
CREATE TABLE IF NOT EXISTS public.seats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    column_number INTEGER NOT NULL CHECK (column_number > 0),
    position_number INTEGER NOT NULL CHECK (position_number > 0),
    seat_code TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_seat_position UNIQUE (classroom_id, row_number, column_number)
);

-- 3. STUDENTS TABLE (Fixed Classroom Positions)
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    roll_number TEXT NOT NULL,
    branch TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female')),
    row_number INTEGER NOT NULL CHECK (row_number > 0),
    column_number INTEGER NOT NULL CHECK (column_number > 0),
    position_number INTEGER NOT NULL CHECK (position_number > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce unique roll number within a classroom
    CONSTRAINT unique_roll_per_classroom UNIQUE (classroom_id, roll_number),
    -- Enforce fixed position uniqueness (cannot have two students in same seat)
    CONSTRAINT unique_position_per_classroom UNIQUE (classroom_id, row_number, column_number)
);

-- 4. ATTENDANCE SESSIONS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
    faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIME NOT NULL DEFAULT CURRENT_TIME,
    end_time TIME,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. ATTENDANCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('Present', 'Absent')),
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Enforce one attendance record per student per session
    CONSTRAINT unique_student_per_session UNIQUE (session_id, student_id)
);

-- 6. ACTIVITY LOGS TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ====================================================================
-- SAFE TABLE UPGRADES (In case tables already existed with fewer columns)
-- ====================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'faculty';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active';

ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS class_name TEXT;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS rows INTEGER;
ALTER TABLE public.classrooms ADD COLUMN IF NOT EXISTS columns INTEGER;

ALTER TABLE public.students ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS roll_number TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Male';
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS row_number INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS column_number INTEGER;
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS position_number INTEGER;

ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS classroom_id UUID REFERENCES public.classrooms(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS faculty_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS attendance_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS start_time TIME DEFAULT CURRENT_TIME;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.attendance_sessions ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS marked_at TIMESTAMPTZ DEFAULT NOW();

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_roll_per_classroom') THEN
        ALTER TABLE public.students ADD CONSTRAINT unique_roll_per_classroom UNIQUE (classroom_id, roll_number);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_position_per_classroom') THEN
        ALTER TABLE public.students ADD CONSTRAINT unique_position_per_classroom UNIQUE (classroom_id, row_number, column_number);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_student_per_session') THEN
        ALTER TABLE public.attendance_records ADD CONSTRAINT unique_student_per_session UNIQUE (session_id, student_id);
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ====================================================================
-- PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_classrooms_faculty_id ON public.classrooms(faculty_id);
CREATE INDEX IF NOT EXISTS idx_students_classroom_id ON public.students(classroom_id);
CREATE INDEX IF NOT EXISTS idx_students_position ON public.students(classroom_id, row_number, column_number);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_classroom ON public.attendance_sessions(classroom_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_faculty ON public.attendance_sessions(faculty_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON public.attendance_sessions(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);

-- ====================================================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER FUNCTION
-- ====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_classrooms_updated_at
BEFORE UPDATE ON public.classrooms
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- AUTH NEW USER PROFILE TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role, account_status)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'role', 'faculty'),
        'active'
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles Policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id OR public.is_admin());

-- Classrooms Policies
CREATE POLICY "Faculty can view own classrooms, Admins see all"
    ON public.classrooms FOR SELECT
    USING (auth.uid() = faculty_id OR public.is_admin());

CREATE POLICY "Faculty can create classrooms"
    ON public.classrooms FOR INSERT
    WITH CHECK (auth.uid() = faculty_id OR public.is_admin());

CREATE POLICY "Faculty can update own classrooms"
    ON public.classrooms FOR UPDATE
    USING (auth.uid() = faculty_id OR public.is_admin());

CREATE POLICY "Faculty can delete own classrooms"
    ON public.classrooms FOR DELETE
    USING (auth.uid() = faculty_id OR public.is_admin());

-- Seats Policies
CREATE POLICY "Users can view seats in their classrooms"
    ON public.seats FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = seats.classroom_id
            AND (c.faculty_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Faculty can manage seats in their classrooms"
    ON public.seats FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = seats.classroom_id
            AND (c.faculty_id = auth.uid() OR public.is_admin())
        )
    );

-- Students Policies
CREATE POLICY "Users can view students in their classrooms"
    ON public.students FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = students.classroom_id
            AND (c.faculty_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Faculty can manage students in their classrooms"
    ON public.students FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.classrooms c
            WHERE c.id = students.classroom_id
            AND (c.faculty_id = auth.uid() OR public.is_admin())
        )
    );

-- Attendance Sessions Policies
CREATE POLICY "Faculty can view own attendance sessions"
    ON public.attendance_sessions FOR SELECT
    USING (auth.uid() = faculty_id OR public.is_admin());

CREATE POLICY "Faculty can insert own attendance sessions"
    ON public.attendance_sessions FOR INSERT
    WITH CHECK (auth.uid() = faculty_id OR public.is_admin());

CREATE POLICY "Faculty can update own attendance sessions"
    ON public.attendance_sessions FOR UPDATE
    USING (auth.uid() = faculty_id OR public.is_admin());

CREATE POLICY "Faculty can delete own attendance sessions"
    ON public.attendance_sessions FOR DELETE
    USING (auth.uid() = faculty_id OR public.is_admin());

-- Attendance Records Policies
CREATE POLICY "Users can view records in their sessions"
    ON public.attendance_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            WHERE s.id = attendance_records.session_id
            AND (s.faculty_id = auth.uid() OR public.is_admin())
        )
    );

CREATE POLICY "Faculty can manage records in their sessions"
    ON public.attendance_records FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions s
            WHERE s.id = attendance_records.session_id
            AND (s.faculty_id = auth.uid() OR public.is_admin())
        )
    );

-- Activity Logs Policies
CREATE POLICY "Admins can view all activity logs"
    ON public.activity_logs FOR SELECT
    USING (public.is_admin());

CREATE POLICY "Authenticated users can create activity logs"
    ON public.activity_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
