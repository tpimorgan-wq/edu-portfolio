'use client'

import { useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Student, Profile } from '@/types'
import { Save, X, Plus, Star } from 'lucide-react'

interface StudentFormProps {
  student?: Student
  consultants: Profile[]
  parents: Profile[]
  studentAccounts?: Profile[]
  onSuccess: (student: Student) => void
  onCancel: () => void
}

export default function StudentForm({
  student,
  consultants,
  parents,
  studentAccounts,
  onSuccess,
  onCancel,
}: StudentFormProps) {
  const [form, setForm] = useState({
    name: student?.name || '',
    nationality: student?.nationality || '',
    birth_date: student?.birth_date || '',
    school: student?.school || '',
    grade: student?.grade || '',
    target_countries: student?.target_countries?.join(', ') || '',
    target_majors: student?.target_majors?.join(', ') || '',
    main_consultant_id: student?.main_consultant_id || '',
    consultant_ids: student?.consultant_ids || [] as string[],
    parent_id: student?.parent_id || '',
    user_id: student?.user_id || '',
    notes: student?.notes || '',
    status: student?.status || 'active',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConsultantDropdown, setShowConsultantDropdown] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const db = createClient()

    const payload: any = {
      name: form.name.trim(),
      nationality: form.nationality.trim() || null,
      birth_date: form.birth_date || null,
      school: form.school.trim() || null,
      grade: form.grade.trim() || null,
      target_countries: form.target_countries
        ? form.target_countries.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      target_majors: form.target_majors
        ? form.target_majors.split(',').map(s => s.trim()).filter(Boolean)
        : null,
      main_consultant_id: form.main_consultant_id || null,
      consultant_ids: form.consultant_ids.filter(Boolean).length > 0 ? form.consultant_ids.filter(Boolean) : null,
      parent_id: form.parent_id || null,
      user_id: form.user_id || null,
      notes: form.notes.trim() || null,
      status: form.status,
    }

    let data, error: any

    if (student) {
      const result = await db
        .from('students')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', student.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      const result = await db
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

  const addConsultantById = (id: string) => {
    if (!id || form.consultant_ids.includes(id) || form.consultant_ids.length >= 6) return
    setForm(prev => ({ ...prev, consultant_ids: [...prev.consultant_ids, id] }))
    setShowConsultantDropdown(false)
  }

  const removeConsultant = (idx: number) => {
    setForm(prev => ({ ...prev, consultant_ids: prev.consultant_ids.filter((_, i) => i !== idx) }))
  }

  const selectClass = 'w-full px-3 py-1.5 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  const gradeOptions = [
    'G1(Y2)', 'G2(Y3)', 'G3(Y4)', 'G4(Y5)', 'G5(Y6)', 'G6(Y7)',
    'G7(Y8)', 'G8(Y9)', 'G9(Y10)', 'G10(Y11)', 'G11(Y12)', 'G12(Y13)',
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
        <div>
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

        {/* Nationality */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">국적</label>
          <input
            type="text"
            value={form.nationality}
            onChange={e => setForm({ ...form, nationality: e.target.value })}
            placeholder="한국"
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

        {/* 담당자 정보 */}
        <div className="sm:col-span-2 bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-medium text-gray-300">담당자 정보</h3>

          {/* 메인 담당자 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300 mb-1.5">
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              메인 담당자
            </label>
            <select
              value={form.main_consultant_id}
              onChange={e => setForm({ ...form, main_consultant_id: e.target.value })}
              className={selectClass}
            >
              <option value="">선택 안함</option>
              {consultants.map(c => (
                <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
              ))}
            </select>
          </div>

          {/* 담당 컨설턴트 태그 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              담당 컨설턴트 (최대 6명)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.consultant_ids.map((cid, idx) => {
                const c = consultants.find(con => con.id === cid)
                return (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-blue-900/30 border border-blue-700 text-blue-300 rounded-full px-3 py-1 text-sm"
                  >
                    {c?.full_name || c?.email || cid}
                    <button
                      type="button"
                      onClick={() => removeConsultant(idx)}
                      className="hover:text-white transition"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                )
              })}
            </div>
            {form.consultant_ids.length < 6 && (
              <>
                <button
                  type="button"
                  onClick={() => setShowConsultantDropdown(!showConsultantDropdown)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-blue-400 hover:text-blue-300 hover:bg-gray-700 rounded-lg text-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> 컨설턴트 추가
                </button>
                {showConsultantDropdown && (
                  <select
                    className={`${selectClass} mt-2`}
                    value=""
                    onChange={e => addConsultantById(e.target.value)}
                  >
                    <option value="">컨설턴트 선택...</option>
                    {consultants
                      .filter(c => !form.consultant_ids.includes(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
                      ))}
                  </select>
                )}
              </>
            )}
          </div>

          {/* 학부모 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">학부모</label>
            <select
              value={form.parent_id}
              onChange={e => setForm({ ...form, parent_id: e.target.value })}
              className={selectClass}
            >
              <option value="">선택 안함</option>
              {parents.map(p => (
                <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
              ))}
            </select>
          </div>

          {/* 학생 계정 */}
          {studentAccounts && studentAccounts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">학생 계정</label>
              <select
                value={form.user_id}
                onChange={e => setForm({ ...form, user_id: e.target.value })}
                className={selectClass}
              >
                <option value="">선택 안함</option>
                {studentAccounts.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                ))}
              </select>
            </div>
          )}
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
