'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Exam, UserRole } from '@/types'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'
import { Plus, Trash2, Save, X, FileText } from 'lucide-react'

interface ExamsTabProps {
  studentId: string
  userRole?: UserRole
  userId?: string
  userName?: string
}

const emptyForm = {
  exam_type: '',
  exam_date: '',
  score: '',
  subscores_text: '',
  notes: '',
}

const EXAM_TYPES = ['SAT', 'ACT', 'TOEFL', 'IELTS', 'AP', 'IB', 'GRE', 'GMAT', 'LSAT', 'MCAT', '수능', '기타']

export default function ExamsTab({ studentId, userRole, userId, userName }: ExamsTabProps) {
  const canEdit = true
  const [exams, setExams] = useState<Exam[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchExams = async () => {
    const db = createClient()
    const { data } = await db
      .from('exams')
      .select('*')
      .eq('student_id', studentId)
      .order('exam_date', { ascending: false })
    setExams(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchExams() }, [studentId])

  const handleAdd = async () => {
    if (!form.exam_type || !form.score) {
      setError('시험 유형과 점수는 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)

    let subscores: Record<string, string> | null = null
    if (form.subscores_text) {
      try {
        subscores = Object.fromEntries(
          form.subscores_text.split(',').map(pair => {
            const [k, v] = pair.split(':').map(s => s.trim())
            return [k, v]
          })
        )
      } catch {
        subscores = null
      }
    }

    const db = createClient()
    const { error: err } = await db.from('exams').insert({
      student_id: studentId,
      exam_type: form.exam_type,
      exam_date: form.exam_date || null,
      score: form.score,
      subscores: subscores,
      notes: form.notes || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchExams()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'exams', userId, userName, userRole)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 시험 기록을 삭제하시겠습니까?')) return
    const db = createClient()
    await db.from('exams').delete().eq('id', id)
    setExams(prev => prev.filter(e => e.id !== id))
  }

  const examTypeColors: Record<string, string> = {
    SAT: 'bg-blue-900/40 text-blue-400',
    ACT: 'bg-purple-900/40 text-purple-400',
    TOEFL: 'bg-green-900/40 text-green-400',
    IELTS: 'bg-teal-900/40 text-teal-400',
    AP: 'bg-orange-900/40 text-orange-400',
    IB: 'bg-red-900/40 text-red-400',
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
      <TabUpdateBanner studentId={studentId} tabName="exams" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          공인 시험 성적
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

      {showForm && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">시험 성적 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">시험 유형 *</label>
              <select
                value={form.exam_type}
                onChange={e => setForm({ ...form, exam_type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {EXAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">점수 *</label>
              <input
                type="text"
                value={form.score}
                onChange={e => setForm({ ...form, score: e.target.value })}
                placeholder="1560"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">시험 날짜</label>
              <input
                type="date"
                value={form.exam_date}
                onChange={e => setForm({ ...form, exam_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">
                세부 점수 <span className="text-gray-600">(형식: 영역:점수, 영역:점수)</span>
              </label>
              <input
                type="text"
                value={form.subscores_text}
                onChange={e => setForm({ ...form, subscores_text: e.target.value })}
                placeholder="Reading:780, Math:780"
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

      {exams.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">시험 성적이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map(exam => (
            <div key={exam.id} className="bg-gray-750 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-lg text-sm font-bold ${examTypeColors[exam.exam_type] || 'bg-gray-700 text-gray-300'}`}>
                    {exam.exam_type}
                  </span>
                  <div>
                    <div className="text-xl font-bold text-white">{exam.score}</div>
                    {exam.exam_date && (
                      <div className="text-xs text-gray-400">{exam.exam_date}</div>
                    )}
                  </div>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDelete(exam.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {exam.subscores && Object.keys(exam.subscores).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(exam.subscores).map(([key, val]) => (
                    <span key={key} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md">
                      {key}: {String(val)}
                    </span>
                  ))}
                </div>
              )}
              {exam.notes && (
                <div className="mt-2 text-xs text-gray-400">{exam.notes}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
