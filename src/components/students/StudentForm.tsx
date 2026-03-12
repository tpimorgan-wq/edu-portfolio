'use client'

import { useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Student, Profile } from '@/types'
import { Save, X, Plus, Trash2 } from 'lucide-react'

interface StudentFormProps {
  student?: Student
  consultants: Profile[]
  parents: Profile[]
  onSuccess: (student: Student) => void
  onCancel: () => void
}

export default function StudentForm({
  student,
  consultants,
  parents,
  onSuccess,
  onCancel,
}: StudentFormProps) {
  const [form, setForm] = useState({
    name: student?.name || '',
    birth_date: student?.birth_date || '',
    school: student?.school || '',
    grade: student?.grade || '',
    target_countries: student?.target_countries?.join(', ') || '',
    target_majors: student?.target_majors?.join(', ') || '',
    consultant_id: student?.consultant_id || '',
    parent_id: student?.parent_id || '',
    notes: student?.notes || '',
    status: student?.status || 'active',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const payload: any = {
      name: form.name.trim(),
      birth_date: form.birth_date || null,
      school: form.school.trim() || null,
      grade: form.grade.trim() || null,
      target_countries: form.target_countries
        ? form.target_countries.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      target_majors: form.target_majors
        ? form.target_majors.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      consultant_id: form.consultant_id || null,
      parent_id: form.parent_id || null,
      notes: form.notes.trim() || null,
      status: form.status,
    }

    let data, error: any

    if (student) {
      const result = await supabase
        .from('students')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', student.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await supabase
        .from('students')
        .insert(payload)
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    onSuccess(data)
  }

  const gradeOptions = [
    '중1', '중2', '중3',
    '고1', '고2', '고3',
    '대학교 1학년', '대학교 2학년', '대학교 3학년', '대학교 4학년',
    '졸업생',
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Name */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            이름 <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            placeholder="학생 이름"
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Birth Date */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">생년월일</label>
          <input
            type="date"
            value={form.birth_date}
            onChange={e => setForm({ ...form, birth_date: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* School */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">학교</label>
          <input
            type="text"
            value={form.school}
            onChange={e => setForm({ ...form, school: e.target.value })}
            placeholder="학교명"
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Grade */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">학년</label>
          <select
            value={form.grade}
            onChange={e => setForm({ ...form, grade: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">학년 선택</option>
            {gradeOptions.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">상태</label>
          <select
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as any })}
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="graduated">졸업</option>
          </select>
        </div>

        {/* Target Countries */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            목표 국가 <span className="text-gray-500 font-normal">(쉼표로 구분)</span>
          </label>
          <input
            type="text"
            value={form.target_countries}
            onChange={e => setForm({ ...form, target_countries: e.target.value })}
            placeholder="미국, 영국, 캐나다"
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Target Majors */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            목표 전공 <span className="text-gray-500 font-normal">(쉼표로 구분)</span>
          </label>
          <input
            type="text"
            value={form.target_majors}
            onChange={e => setForm({ ...form, target_majors: e.target.value })}
            placeholder="컴퓨터공학, 경영학"
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Consultant */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">담당 컨설턴트</label>
          <select
            value={form.consultant_id}
            onChange={e => setForm({ ...form, consultant_id: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">선택 안함</option>
            {consultants.map(c => (
              <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
            ))}
          </select>
        </div>

        {/* Parent */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">학부모</label>
          <select
            value={form.parent_id}
            onChange={e => setForm({ ...form, parent_id: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">선택 안함</option>
            {parents.map(p => (
              <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-300 mb-1.5">메모</label>
          <textarea
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
            rows={3}
            placeholder="학생에 대한 메모..."
            className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition text-sm"
        >
          <X className="w-4 h-4" />
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl font-medium transition text-sm"
        >
          <Save className="w-4 h-4" />
          {loading ? '저장 중...' : student ? '수정 저장' : '학생 추가'}
        </button>
      </div>
    </form>
  )
}
