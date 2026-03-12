'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Essay, UserRole } from '@/types'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'
import { Plus, Trash2, Save, X, PenLine, ChevronDown, ChevronUp, Edit2 } from 'lucide-react'

interface EssaysTabProps {
  studentId: string
  userRole?: UserRole
  userId?: string
  userName?: string
}

const emptyForm = {
  title: '',
  prompt: '',
  content: '',
  status: 'draft' as 'draft' | 'review' | 'final',
  feedback: '',
}

export default function EssaysTab({ studentId, userRole, userId, userName }: EssaysTabProps) {
  const canEdit = userRole !== 'parent'
  const [essays, setEssays] = useState<Essay[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const fetchEssays = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('essays')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
    setEssays(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchEssays() }, [studentId])

  const wordCount = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0

  const handleAdd = async () => {
    if (!form.title) {
      setError('제목은 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('essays').insert({
      student_id: studentId,
      title: form.title,
      prompt: form.prompt || null,
      content: form.content || null,
      word_count: form.content ? wordCount(form.content) : null,
      status: form.status,
      feedback: form.feedback || null,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchEssays()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'essays', userId, userName, userRole)
  }

  const handleUpdate = async (essay: Essay) => {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('essays')
      .update({
        title: form.title,
        prompt: form.prompt || null,
        content: form.content || null,
        word_count: form.content ? wordCount(form.content) : null,
        status: form.status,
        feedback: form.feedback || null,
        version: essay.version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', essay.id)
    if (err) { setError(err.message); setSaving(false); return }
    setEditingId(null)
    fetchEssays()
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 에세이를 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('essays').delete().eq('id', id)
    setEssays(prev => prev.filter(e => e.id !== id))
  }

  const statusConfig = {
    draft: { label: '초안', color: 'bg-gray-700 text-gray-300' },
    review: { label: '검토중', color: 'bg-yellow-900/40 text-yellow-400' },
    final: { label: '완료', color: 'bg-green-900/40 text-green-400' },
  }

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <svg className="animate-spin w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )

  const EssayFormFields = () => (
    <div className="space-y-3">
      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
          {error}
        </div>
      )}
      <div>
        <label className="block text-xs text-gray-400 mb-1">제목 *</label>
        <input
          type="text"
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">프롬프트/질문</label>
        <input
          type="text"
          value={form.prompt}
          onChange={e => setForm({ ...form, prompt: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          에세이 내용
          {form.content && <span className="text-gray-500 ml-1">({wordCount(form.content)} words)</span>}
        </label>
        <textarea
          value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          rows={8}
          placeholder="에세이 내용을 입력하세요..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">상태</label>
          <select
            value={form.status}
            onChange={e => setForm({ ...form, status: e.target.value as any })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="draft">초안</option>
            <option value="review">검토중</option>
            <option value="final">완료</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-400 mb-1">피드백</label>
        <textarea
          value={form.feedback}
          onChange={e => setForm({ ...form, feedback: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>
    </div>
  )

  return (
    <div className="space-y-5">
      <TabUpdateBanner studentId={studentId} tabName="essays" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <PenLine className="w-4 h-4 text-blue-400" />
          에세이
        </h3>
        {canEdit && (
          <button
            onClick={() => { setShowForm(!showForm); setEditingId(null) }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
        )}
      </div>

      {showForm && !editingId && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4">
          <h4 className="text-sm font-medium text-white mb-3">에세이 추가</h4>
          <EssayFormFields />
          <div className="flex gap-2 justify-end mt-3">
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

      {essays.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <PenLine className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">에세이가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {essays.map(essay => (
            <div key={essay.id} className="bg-gray-750 border border-gray-700 rounded-xl overflow-hidden">
              {editingId === essay.id ? (
                <div className="p-4">
                  <h4 className="text-sm font-medium text-white mb-3">에세이 수정</h4>
                  <EssayFormFields />
                  <div className="flex gap-2 justify-end mt-3">
                    <button
                      onClick={() => { setEditingId(null); setForm(emptyForm); setError(null) }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition"
                    >
                      <X className="w-3.5 h-3.5" /> 취소
                    </button>
                    <button
                      onClick={() => handleUpdate(essay)}
                      disabled={saving}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
                    >
                      <Save className="w-3.5 h-3.5" /> {saving ? '저장 중...' : '저장'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/30 transition"
                    onClick={() => setExpanded(expanded === essay.id ? null : essay.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">{essay.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig[essay.status].color}`}>
                          {statusConfig[essay.status].label}
                        </span>
                        {essay.word_count && (
                          <span className="text-xs text-gray-400">{essay.word_count} words</span>
                        )}
                        <span className="text-xs text-gray-500">v{essay.version}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      {canEdit && (
                        <>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              setForm({
                                title: essay.title,
                                prompt: essay.prompt || '',
                                content: essay.content || '',
                                status: essay.status,
                                feedback: essay.feedback || '',
                              })
                              setEditingId(essay.id)
                              setShowForm(false)
                            }}
                            className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(essay.id) }}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {expanded === essay.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400" />
                        : <ChevronDown className="w-4 h-4 text-gray-400" />
                      }
                    </div>
                  </div>
                  {expanded === essay.id && (
                    <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-3">
                      {essay.prompt && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">프롬프트</div>
                          <p className="text-sm text-gray-300">{essay.prompt}</p>
                        </div>
                      )}
                      {essay.content && (
                        <div>
                          <div className="text-xs font-medium text-gray-500 mb-1">내용</div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                            {essay.content}
                          </p>
                        </div>
                      )}
                      {essay.feedback && (
                        <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-3">
                          <div className="text-xs font-medium text-yellow-400 mb-1">피드백</div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{essay.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
