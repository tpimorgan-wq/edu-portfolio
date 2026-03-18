'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, Student } from '@/types'
import { Plus, X, ClipboardList, Filter, Check } from 'lucide-react'

interface Task {
  id: string
  title: string
  note: string
  status: 'done' | 'in_progress' | 'waiting' | 'hold'
  proposer_id: string
  owner_ids: string[]
  due_date: string
  student_id: string | null
  created_at: string
  updated_at: string
}

const STATUS_OPTIONS = [
  { value: 'in_progress', label: '진행중', color: 'bg-blue-900/40 text-blue-400 border-blue-800' },
  { value: 'waiting', label: '대기중', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-800' },
  { value: 'done', label: '완료', color: 'bg-green-900/40 text-green-400 border-green-800' },
  { value: 'hold', label: '보류', color: 'bg-red-900/40 text-red-400 border-red-800' },
]

function statusColor(s: string) {
  return STATUS_OPTIONS.find(o => o.value === s)?.color || 'bg-gray-700 text-gray-400 border-gray-600'
}
function statusLabel(s: string) {
  return STATUS_OPTIONS.find(o => o.value === s)?.label || s
}

export default function TasksPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Task | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [filterOwner, setFilterOwner] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState<'due_date' | 'updated_at'>('due_date')

  const emptyTask: Omit<Task, 'id'> = {
    title: '', note: '', status: 'waiting', proposer_id: '',
    owner_ids: [], due_date: '', student_id: null,
    created_at: '', updated_at: '',
  }
  const [form, setForm] = useState(emptyTask)

  useEffect(() => {
    fetchAll()
  }, [router])

  const fetchAll = async () => {
    try {
      const session = getSessionFromCookies()
      if (!session) { router.push('/login'); return }
      const db = createClient()
      const { data: prof } = await db.from('profiles').select('*').eq('id', session.userId).single()
      if (!prof || (prof.role !== 'admin' && prof.role !== 'consultant')) { router.push('/dashboard'); return }
      setProfile(prof)

      const [{ data: taskData }, { data: allProfiles }, { data: allStudents }] = await Promise.all([
        db.from('tasks').select('*').order('created_at', { ascending: false }),
        db.from('profiles').select('*'),
        db.from('students').select('*'),
      ])
      setTasks((taskData || []) as Task[])
      const pMap: Record<string, Profile> = {}
      for (const p of (allProfiles || [])) pMap[p.id] = p as Profile
      setProfiles(pMap)
      setStudents((allStudents || []) as Student[])
    } catch (err) {
      console.error('Failed to fetch tasks:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!form.title.trim() || !profile) return
    const db = createClient()
    const now = new Date().toISOString()
    const isNew = !modal
    if (modal) {
      await db.from('tasks').update({ ...form, updated_at: now }).eq('id', modal.id)
    } else {
      await db.from('tasks').insert({ ...form, proposer_id: form.proposer_id || profile.id, created_at: now, updated_at: now }).select('*').single()
    }

    // Background: send FCM + message to each owner
    const owners = form.owner_ids || []
    if (owners.length > 0) {
      const notifTitle = isNew ? '새 업무가 배정되었습니다' : '업무가 업데이트되었습니다'
      const notifBody = isNew
        ? `${form.title}${form.due_date ? ' (마감: ' + form.due_date + ')' : ''}`
        : form.title
      const msgContent = isNew
        ? `새 업무가 배정되었습니다: ${form.title}${form.due_date ? ' (마감: ' + form.due_date + ')' : ''}`
        : `업무가 업데이트되었습니다: ${form.title}`

      Promise.all([
        fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: owners, title: notifTitle, body: notifBody, type: 'task' }),
        }),
        ...owners.map(ownerId =>
          fetch('/api/messages/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiver_id: ownerId, content: msgContent, reply_to_id: null }),
          })
        ),
      ]).catch(() => {})
    }

    setModal(null)
    setShowNew(false)
    setForm(emptyTask)
    await fetchAll()
  }

  const handleToggleDone = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation()
    const db = createClient()
    const newStatus = task.status === 'done' ? 'in_progress' : 'done'
    await db.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
  }

  const handleStatusChange = async (task: Task, newStatus: string, e: React.ChangeEvent) => {
    e.stopPropagation()
    const db = createClient()
    await db.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', task.id)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus as Task['status'] } : t))
  }

  const openEdit = (task: Task) => {
    setForm({ ...task })
    setModal(task)
    setShowNew(true)
  }

  const openNew = () => {
    setForm({ ...emptyTask, proposer_id: profile?.id || '' })
    setModal(null)
    setShowNew(true)
  }

  const consultants = Object.values(profiles).filter(p => p.role === 'admin' || p.role === 'consultant')

  let filtered = tasks
  if (filterOwner !== 'all') filtered = filtered.filter(t => t.owner_ids?.includes(filterOwner))
  if (filterStatus !== 'all') filtered = filtered.filter(t => t.status === filterStatus)
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === 'due_date') return (a.due_date || '9999').localeCompare(b.due_date || '9999')
    return (b.updated_at || '').localeCompare(a.updated_at || '')
  })

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' }) : '-'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 p-4 lg:p-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-7 h-7 text-blue-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">업무 관리</h1>
            <p className="text-gray-400 text-sm">총 {filtered.length}건</p>
          </div>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition">
          <Plus className="w-4 h-4" /> 업무 추가
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm">
          <option value="all">전체 담당자</option>
          {consultants.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm">
          <option value="all">전체 상태</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm">
          <option value="due_date">마감일순</option>
          <option value="updated_at">최근 업데이트순</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                <th className="w-10 px-3 py-3"></th>
                <th className="text-left px-4 py-3 font-medium">날짜</th>
                <th className="text-left px-4 py-3 font-medium">업데이트</th>
                <th className="text-left px-4 py-3 font-medium">제안자</th>
                <th className="text-left px-4 py-3 font-medium">담당자</th>
                <th className="text-left px-4 py-3 font-medium">업무 내용</th>
                <th className="text-left px-4 py-3 font-medium">상태</th>
                <th className="text-left px-4 py-3 font-medium">마감일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500 text-sm">업무가 없습니다</td></tr>
              ) : filtered.map(task => (
                <tr key={task.id} onClick={() => openEdit(task)} className="hover:bg-gray-700/40 cursor-pointer transition">
                  <td className="px-3 py-3 text-center">
                    <button onClick={(e) => handleToggleDone(task, e)} className={`w-5 h-5 rounded border flex items-center justify-center transition ${task.status === 'done' ? 'bg-green-600 border-green-600' : 'border-gray-600 hover:border-blue-500'}`}>
                      {task.status === 'done' && <Check className="w-3 h-3 text-white" />}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(task.created_at)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(task.updated_at)}</td>
                  <td className="px-4 py-3 text-sm text-gray-300">{profiles[task.proposer_id]?.full_name || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(task.owner_ids || []).slice(0, 3).map(id => (
                        <span key={id} className="text-[10px] bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{profiles[id]?.full_name || '?'}</span>
                      ))}
                      {!task.owner_ids?.length && <span className="text-xs text-gray-500">-</span>}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-sm max-w-[250px] truncate ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <select value={task.status} onChange={(e) => handleStatusChange(task, e.target.value, e)} className={`text-xs px-2 py-1 rounded-full border ${statusColor(task.status)} bg-transparent cursor-pointer`}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(task.due_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white">{modal ? '업무 수정' : '새 업무'}</h2>
              <button onClick={() => { setShowNew(false); setModal(null); setForm(emptyTask) }} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">업무 내용 *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">제안자</label>
                  <select value={form.proposer_id} onChange={e => setForm(f => ({ ...f, proposer_id: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                    <option value="">선택</option>
                    {consultants.map(c => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">상태</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as Task['status'] }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">담당자 (복수 선택)</label>
                <div className="flex flex-wrap gap-2">
                  {consultants.map(c => (
                    <button key={c.id} type="button" onClick={() => {
                      setForm(f => ({ ...f, owner_ids: f.owner_ids.includes(c.id) ? f.owner_ids.filter(id => id !== c.id) : [...f.owner_ids, c.id] }))
                    }} className={`text-xs px-2.5 py-1 rounded-lg border transition ${form.owner_ids.includes(c.id) ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-600 text-gray-400 hover:border-blue-500'}`}>
                      {c.full_name || c.email}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">마감일</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">관련 학생</label>
                  <select value={form.student_id || ''} onChange={e => setForm(f => ({ ...f, student_id: e.target.value || null }))} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white">
                    <option value="">없음</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">메모</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={4} className="w-full bg-gray-900 border border-gray-600 rounded-xl px-3 py-2 text-sm text-white resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-700">
              <button onClick={() => { setShowNew(false); setModal(null); setForm(emptyTask) }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">취소</button>
              <button onClick={handleSave} disabled={!form.title.trim()} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-medium">
                {modal ? '저장' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
