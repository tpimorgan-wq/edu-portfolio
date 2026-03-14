'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, Student } from '@/types'
import StudentForm from '@/components/students/StudentForm'
import { ArrowLeft } from 'lucide-react'

export default function NewStudentPage() {
  const router = useRouter()
  const [consultants, setConsultants] = useState<Profile[]>([])
  const [parents, setParents] = useState<Profile[]>([])
  const [studentAccounts, setStudentAccounts] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const init = async () => {
      const session = getSessionFromCookies()
      if (!session) { router.push('/login'); return }

      const db = createClient()
      const { data: prof } = await db
        .from('profiles')
        .select('role')
        .eq('id', session.userId)
        .single()

      if (!prof || prof.role !== 'admin') {
        router.push('/students')
        return
      }

      setAuthorized(true)

      const [{ data: cons }, { data: pars }, { data: stuAccounts }] = await Promise.all([
        db.from('profiles').select('*').eq('role', 'consultant').order('full_name'),
        db.from('profiles').select('*').eq('role', 'parent').order('full_name'),
        db.from('profiles').select('*').eq('role', 'student').order('full_name'),
      ])

      setConsultants(cons || [])
      setParents(pars || [])
      setStudentAccounts(stuAccounts || [])
      setLoading(false)
    }
    init()
  }, [router])

  const handleSuccess = (student: Student) => {
    router.push(`/students/${student.id}`)
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

  if (!authorized) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/students"
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">새 학생 추가</h1>
          <p className="text-gray-400 text-sm">학생 정보를 입력하세요</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
        <StudentForm
          consultants={consultants}
          parents={parents}
          studentAccounts={studentAccounts}
          onSuccess={handleSuccess}
          onCancel={() => router.push('/students')}
        />
      </div>
    </div>
  )
}
