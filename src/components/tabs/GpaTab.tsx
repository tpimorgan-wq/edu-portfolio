'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { GpaRecord, UserRole } from '@/types'
import { Plus, Trash2, Save, X, TrendingUp } from 'lucide-react'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'

interface GpaTabProps {
  studentId: string
  userRole?: UserRole
  userId?: string
  userName?: string
}

const emptyForm = {
  semester: '',
  year: new Date().getFullYear(),
  gpa: '',
  scale: '4.0',
  school: '',
  notes: '',
}

export default function GpaTab({ studentId, userRole, userId, userName }: GpaTabProps) {
  const canEdit = true
  const [records, setRecords] = useState<GpaRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchRecords = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('gpa_records')
      .select('*')
      .eq('student_id', studentId)
      .order('year', { ascending: false })
      .order('semester', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [studentId])

  const handleAdd = async () => {
    if (!form.semester || !form.year || !form.gpa) {
      setError('학기, 연도, GPA는 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('gpa_records').insert({
      student_id: studentId,
      semester: form.semester,
      year: Number(form.year),
      gpa: Number(form.gpa),
      scale: Number(form.scale),
      school: form.school || null,
      notes: form.notes || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchRecords()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'gpa', userId, userName, userRole)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 GPA 기록을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('gpa_records').delete().eq('id', id)
    setRecords(prev => prev.filter(r => r.id !== id))
  }

  const avgGpa = records.length > 0
    ? (records.reduce((s, r) => s + (r.gpa || 0), 0) / records.length).toFixed(2)
    : null

  const semesterLabels: Record<string, string> = {
    spring: '봄학기',
    fall: '가을학기',
    summer: '여름학기',
    winter: '겨울학기',
    '1': '1학기',
    '2': '2학기',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  return (
    <div className="space-y-5">
      <TabUpdateBanner studentId={studentId} tabName="gpa" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" />
          GPA 기록
        </h3>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
        )}
      </div>

      {avgGpa && (
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4 flex items-center gap-4">
          <div className="text-3xl font-bold text-blue-400">{avgGpa}</div>
          <div>
            <div className="text-sm font-medium text-white">평균 GPA</div>
            <div className="text-xs text-gray-400">총 {records.length}개 학기 기준</div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">GPA 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">연도 *</label>
              <input
                type="number"
                value={form.year}
                onChange={e => setForm({ ...form, year: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">학기 *</label>
              <select
                value={form.semester}
                onChange={e => setForm({ ...form, semester: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                <option value="1">1학기</option>
                <option value="2">2학기</option>
                <option value="spring">봄학기</option>
                <option value="fall">가을학기</option>
                <option value="summer">여름학기</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">GPA *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={form.gpa}
                onChange={e => setForm({ ...form, gpa: e.target.value })}
                placeholder="3.85"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">기준 점수</label>
              <select
                value={form.scale}
                onChange={e => setForm({ ...form, scale: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="4.0">4.0</option>
                <option value="4.3">4.3</option>
                <option value="4.5">4.5</option>
                <option value="5.0">5.0</option>
                <option value="100">100점</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">학교</label>
              <input
                type="text"
                value={form.school}
                onChange={e => setForm({ ...form, school: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">메모</label>
              <input
                type="text"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); setError(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition"
            >
              <X className="w-3.5 h-3.5" /> 취소
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      {records.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <TrendingUp className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">GPA 기록이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map(r => (
            <div key={r.id} className="bg-gray-750 rounded-xl p-4 flex items-center justify-between border border-gray-700">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-white">{r.gpa}</div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {r.year}년 {semesterLabels[r.semester] || r.semester}
                  </div>
                  <div className="text-xs text-gray-400">
                    기준: {r.scale}점 만점 {r.school && `· ${r.school}`}
                  </div>
                  {r.notes && <div className="text-xs text-gray-500 mt-0.5">{r.notes}</div>}
                </div>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(r.id)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
