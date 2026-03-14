'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, Student, Schedule, Assignment } from '@/types'
import {
  Users,
  Calendar,
  TrendingUp,
  UserCheck,
  Clock,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  ClipboardList,
  AlertTriangle,
} from 'lucide-react'

interface Stats {
  totalStudents: number
  activeStudents: number
  upcomingSchedules: number
  totalConsultants: number
  totalParents: number
}

interface ConsultantOverview {
  id: string; name: string; email: string
  studentCount: number; weekClassCount: number
  students: { id: string; name: string; school: string | null; grade: string | null }[]
}

function getThisWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const day = now.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) }
}

const DAY_LABELS: Record<string, string> = {
  '0': '일요일',
  '1': '월요일',
  '2': '화요일',
  '3': '수요일',
  '4': '목요일',
  '5': '금요일',
  '6': '토요일',
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_LABELS[String(d.getDay())] || ''
}

function getDaysUntil(dueDateStr: string): number {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const due = new Date(dueDateStr + 'T00:00:00')
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentStudents, setRecentStudents] = useState<Student[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<(Schedule & { student_name?: string })[]>([])
  const [weeklyClasses, setWeeklyClasses] = useState<(Schedule & { student_name?: string })[]>([])
  const [consultantOverviews, setConsultantOverviews] = useState<ConsultantOverview[]>([])
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Student-specific state
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentAssignments, setStudentAssignments] = useState<Assignment[]>([])
  const [studentSchedules, setStudentSchedules] = useState<Schedule[]>([])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = getSessionFromCookies()
        if (!session) { router.push('/login'); return }

        const db = createClient()
        const { data: prof } = await db
          .from('profiles')
          .select('*')
          .eq('id', session.userId)
          .single()

        if (!prof) { router.push('/login'); return }
        setProfile(prof)

        if (prof.role === 'parent') {
          const { data: student } = await db
            .from('students')
            .select('id')
            .eq('parent_id', session.userId)
            .single()
          if (student) router.push(`/students/${student.id}`)
          return
        }

        // Student role: fetch student-specific data and return early
        if (prof.role === 'student') {
          // Find student record by user_id first, fallback to name match
          let foundStudentId: string | null = null

          const { data: studentsByUserId } = await db
            .from('students')
            .select('id, name')
            .eq('user_id', session.userId)

          if (studentsByUserId && studentsByUserId.length > 0) {
            foundStudentId = studentsByUserId[0].id
          } else {
            // Fallback: match profile full_name to student name
            if (prof.full_name) {
              const { data: matched } = await db
                .from('students')
                .select('id, name')
                .eq('name', prof.full_name)
              if (matched && matched.length > 0) {
                foundStudentId = matched[0].id
              }
            }
          }

          setStudentId(foundStudentId)

          if (foundStudentId) {
            // Fetch incomplete assignments sorted by due_date
            const { data: allAssignments } = await db
              .from('assignments')
              .select('*')
              .eq('student_id', foundStudentId)
              .order('due_date', { ascending: true })

            setStudentAssignments((allAssignments || []).filter((a: any) => a.status !== 'done'))

            // Fetch this week's schedules
            const { weekStart, weekEnd } = getThisWeekRange()
            const { data: allSchedules } = await db
              .from('schedules')
              .select('*')
              .eq('student_id', foundStudentId)
              .gte('event_date', weekStart)
              .order('event_date', { ascending: true })

            setStudentSchedules(
              (allSchedules || []).filter((s: any) => s.event_date <= weekEnd && s.status !== 'cancelled')
            )
          }

          setLoading(false)
          return
        }

        let studentsQuery = db
          .from('students')
          .select('id, name, school, grade, status, created_at', { count: 'exact' })
        // Consultant filtering is done client-side after fetch

        const { data: allStudents } = await studentsQuery
          .order('created_at', { ascending: false })

        // Consultant: filter to their students
        let students = allStudents || []
        if (prof.role === 'consultant') {
          students = students.filter((s: any) =>
            s.main_consultant_id === session.userId || (s.consultant_ids && s.consultant_ids.includes(session.userId))
          )
        }

        const studentCount = students.length
        const activeCount = students.filter((s: any) => s.status === 'active').length
        setRecentStudents(students.slice(0, 5) as Student[])

        const today = new Date().toISOString().split('T')[0]
        const { data: schedules } = await db
          .from('schedules')
          .select('*, students(name)')
          .gte('event_date', today)
          .eq('status', 'upcoming')
          .order('event_date', { ascending: true })
          .limit(5)

        const formattedSchedules = (schedules || []).map((s: any) => ({
          ...s,
          student_name: s.students?.name,
        }))
        setUpcomingEvents(formattedSchedules)

        let consultantCount = 0
        let parentCount = 0
        if (prof.role === 'admin') {
          const { count: cc } = await db
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role', 'consultant')
          const { count: pc } = await db
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role', 'parent')
          consultantCount = cc || 0
          parentCount = pc || 0
        }

        setStats({
          totalStudents: studentCount || 0,
          activeStudents: activeCount,
          upcomingSchedules: formattedSchedules.length,
          totalConsultants: consultantCount,
          totalParents: parentCount,
        })

        // Consultant: fetch this week's classes for their students
        if (prof.role === 'consultant') {
          const { weekStart, weekEnd } = getThisWeekRange()
          const classes: (Schedule & { student_name?: string })[] = []
          const studentNameMap: Record<string, string> = {}
          for (const s of students) studentNameMap[(s as any).id] = (s as any).name
          for (const s of students) {
            const { data: scheds } = await db.from('schedules').select('*')
              .eq('student_id', (s as any).id).gte('event_date', weekStart)
              .order('event_date', { ascending: true })
            if (scheds) {
              for (const sc of scheds) {
                if (sc.event_date <= weekEnd && sc.status !== 'cancelled') {
                  classes.push({ ...sc, student_name: studentNameMap[(s as any).id] || '' })
                }
              }
            }
          }
          classes.sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.event_time || '').localeCompare(b.event_time || ''))
          setWeeklyClasses(classes)
        }

        // Admin: fetch consultant overviews
        if (prof.role === 'admin') {
          const { weekStart, weekEnd } = getThisWeekRange()
          const { data: consultants } = await db.from('profiles').select('*').eq('role', 'consultant')
          const overviews: ConsultantOverview[] = []
          for (const c of (consultants || [])) {
            const cStudents = (allStudents || []).filter((s: any) =>
              s.main_consultant_id === c.id || (s.consultant_ids && s.consultant_ids.includes(c.id))
            )
            let weekClassCount = 0
            for (const s of cStudents) {
              const { data: scheds } = await db.from('schedules').select('*')
                .eq('student_id', (s as any).id).gte('event_date', weekStart)
              if (scheds) {
                weekClassCount += scheds.filter((sc: any) => sc.event_date <= weekEnd && sc.status !== 'cancelled').length
              }
            }
            overviews.push({
              id: c.id,
              name: c.full_name || c.email?.split('@')[0] || '',
              email: c.email || '',
              studentCount: cStudents.length,
              weekClassCount,
              students: cStudents.map((s: any) => ({ id: s.id, name: s.name, school: s.school, grade: s.grade })),
            })
          }
          setConsultantOverviews(overviews)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  // Student dashboard view
  if (profile?.role === 'student') {
    // Group schedules by date
    const schedulesByDate: Record<string, Schedule[]> = {}
    for (const s of studentSchedules) {
      if (!schedulesByDate[s.event_date]) schedulesByDate[s.event_date] = []
      schedulesByDate[s.event_date].push(s)
    }
    const sortedDates = Object.keys(schedulesByDate).sort()

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            안녕하세요, {profile?.full_name || profile?.email?.split('@')[0]}님!
          </h1>
          <p className="text-gray-400 mt-1">나의 학습 현황</p>
          {studentId && (
            <Link
              href={`/students/${studentId}`}
              className="inline-flex items-center gap-1 mt-3 text-sm text-blue-400 hover:text-blue-300 transition"
            >
              내 포트폴리오 보기 <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Assignments section */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
              <ClipboardList className="w-5 h-5 text-orange-400" />
              <h2 className="font-semibold text-white">마감 임박 과제</h2>
            </div>
            <div className="divide-y divide-gray-700">
              {studentAssignments.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-500">미완료 과제가 없습니다</div>
              ) : (
                studentAssignments.map((assignment) => {
                  const daysLeft = getDaysUntil(assignment.due_date)
                  let urgencyColor = 'text-gray-400'
                  let urgencyBg = 'bg-gray-700'
                  let urgencyLabel = `${daysLeft}일 남음`
                  if (daysLeft < 0) {
                    urgencyColor = 'text-red-400'
                    urgencyBg = 'bg-red-900/40'
                    urgencyLabel = `${Math.abs(daysLeft)}일 지남`
                  } else if (daysLeft <= 7) {
                    urgencyColor = 'text-red-400'
                    urgencyBg = 'bg-red-900/40'
                  } else if (daysLeft <= 14) {
                    urgencyColor = 'text-yellow-400'
                    urgencyBg = 'bg-yellow-900/40'
                  }

                  const statusLabel = assignment.status === 'in_progress' ? '진행중' : '미시작'
                  const statusColor = assignment.status === 'in_progress'
                    ? 'bg-blue-900/40 text-blue-400'
                    : 'bg-gray-700 text-gray-400'

                  return (
                    <div key={assignment.id} className="px-5 py-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            {daysLeft <= 7 && (
                              <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${urgencyColor}`} />
                            )}
                            <span className="text-sm font-medium text-white truncate">{assignment.title}</span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {assignment.category} · 마감: {assignment.due_date}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full ${statusColor}`}>
                            {statusLabel}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${urgencyBg} ${urgencyColor}`}>
                            {urgencyLabel}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Schedules section */}
          <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
              <Calendar className="w-5 h-5 text-cyan-400" />
              <h2 className="font-semibold text-white">이번 주 일정</h2>
            </div>
            <div className="divide-y divide-gray-700">
              {sortedDates.length === 0 ? (
                <div className="px-5 py-8 text-center text-gray-500">이번 주 예정된 일정이 없습니다</div>
              ) : (
                sortedDates.map((date) => (
                  <div key={date} className="px-5 py-3">
                    <div className="text-xs font-medium text-gray-400 mb-2">
                      {date} ({getDayLabel(date)})
                    </div>
                    <div className="space-y-2">
                      {schedulesByDate[date].map((sched) => (
                        <div key={sched.id} className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-white truncate">{sched.title}</div>
                            {sched.event_time && (
                              <div className="text-xs text-gray-400 mt-0.5">
                                {sched.event_time.slice(0, 5)}
                              </div>
                            )}
                          </div>
                          {sched.type && (
                            <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full flex-shrink-0">
                              {sched.type}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      label: '전체 학생',
      value: stats?.totalStudents || 0,
      icon: <Users className="w-6 h-6" />,
      lightColor: 'bg-blue-900/30',
      textColor: 'text-blue-400',
    },
    {
      label: '활성 학생',
      value: stats?.activeStudents || 0,
      icon: <UserCheck className="w-6 h-6" />,
      lightColor: 'bg-green-900/30',
      textColor: 'text-green-400',
    },
    {
      label: '예정 일정',
      value: stats?.upcomingSchedules || 0,
      icon: <Calendar className="w-6 h-6" />,
      lightColor: 'bg-orange-900/30',
      textColor: 'text-orange-400',
    },
    ...(profile?.role === 'admin' ? [
      {
        label: '컨설턴트',
        value: stats?.totalConsultants || 0,
        icon: <TrendingUp className="w-6 h-6" />,
        lightColor: 'bg-purple-900/30',
        textColor: 'text-purple-400',
      },
    ] : []),
  ]

  const statusLabels: Record<string, string> = {
    active: '활성',
    inactive: '비활성',
    graduated: '졸업',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-900/40 text-green-400',
    inactive: 'bg-gray-700 text-gray-400',
    graduated: 'bg-blue-900/40 text-blue-400',
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          안녕하세요, {profile?.full_name || profile?.email?.split('@')[0]}님!
        </h1>
        <p className="text-gray-400 mt-1">오늘도 학생들의 미래를 함께 만들어갑니다.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${card.lightColor}`}>
              <span className={card.textColor}>{card.icon}</span>
            </div>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            <div className="text-sm text-gray-400 mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-400" />
              <h2 className="font-semibold text-white">최근 학생</h2>
            </div>
            <Link href="/students" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
              전체보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="divide-y divide-gray-700">
            {recentStudents.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500">등록된 학생이 없습니다</div>
            ) : (
              recentStudents.map((student) => (
                <Link
                  key={student.id}
                  href={`/students/${student.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-700/50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
                      {student.name[0]}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">{student.name}</div>
                      <div className="text-xs text-gray-400">{student.school || '학교 미정'} · {student.grade || '-'}</div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[student.status]}`}>
                    {statusLabels[student.status]}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
            <Clock className="w-5 h-5 text-orange-400" />
            <h2 className="font-semibold text-white">예정된 일정</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {upcomingEvents.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500">예정된 일정이 없습니다</div>
            ) : (
              upcomingEvents.map((event) => (
                <div key={event.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{event.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {event.student_name} · {event.event_date}
                        {event.event_time && ` ${event.event_time.slice(0, 5)}`}
                      </div>
                    </div>
                    {event.type && (
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full flex-shrink-0">
                        {event.type}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Consultant: This week's classes */}
      {profile?.role === 'consultant' && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold text-white">이번 주 수업</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {weeklyClasses.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-500">이번 주 예정된 수업이 없습니다</div>
            ) : (
              weeklyClasses.map((cls) => (
                <div key={cls.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{cls.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {cls.student_name} · {cls.event_date}
                        {cls.event_time && ` ${cls.event_time.slice(0, 5)}`}
                      </div>
                    </div>
                    {cls.type && (
                      <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded-full flex-shrink-0">
                        {cls.type}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Admin: Consultant overview */}
      {profile?.role === 'admin' && consultantOverviews.length > 0 && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-700">
            <Users className="w-5 h-5 text-purple-400" />
            <h2 className="font-semibold text-white">컨설턴트별 현황</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {consultantOverviews.map((c) => (
              <div key={c.id}>
                <button
                  onClick={() => setExpandedConsultant(expandedConsultant === c.id ? null : c.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-700/50 transition text-left"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-900/40 flex items-center justify-center text-sm font-medium text-purple-300 flex-shrink-0">
                    {c.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.email}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-gray-400">학생 {c.studentCount}명</span>
                    <span className="text-xs text-cyan-400">수업 {c.weekClassCount}건</span>
                    <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedConsultant === c.id ? 'rotate-180' : ''}`} />
                  </div>
                </button>
                {expandedConsultant === c.id && (
                  <div className="px-5 pb-3">
                    {c.students.length === 0 ? (
                      <div className="text-xs text-gray-500 py-2 pl-12">담당 학생이 없습니다</div>
                    ) : (
                      <div className="space-y-1 pl-12">
                        {c.students.map((s) => (
                          <Link
                            key={s.id}
                            href={`/students/${s.id}`}
                            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-700/50 transition"
                          >
                            <span className="text-xs font-medium text-white">{s.name}</span>
                            <span className="text-[10px] text-gray-500">{s.school || '학교 미정'} · {s.grade || '-'}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
