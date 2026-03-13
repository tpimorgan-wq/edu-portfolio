'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { ConsultNote } from '@/types'
import { Plus, Trash2, Save, X, MessageSquare, Edit2 } from 'lucide-react'

interface ConsultNotesTabProps {
  studentId: string
  currentUserId: string
  currentUserName: string
}

const emptyForm = {
  note_date: new Date().toISOString().split('T')[0],
  content: '',
}

export default function ConsultNotesTab({ studentId, currentUserId, currentUserName }: ConsultNotesTabProps) {
  const [notes, setNotes] = useState<ConsultNote[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  const fetchNotes = async () => {
    try {
      const db = createClient()
      const { data } = await db
        .from('consult_notes')
        .select('*')
        .eq('student_id', studentId)
        .order('note_date', { ascending: false })
      setNotes(data || [])
    } catch (err) {
      console.error('Failed to fetch consult notes:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchNotes() }, [studentId])

  const handleAdd = async () => {
    if (!form.content.trim()) {
      setError('상담 내용을 입력해주세요.')
      return
    }
    setSaving(true)
    setError(null)
    const db = createClient()
    const now = new Date().toISOString()
    const { error: err } = await db.from('consult_notes').insert({
      student_id: studentId,
      author_id: currentUserId,
      author_name: currentUserName,
      note_date: form.note_date,
      content: form.content,
      updated_at: now,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchNotes()
    setSaving(false)
  }

  const handleUpdate = async (id: string) => {
    if (!editContent.trim()) return
    const db = createClient()
    await db.from('consult_notes').update({
      content: editContent,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editContent, updated_at: new Date().toISOString() } : n))
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 상담 노트를 삭제하시겠습니까?')) return
    const db = createClient()
    await db.from('consult_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
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
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          상담 노트
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">상담 노트 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">상담 날짜</label>
              <input
                type="date"
                value={form.note_date}
                onChange={e => setForm({ ...form, note_date: e.target.value })}
                className="w-full sm:w-48 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">상담 내용 *</label>
              <textarea
                value={form.content}
                onChange={e => setForm({ ...form, content: e.target.value })}
                rows={4}
                placeholder="상담 내용을 입력하세요..."
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

      {notes.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">상담 노트가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map(note => (
            <div key={note.id} className="bg-gray-750 border border-gray-700 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-sm font-medium text-white">{note.note_date}</span>
                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
                      {note.author_name}
                    </span>
                  </div>
                  {editingId === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition"
                        >
                          <X className="w-3 h-3" /> 취소
                        </button>
                        <button
                          onClick={() => handleUpdate(note.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition"
                        >
                          <Save className="w-3 h-3" /> 저장
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{note.content}</p>
                  )}
                </div>
                {editingId !== note.id && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditingId(note.id); setEditContent(note.content) }}
                      className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
