import { createClient } from '@/lib/firebase/db'
import { TabUpdate, UserRole } from '@/types'

const TAB_LABELS: Record<string, string> = {
  documents: '필수서류',
  gpa: 'GPA',
  exams: '공인시험',
  ec: 'EC활동',
  portfolio: '포트폴리오',
  essays: '에세이',
  assignments: '과제관리',
  schedules: '월별일정',
  basic: '기본정보',
}

export async function recordTabUpdate(
  studentId: string,
  tabName: string,
  userId: string,
  userName: string,
  userRole: UserRole,
) {
  const db = createClient()
  const now = new Date().toISOString()

  // Upsert tab update record (one per student+tab)
  // First try to find existing
  const { data: existing } = await db
    .from('tab_updates')
    .select('*')
    .eq('student_id', studentId)
    .eq('tab_name', tabName)
    .single()

  if (existing) {
    await db.from('tab_updates').update({
      updated_by: userId,
      updater_name: userName,
      updater_role: userRole,
      updated_at: now,
    }).eq('id', existing.id)
  } else {
    await db.from('tab_updates').insert({
      student_id: studentId,
      tab_name: tabName,
      updated_by: userId,
      updater_name: userName,
      updater_role: userRole,
      updated_at: now,
    })
  }

  // If updater is a student, notify the main consultant
  if (userRole === 'student') {
    const { data: student } = await db
      .from('students')
      .select('main_consultant_id, name')
      .eq('id', studentId)
      .single()

    if (student?.main_consultant_id) {
      await db.from('notifications').insert({
        recipient_id: student.main_consultant_id,
        student_id: studentId,
        student_name: student.name,
        tab_name: TAB_LABELS[tabName] || tabName,
        updater_name: userName,
        read: false,
      })
    }
  }
}

export async function getTabUpdate(
  studentId: string,
  tabName: string,
): Promise<TabUpdate | null> {
  const db = createClient()
  const { data } = await db
    .from('tab_updates')
    .select('*')
    .eq('student_id', studentId)
    .eq('tab_name', tabName)
    .single()
  return data || null
}
