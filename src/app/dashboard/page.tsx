'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, Student, Schedule } from '@/types'
import {
  Users,
  Calendar,
  TrendingUp,
  UserCheck,
  Clock,
  ChevronRight,
  GraduationCap,
} from 'lucide-react'

interface Stats {
  totalStudents: number
  activeStudents: number
  upcomingSchedules: number
  totalConsultants: number
  totalParents: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentStudents, setRecentStudents] = useState<Student[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<(Schedule & { student_name?: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = getSessionFromCookies()
        if (!session) { router.push('/login'); return }

        const supabase = createClient()
        const { data: prof } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.userId)
          .single()

        if (!prof) { router.push('/login'); return }
        setProfile(prof)

        if (prof.role === 'parent') {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('parent_id', session.userId)
            .single()
          if (student) router.push(`/students/${student.id}`)
          return
        }

        let studentsQuery = supabase
          .from('students')
          .select('id, name, school, grade, status, created_at', { count: 'exact' })
        if (prof.role === 'consultant') {
          studentsQuery = studentsQuery.eq('consultant_id', session.userId)
        }

        const { data: students, count: studentCount } = await studentsQuery
          .order('created_at', { ascending: false })
          .limit(5)

        const activeCount = students?.filter((s: any) => s.status === 'active').length || 0
        setRecentStudents((students || []) as Student[])

        const today = new Date().toISOString().split('T')[0]
        const { data: schedules } = await supabase
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
          const { count: cc } = await supabase
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role', 'consultant')
          const { count: pc } = await supabase
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
    </div>
  )
}
