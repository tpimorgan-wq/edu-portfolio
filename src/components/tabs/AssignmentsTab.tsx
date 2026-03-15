'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Assignment, UserRole } from '@/types'
import { recordTabUpdate } from '@/lib/tab-update'
import { sendPushNotification } from '@/lib/firebase/sendPush'
import TabUpdateBanner from '@/components/TabUpdateBanner'
import { Plus, Trash2, Save, X, ClipboardList, Edit2, Paperclip, Download, Upload } from 'lucide-react'

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
  const [uploading, setUploading] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [editFileToUpload, setEditFileToUpload] = useState<File | null>(null)
  const [detailAssignment, setDetailAssignment] = useState<Assignment | null>(null)

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

  const uploadFile = async (file: File): Promise<{ url: string; name: string } | null> => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('studentId', studentId)
    const res = await fetch('/api/assignments/upload', { method: 'POST', body: fd })
    if (!res.ok) return null
    const data = await res.json()
    return { url: data.url, name: file.name }
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    const res = await fetch(`/api/contracts/download?url=${encodeURIComponent(fileUrl)}&filename=${encodeURIComponent(fileName)}`)
    if (!res.ok) return
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const handleAdd = async () => {
    if (!form.title || !form.due_date || !form.category) {
      setError('과제 이름, 카테고리, 마감 기한은 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)

    let fileData: { url: string; name: string } | null = null
    if (fileToUpload) {
      setUploading(true)
      fileData = await uploadFile(fileToUpload)
      setUploading(false)
      if (!fileData) { setError('파일 업로드에 실패했습니다.'); setSaving(false); return }
    }

    const db = createClient()
    const now = new Date().toISOString()
    const insertData: Record<string, any> = {
      student_id: studentId,
      title: form.title,
      category: form.category,
      status: form.status,
      description: form.description || null,
      assigned_date: form.assigned_date,
      due_date: form.due_date,
      updated_at: now,
    }
    if (fileData) {
      insertData.file_url = fileData.url
      insertData.file_name = fileData.name
    }
    const { error: err } = await db.from('assignments').insert(insertData)
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setFileToUpload(null)
    setShowForm(false)
    fetchAssignments()
    setSaving(false)
    if (userId && userName && userRole) recordTabUpdate(studentId, 'assignments', userId, userName, userRole)

    // Push notification to student/parent (best-effort)
    try {
      const db2 = createClient()
      const { data: student } = await db2.from('students').select('*').eq('id', studentId).single()
      if (student) {
        const targetIds = [student.user_id, student.parent_id].filter(Boolean)
        if (targetIds.length) {
          sendPushNotification(targetIds, '새 과제가 부여되었습니다', `"${form.title}" 마감: ${form.due_date}`)
        }
      }
    } catch { /* ignore */ }
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
    setSaving(true)

    let fileData: { url: string; name: string } | null = null
    if (editFileToUpload) {
      setUploading(true)
      fileData = await uploadFile(editFileToUpload)
      setUploading(false)
      if (!fileData) { setError('파일 업로드에 실패했습니다.'); setSaving(false); return }
    }

    const db = createClient()
    const updateData: Record<string, any> = {
      title: editForm.title,
      category: editForm.category,
      status: editForm.status,
      description: editForm.description || null,
      assigned_date: editForm.assigned_date,
      due_date: editForm.due_date,
      updated_at: new Date().toISOString(),
    }
    if (fileData) {
      updateData.file_url = fileData.url
      updateData.file_name = fileData.name
    }
    await db.from('assignments').update(updateData).eq('id', id)
    setEditingId(null)
    setEditFileToUpload(null)
    setSaving(false)
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
          <div>
            <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
              <Paperclip className="w-3 h-3" /> 파일 첨부 (PDF)
            </label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm cursor-pointer transition border border-gray-600">
                <Upload className="w-3.5 h-3.5" />
                {fileToUpload ? fileToUpload.name : '파일 선택'}
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setFileToUpload(e.target.files?.[0] || null)}
                />
              </label>
              {fileToUpload && (
                <button onClick={() => setFileToUpload(null)} className="p-1 text-gray-500 hover:text-red-400 transition">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowForm(false); setForm(emptyForm); setFileToUpload(null); setError(null) }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition"
            >
              <X className="w-3.5 h-3.5" /> 취소
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
            >
              <Save className="w-3.5 h-3.5" /> {uploading ? '업로드 중...' : saving ? '저장 중...' : '저장'}
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
                  <div>
                    <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> 파일 첨부 (PDF)
                    </label>
                    <div className="flex items-center gap-2">
                      {a.file_url && !editFileToUpload && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Paperclip className="w-3 h-3" /> {a.file_name || '첨부 파일'}
                        </span>
                      )}
                      <label className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs cursor-pointer transition border border-gray-600">
                        <Upload className="w-3 h-3" />
                        {editFileToUpload ? editFileToUpload.name : (a.file_url ? '파일 변경' : '파일 선택')}
                        <input
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={e => setEditFileToUpload(e.target.files?.[0] || null)}
                        />
                      </label>
                      {editFileToUpload && (
                        <button onClick={() => setEditFileToUpload(null)} className="p-1 text-gray-500 hover:text-red-400 transition">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => { setEditingId(null); setEditFileToUpload(null) }}
                      className="flex items-center gap-1 px-2.5 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs transition">
                      <X className="w-3 h-3" /> 취소
                    </button>
                    <button onClick={() => handleUpdate(a.id)} disabled={saving || uploading}
                      className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition">
                      <Save className="w-3 h-3" /> {uploading ? '업로드 중...' : '저장'}
                    </button>
                  </div>
                </div>
              )
            }

            return (
              <div key={a.id} className="bg-gray-750 border border-gray-700 rounded-xl p-4 cursor-pointer hover:border-gray-600 transition" onClick={() => setDetailAssignment(a)}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <span className="text-sm font-medium text-white">{a.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColors[a.category] || categoryColors['기타']}`}>
                        {a.category}
                      </span>
                      {a.file_url && <Paperclip className="w-3 h-3 text-blue-400" />}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConfig[a.status].color}`}>
                        {statusConfig[a.status].label}
                      </span>
                      <span className="text-xs text-gray-500">마감: {a.due_date}</span>
                      {dueInfo && (
                        <span className={`text-xs font-medium ${dueInfo.color}`}>{dueInfo.label}</span>
                      )}
                    </div>
                  </div>
                  {(canChangeStatus) && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {(canChangeStatus) && a.status === 'todo' && (
                        <button onClick={e => { e.stopPropagation(); handleStatusChange(a.id, 'in_progress') }}
                          className="px-2 py-1 text-[10px] bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 rounded-lg transition" title="진행중으로">
                          진행
                        </button>
                      )}
                      {(canChangeStatus) && (a.status === 'todo' || a.status === 'in_progress') && (
                        <button onClick={e => { e.stopPropagation(); handleStatusChange(a.id, 'done') }}
                          className="px-2 py-1 text-[10px] bg-green-900/30 text-green-400 hover:bg-green-900/50 rounded-lg transition" title="완료 처리">
                          완료
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

      {/* Detail Modal */}
      {detailAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetailAssignment(null)}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white">{detailAssignment.title}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${categoryColors[detailAssignment.category] || categoryColors['기타']}`}>
                    {detailAssignment.category}
                  </span>
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${statusConfig[detailAssignment.status].color}`}>
                    {statusConfig[detailAssignment.status].label}
                  </span>
                </div>
              </div>
              <button onClick={() => setDetailAssignment(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info rows */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-20 flex-shrink-0">부여 날짜</span>
                <span className="text-gray-200">{detailAssignment.assigned_date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-20 flex-shrink-0">마감 기한</span>
                <span className="text-gray-200">{detailAssignment.due_date}</span>
                {detailAssignment.status !== 'done' && (() => {
                  const info = getDueDateInfo(detailAssignment.due_date)
                  return <span className={`text-xs font-medium ${info.color}`}>{info.label}</span>
                })()}
              </div>
              {detailAssignment.description && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">설명</span>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-750 rounded-lg p-3 border border-gray-700">{detailAssignment.description}</p>
                </div>
              )}
              {detailAssignment.file_url && detailAssignment.file_name && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">첨부 파일</span>
                  <button
                    onClick={() => handleDownload(detailAssignment.file_url!, detailAssignment.file_name!)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-blue-400 rounded-lg text-sm transition border border-gray-600"
                  >
                    <Download className="w-4 h-4" />
                    {detailAssignment.file_name}
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {canManage && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                <button
                  onClick={() => { handleStartEdit(detailAssignment); setDetailAssignment(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> 수정
                </button>
                <button
                  onClick={() => { handleDelete(detailAssignment.id); setDetailAssignment(null) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm transition border border-red-800"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
