'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, Student } from '@/types'
import { Plus, Search, GraduationCap, Filter } from 'lucide-react'

export default function StudentsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [filtered, setFiltered] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [consultantNames, setConsultantNames] = useState<Record<string, string>>({})

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

        if (prof.role === 'parent') {
          const { data: student } = await db
            .from('students')
            .select('id')
            .eq('parent_id', session.userId)
            .single()
          if (student) router.push(`/students/${student.id}`)
          return
        }

        setProfile(prof)

        let query = db
          .from('students')
          .select('*')
          .order('created_at', { ascending: false })

        const { data } = await query
        let studentList = (data || []) as Student[]

        if (prof.role === 'consultant') {
          studentList = studentList.filter(s =>
            s.main_consultant_id === session.userId || (s.consultant_ids && s.consultant_ids.includes(session.userId))
          )
        }

        setStudents(studentList)
        setFiltered(studentList)

        const { data: allConsultants } = await db.from('profiles').select('id, full_name, email').eq('role', 'consultant')
        const nameMap: Record<string, string> = {}
        for (const c of (allConsultants || [])) nameMap[c.id] = (c as any).full_name || (c as any).email
        setConsultantNames(nameMap)
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

      {/* Student Table */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-16 text-center">
          <GraduationCap className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">학생이 없습니다</p>
          <p className="text-gray-600 text-sm mt-1">
            {search || statusFilter !== 'all' ? '검색 조건을 변경해보세요' : '새 학생을 추가해보세요'}
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 font-medium">이름</th>
                  <th className="text-left px-5 py-3 font-medium">학교</th>
                  <th className="text-left px-5 py-3 font-medium">학년</th>
                  <th className="text-left px-5 py-3 font-medium">지원국가</th>
                  <th className="text-left px-5 py-3 font-medium">메인담당자</th>
                  <th className="text-left px-5 py-3 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {filtered.map(student => (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/students/${student.id}`)}
                    className="hover:bg-gray-700/40 cursor-pointer transition"
                  >
                    {/* 이름 */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-200 flex-shrink-0">
                          {student.name[0]}
                        </div>
                        <div>
                          <span className="text-sm font-medium text-white">{student.name}</span>
                          {student.nationality && (
                            <span className="ml-1.5 text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                              {student.nationality}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* 학교 */}
                    <td className="px-5 py-3.5 text-sm text-gray-300 max-w-[200px] truncate">
                      {student.school || '-'}
                    </td>
                    {/* 학년 */}
                    <td className="px-5 py-3.5 text-sm text-gray-300">
                      {student.grade || '-'}
                    </td>
                    {/* 지원국가 */}
                    <td className="px-5 py-3.5 text-sm text-gray-300">
                      {student.target_countries?.join(', ') || '-'}
                    </td>
                    {/* 메인담당자 */}
                    <td className="px-5 py-3.5 text-sm text-gray-300">
                      {student.main_consultant_id && consultantNames[student.main_consultant_id]
                        ? consultantNames[student.main_consultant_id]
                        : '-'}
                    </td>
                    {/* 상태 */}
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[student.status]}`}>
                        {statusLabels[student.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
