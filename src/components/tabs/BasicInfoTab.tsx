'use client'

import { useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Student, Profile, UserRole } from '@/types'
import { Edit2, Save, X, User, School, Globe, BookOpen } from 'lucide-react'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'

interface BasicInfoTabProps {
  student: Student
  userRole: UserRole
  consultants: Profile[]
  parents: Profile[]
  onUpdate: (updated: Student) => void
  userId: string
  userName: string
}

export default function BasicInfoTab({
  student,
  userRole,
  consultants,
  parents,
  onUpdate,
  userId,
  userName,
}: BasicInfoTabProps) {
  const canEdit = true
  const canEditAssignments = userRole === 'admin' || userRole === 'consultant'
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    name: student.name,
    birth_date: student.birth_date || '',
    school: student.school || '',
    grade: student.grade || '',
    target_countries: student.target_countries?.join(', ') || '',
    target_majors: student.target_majors?.join(', ') || '',
    consultant_id: student.consultant_id || '',
    parent_id: student.parent_id || '',
    notes: student.notes || '',
    status: student.status,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    const supabase = createClient()

    const { data, error: err } = await supabase
      .from('students')
      .update({
        name: form.name,
        birth_date: form.birth_date || null,
        school: form.school || null,
        grade: form.grade || null,
        target_countries: form.target_countries
          ? form.target_countries.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        target_majors: form.target_majors
          ? form.target_majors.split(',').map(s => s.trim()).filter(Boolean)
          : null,
        consultant_id: form.consultant_id || null,
        parent_id: form.parent_id || null,
        notes: form.notes || null,
        status: form.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', student.id)
      .select()
      .single()

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    onUpdate(data)
    setEditing(false)
    setLoading(false)
    recordTabUpdate(student.id, 'basic', userId, userName, userRole)
  }

  const gradeOptions = [
    '중1', '중2', '중3', '고1', '고2', '고3',
    '대학교 1학년', '대학교 2학년', '대학교 3학년', '대학교 4학년', '졸업생',
  ]

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div className="flex items-start gap-4 py-3 border-b border-gray-700 last:border-0">
      <span className="text-gray-400 text-sm w-32 flex-shrink-0">{label}</span>
      <span className="text-white text-sm flex-1">{value || '-'}</span>
    </div>
  )

  const statusLabels: Record<string, string> = {
    active: '활성',
    inactive: '비활성',
    graduated: '졸업',
  }

  const statusColors: Record<string, string> = {
    active: 'text-green-400',
    inactive: 'text-gray-400',
    graduated: 'text-blue-400',
  }

  if (editing) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">이름 *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">생년월일</label>
            <input
              type="date"
              value={form.birth_date}
              onChange={e => setForm({ ...form, birth_date: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">상태</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value as any })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
              <option value="graduated">졸업</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">학교</label>
            <input
              type="text"
              value={form.school}
              onChange={e => setForm({ ...form, school: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">학년</label>
            <select
              value={form.grade}
              onChange={e => setForm({ ...form, grade: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">선택</option>
              {gradeOptions.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">목표 국가 (쉼표 구분)</label>
            <input
              type="text"
              value={form.target_countries}
              onChange={e => setForm({ ...form, target_countries: e.target.value })}
              placeholder="미국, 영국, 캐나다"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">목표 전공 (쉼표 구분)</label>
            <input
              type="text"
              value={form.target_majors}
              onChange={e => setForm({ ...form, target_majors: e.target.value })}
              placeholder="컴퓨터공학, 경영학"
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">담당 컨설턴트</label>
            <select
              value={form.consultant_id}
              onChange={e => setForm({ ...form, consultant_id: e.target.value })}
              disabled={!canEditAssignments}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">선택 안함</option>
              {consultants.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
            </select>
            {!canEditAssignments && <p className="text-xs text-gray-500 mt-1">관리자/컨설턴트만 변경 가능</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">학부모</label>
            <select
              value={form.parent_id}
              onChange={e => setForm({ ...form, parent_id: e.target.value })}
              disabled={!canEditAssignments}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">선택 안함</option>
              {parents.map(p => <option key={p.id} value={p.id}>{p.full_name || p.email}</option>)}
            </select>
            {!canEditAssignments && <p className="text-xs text-gray-500 mt-1">관리자/컨설턴트만 변경 가능</p>}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">메모</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition"
          >
            <X className="w-4 h-4" /> 취소
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition"
          >
            <Save className="w-4 h-4" /> {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    )
  }

  const consultantInfo = consultants.find(c => c.id === student.consultant_id)
  const parentInfo = parents.find(p => p.id === student.parent_id)

  return (
    <div className="space-y-6">
      <TabUpdateBanner studentId={student.id} tabName="basic" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <User className="w-4 h-4 text-blue-400" />
          기본 정보
        </h3>
        {canEdit && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white rounded-lg text-sm transition"
          >
            <Edit2 className="w-3.5 h-3.5" /> 수정
          </button>
        )}
      </div>

      <div className="bg-gray-750 rounded-xl divide-y divide-gray-700">
        <InfoRow label="이름" value={student.name} />
        <InfoRow label="생년월일" value={student.birth_date} />
        <div className="flex items-start gap-4 py-3 border-b border-gray-700">
          <span className="text-gray-400 text-sm w-32 flex-shrink-0">상태</span>
          <span className={`text-sm font-medium ${statusColors[student.status]}`}>
            {statusLabels[student.status]}
          </span>
        </div>
      </div>

      <div className="bg-gray-750 rounded-xl divide-y divide-gray-700">
        <div className="py-2 px-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <School className="w-3.5 h-3.5" /> 학교 정보
          </p>
        </div>
        <InfoRow label="학교" value={student.school} />
        <InfoRow label="학년" value={student.grade} />
      </div>

      <div className="bg-gray-750 rounded-xl divide-y divide-gray-700">
        <div className="py-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Globe className="w-3.5 h-3.5" /> 목표 정보
          </p>
        </div>
        <InfoRow
          label="목표 국가"
          value={student.target_countries?.join(', ')}
        />
        <InfoRow
          label="목표 전공"
          value={student.target_majors?.join(', ')}
        />
      </div>

      <div className="bg-gray-750 rounded-xl divide-y divide-gray-700">
        <div className="py-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <BookOpen className="w-3.5 h-3.5" /> 담당자 정보
          </p>
        </div>
        <InfoRow
          label="담당 컨설턴트"
          value={consultantInfo?.full_name || consultantInfo?.email}
        />
        <InfoRow
          label="학부모"
          value={parentInfo?.full_name || parentInfo?.email}
        />
      </div>

      {student.notes && (
        <div className="bg-gray-750 rounded-xl p-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">메모</p>
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{student.notes}</p>
        </div>
      )}
    </div>
  )
}
