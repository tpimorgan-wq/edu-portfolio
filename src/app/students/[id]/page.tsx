'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Student, Profile } from '@/types'
import BasicInfoTab from '@/components/tabs/BasicInfoTab'
import DocumentsTab from '@/components/tabs/DocumentsTab'
import GpaTab from '@/components/tabs/GpaTab'
import ExamsTab from '@/components/tabs/ExamsTab'
import EcActivitiesTab from '@/components/tabs/EcActivitiesTab'
import PortfolioTab from '@/components/tabs/PortfolioTab'
import EssaysTab from '@/components/tabs/EssaysTab'
import SchedulesTab from '@/components/tabs/SchedulesTab'
import ConsultNotesTab from '@/components/tabs/ConsultNotesTab'
import AssignmentsTab from '@/components/tabs/AssignmentsTab'
import { ArrowLeft } from 'lucide-react'

const BASE_TABS = [
  { id: 'basic', label: '기본정보' },
  { id: 'documents', label: '필수서류' },
  { id: 'gpa', label: 'GPA' },
  { id: 'exams', label: '공인시험' },
  { id: 'ec', label: 'EC활동' },
  { id: 'portfolio', label: '포트폴리오' },
  { id: 'essays', label: '에세이' },
  { id: 'assignments', label: '과제관리' },
  { id: 'schedules', label: '월별일정' },
  { id: 'consult_notes', label: '상담노트', roles: ['admin', 'consultant'] },
]

export default function StudentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const studentId = params.id as string

  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [consultants, setConsultants] = useState<Profile[]>([])
  const [parents, setParents] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('basic')

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

        setCurrentUser(prof)

        const { data: studentData } = await supabase
          .from('students')
          .select('*')
          .eq('id', studentId)
          .single()

        if (!studentData) {
          router.push('/students')
          return
        }

        setStudent(studentData)

        if (prof.role === 'admin') {
          // Admin: fetch all consultants/parents for editing
          const [{ data: cons }, { data: pars }] = await Promise.all([
            supabase.from('profiles').select('*').eq('role', 'consultant').order('full_name'),
            supabase.from('profiles').select('*').eq('role', 'parent').order('full_name'),
          ])
          setConsultants(cons || [])
          setParents(pars || [])
        } else {
          // Non-admin: fetch only the assigned consultant/parent for display
          const fetches: Promise<any>[] = []
          if (studentData.consultant_id) {
            fetches.push(
              supabase.from('profiles').select('*').eq('id', studentData.consultant_id).single()
                .then(({ data }: any) => data ? setConsultants([data]) : null)
            )
          }
          if (studentData.parent_id) {
            fetches.push(
              supabase.from('profiles').select('*').eq('id', studentData.parent_id).single()
                .then(({ data }: any) => data ? setParents([data]) : null)
            )
          }
          await Promise.all(fetches)
        }
      } catch (err) {
        console.error('Failed to fetch student data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [router, studentId])

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

  if (!student) return null

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Back button */}
      {currentUser?.role !== 'parent' && currentUser?.role !== 'student' && (
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="text-gray-400 text-sm">학생 목록으로</span>
        </div>
      )}

      {/* Student Header Card */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 p-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-700 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-200">{student.name[0]}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-white">{student.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full ${statusColors[student.status]}`}>
                {statusLabels[student.status]}
              </span>
            </div>
            <div className="text-sm text-gray-400 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
              {student.school && <span>{student.school}</span>}
              {student.grade && <span>{student.grade}</span>}
              {student.target_countries && student.target_countries.length > 0 && (
                <span>{student.target_countries.join(' · ')}</span>
              )}
            </div>
          </div>
          {/* No role gets full read-only anymore; permissions handled per-tab */}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        {/* Tab Header */}
        <div className="border-b border-gray-700 overflow-x-auto">
          <div className="flex min-w-max">
            {BASE_TABS.filter(tab => !tab.roles || (currentUser && tab.roles.includes(currentUser.role))).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-blue-900/10'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-700/30'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-5">
          {activeTab === 'basic' && currentUser && (
            <BasicInfoTab
              student={student}
              userRole={currentUser.role}
              consultants={consultants}
              parents={parents}
              onUpdate={setStudent}
              userId={currentUser.id}
              userName={currentUser.full_name || currentUser.email}
            />
          )}
          {activeTab === 'documents' && currentUser && (
            <DocumentsTab studentId={studentId} userRole={currentUser.role} userId={currentUser.id} userName={currentUser.full_name || currentUser.email} />
          )}
          {activeTab === 'gpa' && currentUser && (
            <GpaTab studentId={studentId} userRole={currentUser.role} userId={currentUser.id} userName={currentUser.full_name || currentUser.email} />
          )}
          {activeTab === 'exams' && currentUser && (
            <ExamsTab studentId={studentId} userRole={currentUser.role} userId={currentUser.id} userName={currentUser.full_name || currentUser.email} />
          )}
          {activeTab === 'ec' && currentUser && (
            <EcActivitiesTab studentId={studentId} userRole={currentUser.role} userId={currentUser.id} userName={currentUser.full_name || currentUser.email} />
          )}
          {activeTab === 'portfolio' && currentUser && (
            <PortfolioTab studentId={studentId} userRole={currentUser.role} userId={currentUser.id} userName={currentUser.full_name || currentUser.email} />
          )}
          {activeTab === 'essays' && currentUser && (
            <EssaysTab studentId={studentId} userRole={currentUser.role} userId={currentUser.id} userName={currentUser.full_name || currentUser.email} />
          )}
          {activeTab === 'assignments' && currentUser && (
            <AssignmentsTab studentId={studentId} userRole={currentUser.role} userId={currentUser.id} userName={currentUser.full_name || currentUser.email} />
          )}
          {activeTab === 'schedules' && currentUser && (
            <SchedulesTab studentId={studentId} userRole={currentUser.role} />
          )}
          {activeTab === 'consult_notes' && currentUser && (currentUser.role === 'admin' || currentUser.role === 'consultant') && (
            <ConsultNotesTab
              studentId={studentId}
              currentUserId={currentUser.id}
              currentUserName={currentUser.full_name || currentUser.email}
            />
          )}
        </div>
      </div>
    </div>
  )
}
