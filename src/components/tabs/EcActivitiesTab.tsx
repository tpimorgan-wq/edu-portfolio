'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { EcActivity, UserRole } from '@/types'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'
import { Plus, Trash2, Save, X, Activity, ChevronDown, ChevronUp } from 'lucide-react'

interface EcActivitiesTabProps {
  studentId: string
  userRole?: UserRole
  userId?: string
  userName?: string
}

const emptyForm = {
  activity_name: '',
  category: '',
  position: '',
  organization: '',
  start_date: '',
  end_date: '',
  hours_per_week: '',
  description: '',
  achievements: '',
}

const CATEGORIES = ['학술/리서치', '예술/음악', '스포츠', '봉사활동', '리더십', '인턴십', '창업/비즈니스', '언어', '클럽/동아리', '기타']

export default function EcActivitiesTab({ studentId, userRole, userId, userName }: EcActivitiesTabProps) {
  const canEdit = true
  const [activities, setActivities] = useState<EcActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const fetchActivities = async () => {
    const db = createClient()
    const { data } = await db
      .from('ec_activities')
      .select('*')
      .eq('student_id', studentId)
      .order('start_date', { ascending: false })
    setActivities(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchActivities() }, [studentId])

  const handleAdd = async () => {
    if (!form.activity_name) {
      setError('활동명은 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)
    const db = createClient()
    const { error: err } = await db.from('ec_activities').insert({
      student_id: studentId,
      activity_name: form.activity_name,
      category: form.category || null,
      position: form.position || null,
      organization: form.organization || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      hours_per_week: form.hours_per_week ? Number(form.hours_per_week) : null,
      description: form.description || null,
      achievements: form.achievements || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchActivities()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'ec', userId, userName, userRole)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 활동을 삭제하시겠습니까?')) return
    const db = createClient()
    await db.from('ec_activities').delete().eq('id', id)
    setActivities(prev => prev.filter(a => a.id !== id))
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
      <TabUpdateBanner studentId={studentId} tabName="ec" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-400" />
          과외 활동 (EC Activities)
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
          <h4 className="text-sm font-medium text-white">활동 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">활동명 *</label>
              <input
                type="text"
                value={form.activity_name}
                onChange={e => setForm({ ...form, activity_name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">카테고리</label>
              <select
                value={form.category}
                onChange={e => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">직위/역할</label>
              <input
                type="text"
                value={form.position}
                onChange={e => setForm({ ...form, position: e.target.value })}
                placeholder="회장, 팀장, 멤버..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">기관/단체</label>
              <input
                type="text"
                value={form.organization}
                onChange={e => setForm({ ...form, organization: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">주당 시간</label>
              <input
                type="number"
                value={form.hours_per_week}
                onChange={e => setForm({ ...form, hours_per_week: e.target.value })}
                placeholder="5"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">시작일</label>
              <input
                type="date"
                value={form.start_date}
                onChange={e => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">종료일</label>
              <input
                type="date"
                value={form.end_date}
                onChange={e => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">활동 설명</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-400 mb-1">성과/수상</label>
              <textarea
                value={form.achievements}
                onChange={e => setForm({ ...form, achievements: e.target.value })}
                rows={2}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
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

      {activities.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">과외 활동이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map(act => (
            <div key={act.id} className="bg-gray-750 border border-gray-700 rounded-xl overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/30 transition"
                onClick={() => setExpanded(expanded === act.id ? null : act.id)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{act.activity_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {act.position && `${act.position} · `}
                      {act.organization && `${act.organization} · `}
                      {act.category}
                    </div>
                  </div>
                  {act.hours_per_week && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-md flex-shrink-0">
                      주 {act.hours_per_week}시간
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {canEdit && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(act.id) }}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {expanded === act.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400" />
                    : <ChevronDown className="w-4 h-4 text-gray-400" />
                  }
                </div>
              </div>
              {expanded === act.id && (
                <div className="px-4 pb-4 space-y-2 border-t border-gray-700 pt-3">
                  {act.start_date && (
                    <div className="text-xs text-gray-400">
                      기간: {act.start_date} ~ {act.end_date || '현재'}
                    </div>
                  )}
                  {act.description && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">활동 설명</div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{act.description}</p>
                    </div>
                  )}
                  {act.achievements && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">성과/수상</div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{act.achievements}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
