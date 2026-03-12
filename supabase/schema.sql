-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'consultant', 'parent')),
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- students
CREATE TABLE students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  birth_date DATE,
  school TEXT,
  grade TEXT,
  target_countries TEXT[],
  target_majors TEXT[],
  consultant_id UUID REFERENCES profiles(id),
  parent_id UUID REFERENCES profiles(id),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'graduated')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- documents
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  url TEXT,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- gpa_records
CREATE TABLE gpa_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  semester TEXT NOT NULL,
  year INTEGER NOT NULL,
  gpa DECIMAL(4,2),
  scale DECIMAL(3,1) DEFAULT 4.0,
  school TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- exams
CREATE TABLE exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL,
  exam_date DATE,
  score TEXT,
  subscores JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ec_activities
CREATE TABLE ec_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  activity_name TEXT NOT NULL,
  category TEXT,
  position TEXT,
  organization TEXT,
  start_date DATE,
  end_date DATE,
  hours_per_week INTEGER,
  description TEXT,
  achievements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- portfolio
CREATE TABLE portfolio (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  url TEXT,
  file_url TEXT,
  date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- essays
CREATE TABLE essays (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT,
  content TEXT,
  word_count INTEGER,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final')),
  version INTEGER DEFAULT 1,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- schedules
CREATE TABLE schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TIME,
  type TEXT,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpa_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE ec_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE essays ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- profiles policies
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Admin can read all profiles" ON profiles FOR SELECT USING (get_user_role() = 'admin');
CREATE POLICY "Admin can insert profiles" ON profiles FOR INSERT WITH CHECK (get_user_role() = 'admin');
CREATE POLICY "Admin can update profiles" ON profiles FOR UPDATE USING (get_user_role() = 'admin');
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- students policies
CREATE POLICY "Admin can do all on students" ON students FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Consultant can view assigned students" ON students FOR SELECT USING (
  get_user_role() = 'consultant' AND consultant_id = auth.uid()
);
CREATE POLICY "Consultant can update assigned students" ON students FOR UPDATE USING (
  get_user_role() = 'consultant' AND consultant_id = auth.uid()
);
CREATE POLICY "Parent can view own child" ON students FOR SELECT USING (
  get_user_role() = 'parent' AND parent_id = auth.uid()
);

-- Helper: check if user can access student
CREATE OR REPLACE FUNCTION can_access_student(p_student_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM students s
    WHERE s.id = p_student_id AND (
      get_user_role() = 'admin' OR
      (get_user_role() = 'consultant' AND s.consultant_id = auth.uid()) OR
      (get_user_role() = 'parent' AND s.parent_id = auth.uid())
    )
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Apply access policy to all student-related tables
CREATE POLICY "Access based on student access" ON documents FOR ALL USING (can_access_student(student_id));
CREATE POLICY "Access based on student access" ON gpa_records FOR ALL USING (can_access_student(student_id));
CREATE POLICY "Access based on student access" ON exams FOR ALL USING (can_access_student(student_id));
CREATE POLICY "Access based on student access" ON ec_activities FOR ALL USING (can_access_student(student_id));
CREATE POLICY "Access based on student access" ON portfolio FOR ALL USING (can_access_student(student_id));
CREATE POLICY "Access based on student access" ON essays FOR ALL USING (can_access_student(student_id));
CREATE POLICY "Access based on student access" ON schedules FOR ALL USING (can_access_student(student_id));

-- Prevent parent from writing (only admin/consultant can write)
CREATE POLICY "Parent read only on documents" ON documents FOR INSERT WITH CHECK (get_user_role() != 'parent');
CREATE POLICY "Parent read only on gpa" ON gpa_records FOR INSERT WITH CHECK (get_user_role() != 'parent');
CREATE POLICY "Parent read only on exams" ON exams FOR INSERT WITH CHECK (get_user_role() != 'parent');
CREATE POLICY "Parent read only on ec" ON ec_activities FOR INSERT WITH CHECK (get_user_role() != 'parent');
CREATE POLICY "Parent read only on portfolio" ON portfolio FOR INSERT WITH CHECK (get_user_role() != 'parent');
CREATE POLICY "Parent read only on essays" ON essays FOR INSERT WITH CHECK (get_user_role() != 'parent');
CREATE POLICY "Parent read only on schedules" ON schedules FOR INSERT WITH CHECK (get_user_role() != 'parent');

-- Profile rows are created by app code (create-user API + login fallback).
-- No triggers on auth.users — Supabase manages that schema internally.

-- Allow users to insert their own profile row (for auto-creation on first login)
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
