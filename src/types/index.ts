export type UserRole = 'admin' | 'consultant' | 'parent' | 'student'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  phone: string | null
  fcm_token?: string
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  name: string
  birth_date: string | null
  nationality: string | null
  school: string | null
  grade: string | null
  target_countries: string[] | null
  target_majors: string[] | null
  main_consultant_id: string | null
  consultant_ids: string[] | null
  parent_id: string | null
  user_id: string | null
  notes: string | null
  status: 'active' | 'inactive' | 'graduated'
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  student_id: string
  name: string
  type: string | null
  url: string | null
  notes: string | null
  uploaded_at: string
}

export interface GpaRecord {
  id: string
  student_id: string
  semester: string
  year: number
  gpa: number | null
  scale: number
  school: string | null
  notes: string | null
  created_at: string
}

export interface Exam {
  id: string
  student_id: string
  exam_type: string
  exam_date: string | null
  score: string | null
  subscores: Record<string, string | number> | null
  notes: string | null
  created_at: string
}

export interface EcActivity {
  id: string
  student_id: string
  activity_name: string
  category: string | null
  position: string | null
  organization: string | null
  start_date: string | null
  end_date: string | null
  hours_per_week: number | null
  description: string | null
  achievements: string | null
  created_at: string
}

export interface PortfolioItem {
  id: string
  student_id: string
  title: string
  category: string | null
  description: string | null
  url: string | null
  file_url: string | null
  date: string | null
  created_at: string
}

export interface Essay {
  id: string
  student_id: string
  title: string
  prompt: string | null
  content: string | null
  word_count: number | null
  status: 'draft' | 'review' | 'final'
  version: number
  feedback: string | null
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  student_id: string
  title: string
  description: string | null
  event_date: string
  event_time: string | null
  type: string | null
  zoom_link: string | null
  status: 'upcoming' | 'completed' | 'cancelled'
  file_url?: string
  file_name?: string
  created_at: string
}

export interface ConsultNote {
  id: string
  student_id: string
  author_id: string
  author_name: string
  note_date: string
  content: string
  created_at: string
  updated_at: string
}

export interface Assignment {
  id: string
  student_id: string
  title: string
  category: 'GPA' | 'EC활동' | '공인시험' | '에세이' | '필수서류' | '기타'
  status: 'todo' | 'in_progress' | 'done'
  description: string | null
  assigned_date: string
  due_date: string
  file_url?: string
  file_name?: string
  created_at: string
  updated_at: string
}

export interface TabUpdate {
  id: string
  student_id: string
  tab_name: string
  updated_by: string
  updater_name: string
  updater_role: UserRole
  updated_at: string
}

export interface Notification {
  id: string
  recipient_id: string
  student_id: string
  student_name: string
  tab_name: string
  updater_name: string
  read: boolean
  created_at: string
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  reply_to_id: string | null
  created_at: string
}

export interface Contract {
  id: string
  student_id: string
  file_url: string
  file_name: string
  uploaded_by: string
  uploader_name: string
  created_at: string
}

export interface DashboardStats {
  totalStudents: number
  activeStudents: number
  upcomingSchedules: number
  totalConsultants: number
  totalParents: number
  recentStudents: Student[]
}
