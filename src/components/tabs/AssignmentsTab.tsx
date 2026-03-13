'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Assignment, UserRole } from '@/types'
import { recordTabUpdate } from '@/lib/tab-update'
import TabUpdateBanner from '@/components/TabUpdateBanner'
import { Plus, Trash2, Save, X, ClipboardList, Edit2 } from 'lucide-react'

interface AssignmentsTabProps {
  studentId: string
  userRole?: UserRole
  userId?: string
  userName?: string
}

const CATEGORIES = ['GPA', 'EC활동', '공인시험', '에세이', '필수서류', '기타'] as const

const emptyForm = {
  title: '',
  category: '' as string,
  status: 'todo' as 'todo' | 'in_progress' | 'done',
  description: '',
  assigned_date: new Date().toISOString().split('T')[0],
  due_date: '',
}

const statusConfig = {
  todo: { label: '미완료', color: 'bg-red-900/40 text-red-400 border border-red-800' },
  in_progress: { label: '진행중', color: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800' },
  done: { label: '완료', color: 'bg-green-900/40 text-green-400 border border-green-800' },
}

const categoryColors: Record<string, string> = {
  'GPA': 'bg-blue-900/40 text-blue-400',
  'EC활동': 'bg-purple-900/40 text-purple-400',
  '공인시험': 'bg-teal-900/40 text-teal-400',
  '에세이': 'bg-orange-900/40 text-orange-400',
  '필수서류': 'bg-green-900/40 text-green-400',
  '기타': 'bg-gray-700 text-gray-300',
}

export default function AssignmentsTab({ studentId, userRole, userId, userName }: AssignmentsTabProps) {
  const canManage = userRole === 'admin' || userRole === 'consultant'
  const canChangeStatus = canManage || userRole === 'student' || userRole === 'parent'
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyForm)
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const fetchAssignments = async () => {
    try {
      const db = createClient()
      const { data } = await db
        .from('assignments')
        .select('*')
        .eq('student_id', studentId)
        .order('due_date', { ascending: true })
      setAssignments(data || [])
    } catch (err) {
      console.error('Failed to fetch assignments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAssignments() }, [studentId])

  const handleAdd = async () => {
    if (!form.title || !form.due_date || !form.category) {
      setError('과제 이름, 카테고리, 마감 기한은 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)
    const db = createClient()
    const now = new Date().toISOString()
    const { error: err } = await db.from('assignments').insert({
      student_id: studentId,
      title: form.title,
      category: form.category,
      status: form.status,
      description: form.description || null,
      assigned_date: form.assigned_date,
      due_date: form.due_date,
      updated_at: now,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchAssignments()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'assignments', userId, userName, userRole)
  }

  const handleStartEdit = (a: Assignment) => {
    setEditingId(a.id)
    setEditForm({
      title: a.title,
      category: a.category,
      status: a.status,
      description: a.description || '',
      assigned_date: a.assigned_date,
      due_date: a.due_date,
    })
  }

  const handleUpdate = async (id: string) => {
    if (!editForm.title || !editForm.due_date || !editForm.category) return
    const db = createClient()
    await db.from('assignments').update({
      title: editForm.title,
      category: editForm.category,
      status: editForm.status,
      description: editForm.description || null,
      assigned_date: editForm.assigned_date,
      due_date: editForm.due_date,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setEditingId(null)
    fetchAssignments()
  }

  const handleStatusChange = async (id: string, status: Assignment['status']) => {
    const db = createClient()
    await db.from('assignments').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 과제를 삭제하시겠습니까?')) return
    const db = createClient()
    await db.from('assignments').delete().eq('id', id)
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  const getDueDateInfo = (dueDate: string) => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    const due = new Date(dueDate)
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return { label: `${Math.abs(diff)}일 지남`, color: 'text-red-400' }
    if (diff === 0) return { label: '오늘 마감', color: 'text-red-400' }
    if (diff <= 7) return { label: `${diff}일 남음`, color: 'text-red-400' }
    if (diff <= 14) return { label: `${diff}일 남음`, color: 'text-yellow-400' }
    return { label: `${diff}일 남음`, color: 'text-gray-400' }
  }

  const filtered = statusFilter === 'all' ? assignments : assignments.filter(a => a.status === statusFilter)

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
      <TabUpdateBanner studentId={studentId} tabName="assignments" />
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-blue-400" />
          과제 관리
        </h3>
        {canManage && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
        )}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {['all', 'todo', 'in_progress', 'done'].map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === f ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            {f === 'all' ? '전체' : statusConfig[f as keyof typeof statusConfig].label}
          </button>
        ))}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">과제 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs text-gray-400 mb-1">과제 이름 *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">카테고리 *</label>
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
              <label className="block text-xs text-gray-400 mb-1">부여 날짜</label>
              <input
                type="date"
                value={form.assigned_date}
                onChange={e => setForm({ ...form, assigned_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">마감 기한 *</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs text-gray-400 mb-1">설명</label>
              <textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
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

      {/* Assignment List */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">과제가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const dueInfo = a.status !== 'done' ? getDueDateInfo(a.due_date) : null

            if (editingId === a.id) {
              return (
                <div key={a.id} className="bg-gray-750 border border-blue-600 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="col-span-2 sm:col-span-3">
                      <label className="block text-xs text-gray-400 mb-1">과제 이름 *</label>
                      <input type="text" value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">카테고리 *</label>
                      <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">선택</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">상태</label>
                      <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="todo">미완료</option>
                        <option value="in_progress">진행중</option>
                        <option value="done">완료</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">마감 기한 *</label>
                      <input type="date" value={editForm.due_date} onChange={e => setEditForm({ ...editForm, due_date: e.target.value })}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <label className="block text-xs text-gray-400 mb-1">설명</label>
                      <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingId(null)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition">
                      <X className="w-3 h-3" /> 취소
                    </button>
                    <button onClick={() => handleUpdate(a.id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition">
                      <Save className="w-3 h-3" /> 저장
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={a.id} className="bg-gray-750 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-sm font-medium text-white">{a.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColors[a.category] || categoryColors['기타']}`}>
                        {a.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConfig[a.status].color}`}>
                        {statusConfig[a.status].label}
                      </span>
                      <span className="text-xs text-gray-500">부여: {a.assigned_date}</span>
                      <span className="text-xs text-gray-500">마감: {a.due_date}</span>
                      {dueInfo && (
                        <span className={`text-xs font-medium ${dueInfo.color}`}>{dueInfo.label}</span>
                      )}
                    </div>
                    {a.description && (
                      <p className="text-xs text-gray-400 mt-2">{a.description}</p>
                    )}
                  </div>
                  {(canChangeStatus) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(canChangeStatus) && a.status === 'todo' && (
                        <button onClick={() => handleStatusChange(a.id, 'in_progress')}
                          className="px-2 py-1 text-[10px] bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 rounded-lg transition" title="진행중으로">
                          진행
                        </button>
                      )}
                      {(canChangeStatus) && (a.status === 'todo' || a.status === 'in_progress') && (
                        <button onClick={() => handleStatusChange(a.id, 'done')}
                          className="px-2 py-1 text-[10px] bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg transition" title="완료 처리">
                          완료
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => handleStartEdit(a)}
                          className="p-1.5 text-gray-500 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition" title="수정">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canManage && (
                        <button onClick={() => handleDelete(a.id)}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition" title="삭제">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
