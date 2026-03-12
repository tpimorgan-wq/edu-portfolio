'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, Student } from '@/types'
import { Plus, Search, GraduationCap, ChevronRight, Filter } from 'lucide-react'

export default function StudentsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [filtered, setFiltered] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

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

        if (prof.role === 'parent') {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('parent_id', session.userId)
            .single()
          if (student) router.push(`/students/${student.id}`)
          return
        }

        setProfile(prof)

        let query = supabase
          .from('students')
          .select('*, consultant:consultant_id(full_name, email), parent:parent_id(full_name, email)')
          .order('created_at', { ascending: false })

        if (prof.role === 'consultant') {
          query = query.eq('consultant_id', session.userId)
        }

        const { data } = await query
        setStudents((data || []) as Student[])
        setFiltered((data || []) as Student[])
      } catch (err) {
        console.error('Failed to fetch students:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router])

  useEffect(() => {
    let result = students
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(st =>
        st.name.toLowerCase().includes(s) ||
        (st.school || '').toLowerCase().includes(s) ||
        (st.grade || '').toLowerCase().includes(s)
      )
    }
    if (statusFilter !== 'all') {
      result = result.filter(st => st.status === statusFilter)
    }
    setFiltered(result)
  }, [search, statusFilter, students])

  const statusLabels: Record<string, string> = {
    active: '활성',
    inactive: '비활성',
    graduated: '졸업',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-green-900/40 text-green-400 border border-green-800',
    inactive: 'bg-gray-700 text-gray-400 border border-gray-600',
    graduated: 'bg-blue-900/40 text-blue-400 border border-blue-800',
  }

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

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">학생 목록</h1>
          <p className="text-gray-400 text-sm mt-1">총 {filtered.length}명의 학생</p>
        </div>
        {profile?.role === 'admin' && (
          <Link
            href="/students/new"
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">학생 추가</span>
          </Link>
        )}
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 학교, 학년 검색..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">전체 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="graduated">졸업</option>
          </select>
        </div>
      </div>

      {/* Student Grid */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-16 text-center">
          <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">학생이 없습니다</p>
          <p className="text-gray-600 text-sm mt-1">
            {search || statusFilter !== 'all' ? '검색 조건을 변경해보세요' : '새 학생을 추가해보세요'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((student) => (
            <Link
              key={student.id}
              href={`/students/${student.id}`}
              className="bg-gray-800 rounded-2xl border border-gray-700 p-5 hover:border-blue-600 hover:bg-gray-750 transition-all duration-150 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gray-700 flex items-center justify-center text-lg font-bold text-gray-200">
                    {student.name[0]}
                  </div>
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-400 transition">{student.name}</div>
                    <div className="text-xs text-gray-400">{student.school || '학교 미정'}</div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[student.status]}`}>
                  {statusLabels[student.status]}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>학년</span>
                  <span className="text-gray-300">{student.grade || '-'}</span>
                </div>
                {student.target_countries && student.target_countries.length > 0 && (
                  <div className="flex justify-between">
                    <span>목표 국가</span>
                    <span className="text-gray-300 truncate max-w-32 text-right">
                      {student.target_countries.join(', ')}
                    </span>
                  </div>
                )}
                {(student.consultant as any)?.full_name && (
                  <div className="flex justify-between">
                    <span>담당 컨설턴트</span>
                    <span className="text-gray-300">{(student.consultant as any).full_name}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-end text-blue-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition">
                자세히 보기 <ChevronRight className="w-3 h-3 ml-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
