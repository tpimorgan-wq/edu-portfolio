'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Schedule, Assignment } from '@/types'
import {
  Plus, Trash2, Save, X, Calendar, CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, Video, Paperclip, Download, Upload, Edit2,
} from 'lucide-react'

interface SchedulesTabProps {
  studentId: string
  userRole?: string
}

const emptyForm = {
  title: '',
  description: '',
  event_date: '',
  event_time: '',
  type: '',
  zoom_link: '',
  status: 'upcoming' as 'upcoming' | 'completed' | 'cancelled',
}

const EVENT_TYPES = ['수업', '상담', '시험', '제출 마감', '인터뷰', '학교 방문', '캠프', '행사', '기타']

const statusConfig = {
  upcoming: { label: '예정', color: 'bg-blue-900/40 text-blue-400 border-blue-700', dot: 'bg-blue-400', icon: <Clock className="w-3.5 h-3.5" /> },
  completed: { label: '완료', color: 'bg-green-900/40 text-green-400 border-green-700', dot: 'bg-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: '취소', color: 'bg-red-900/40 text-red-400 border-red-700', dot: 'bg-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
}

const assignmentStatusConfig = {
  todo: { label: '할 일', color: 'bg-orange-900/40 text-orange-400 border-orange-700', dot: 'bg-orange-400', icon: <Clock className="w-3.5 h-3.5" /> },
  in_progress: { label: '진행 중', color: 'bg-yellow-900/40 text-yellow-400 border-yellow-700', dot: 'bg-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
  done: { label: '완료', color: 'bg-green-900/40 text-green-400 border-green-700', dot: 'bg-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const days: { day: number; current: boolean; dateStr: string }[] = []

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i
    const m = month === 0 ? 12 : month
    const y = month === 0 ? year - 1 : year
    days.push({ day: d, current: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({
      day: d,
      current: true,
      dateStr: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }

  // Next month leading days
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let d = 1; d <= remaining; d++) {
      const m = month === 11 ? 1 : month + 2
      const y = month === 11 ? year + 1 : year
      days.push({ day: d, current: false, dateStr: `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
    }
  }

  return days
}

export default function SchedulesTab({ studentId, userRole }: SchedulesTabProps) {
  const canManage = userRole === 'admin' || userRole === 'consultant'
  const canEdit = true
  const today = new Date()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)
  const [detailSchedule, setDetailSchedule] = useState<Schedule | null>(null)
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null)
  const [editScheduleForm, setEditScheduleForm] = useState(emptyForm)
  const [editScheduleFile, setEditScheduleFile] = useState<File | null>(null)

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const fetchSchedules = async () => {
    try {
      const db = createClient()
      const [schedulesRes, assignmentsRes] = await Promise.all([
        db.from('schedules').select('*').eq('student_id', studentId).order('event_date', { ascending: true }),
        db.from('assignments').select('*').eq('student_id', studentId).order('due_date', { ascending: true }),
      ])
      setSchedules(schedulesRes.data || [])
      setAssignments(assignmentsRes.data || [])
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSchedules() }, [studentId])

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
    if (!form.title || !form.event_date) {
      setError('제목과 날짜는 필수입니다.')
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
    const insertData: Record<string, any> = {
      student_id: studentId,
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      type: form.type || null,
      zoom_link: form.zoom_link || null,
      status: form.status,
    }
    if (fileData) {
      insertData.file_url = fileData.url
      insertData.file_name = fileData.name
    }
    const { error: err } = await db.from('schedules').insert(insertData)
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setFileToUpload(null)
    setShowForm(false)
    fetchSchedules()
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: Schedule['status']) => {
    const db = createClient()
    await db.from('schedules').update({ status }).eq('id', id)
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  const handleAssignmentStatusChange = async (id: string, status: Assignment['status']) => {
    const db = createClient()
    await db.from('assignments').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, status } : a))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return
    const db = createClient()
    await db.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
    if (detailSchedule?.id === id) setDetailSchedule(null)
  }

  const handleStartEditSchedule = (s: Schedule) => {
    setEditingSchedule(s)
    setEditScheduleForm({
      title: s.title,
      description: s.description || '',
      event_date: s.event_date,
      event_time: s.event_time || '',
      type: s.type || '',
      zoom_link: s.zoom_link || '',
      status: s.status,
    })
    setEditScheduleFile(null)
    setDetailSchedule(null)
  }

  const handleUpdateSchedule = async () => {
    if (!editingSchedule || !editScheduleForm.title || !editScheduleForm.event_date) return
    setSaving(true)

    let fileData: { url: string; name: string } | null = null
    if (editScheduleFile) {
      setUploading(true)
      fileData = await uploadFile(editScheduleFile)
      setUploading(false)
      if (!fileData) { setError('파일 업로드에 실패했습니다.'); setSaving(false); return }
    }

    const db = createClient()
    const updateData: Record<string, any> = {
      title: editScheduleForm.title,
      description: editScheduleForm.description || null,
      event_date: editScheduleForm.event_date,
      event_time: editScheduleForm.event_time || null,
      type: editScheduleForm.type || null,
      zoom_link: editScheduleForm.zoom_link || null,
      status: editScheduleForm.status,
    }
    if (fileData) {
      updateData.file_url = fileData.url
      updateData.file_name = fileData.name
    }
    await db.from('schedules').update(updateData).eq('id', editingSchedule.id)
    setEditingSchedule(null)
    setEditScheduleFile(null)
    setSaving(false)
    fetchSchedules()
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentYear(y => y - 1); setCurrentMonth(11) }
    else setCurrentMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentYear(y => y + 1); setCurrentMonth(0) }
    else setCurrentMonth(m => m + 1)
  }
  const goToday = () => { setCurrentYear(today.getFullYear()); setCurrentMonth(today.getMonth()) }

  const calendarDays = getCalendarDays(currentYear, currentMonth)

  // Map date → events
  const eventsByDate: Record<string, Schedule[]> = {}
  for (const s of schedules) {
    if (!eventsByDate[s.event_date]) eventsByDate[s.event_date] = []
    eventsByDate[s.event_date].push(s)
  }

  // Map date → assignments by due_date
  const assignmentsByDate: Record<string, Assignment[]> = {}
  for (const a of assignments) {
    if (!assignmentsByDate[a.due_date]) assignmentsByDate[a.due_date] = []
    assignmentsByDate[a.due_date].push(a)
  }

  const handleDateClick = (dateStr: string) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null)
    } else {
      setSelectedDate(dateStr)
    }
  }

  const handleAddOnDate = (dateStr: string) => {
    setForm({ ...emptyForm, event_date: dateStr })
    setShowForm(true)
    setSelectedDate(null)
  }

  // Events and assignments for selected date
  const selectedDateEvents = selectedDate ? (eventsByDate[selectedDate] || []) : []
  const selectedDateAssignments = selectedDate ? (assignmentsByDate[selectedDate] || []) : []

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-400" />
          월별 일정
        </h3>
        {canEdit && (
          <button
            onClick={() => { setShowForm(!showForm); if (!showForm) setForm(emptyForm) }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
          >
            <Plus className="w-3.5 h-3.5" /> 추가
          </button>
        )}
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="bg-gray-750 border border-gray-600 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-white">일정 추가</h4>
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs text-gray-400 mb-1">제목 *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">날짜 *</label>
              <input
                type="date"
                value={form.event_date}
                onChange={e => setForm({ ...form, event_date: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">시간</label>
              <input
                type="time"
                value={form.event_time}
                onChange={e => setForm({ ...form, event_time: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">유형</label>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">선택</option>
                {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
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
            <div className="col-span-2 sm:col-span-3">
              <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Video className="w-3 h-3" /> 줌 링크
              </label>
              <input
                type="url"
                value={form.zoom_link}
                onChange={e => setForm({ ...form, zoom_link: e.target.value })}
                placeholder="https://zoom.us/j/..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h4 className="text-lg font-bold text-white min-w-[140px] text-center">
            {currentYear}년 {currentMonth + 1}월
          </h4>
          <button onClick={nextMonth} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <button onClick={goToday} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-lg transition">
          오늘
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
          일정
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" />
          과제 마감
        </span>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-750 rounded-xl border border-gray-700 overflow-hidden">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-700">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`text-center py-2 text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map((cell, idx) => {
            const events = eventsByDate[cell.dateStr] || []
            const dateAssignments = assignmentsByDate[cell.dateStr] || []
            const isToday = cell.dateStr === todayStr
            const isSelected = cell.dateStr === selectedDate
            const dayOfWeek = idx % 7
            const totalItems = events.length + dateAssignments.length
            const maxVisible = 2

            return (
              <button
                key={idx}
                onClick={() => handleDateClick(cell.dateStr)}
                className={`
                  relative min-h-[72px] sm:min-h-[88px] p-1 border-b border-r border-gray-700 text-left transition-colors
                  ${!cell.current ? 'opacity-30' : ''}
                  ${isSelected ? 'bg-blue-900/20 ring-1 ring-inset ring-blue-500' : 'hover:bg-gray-700/50'}
                `}
              >
                <span className={`
                  inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                  ${isToday ? 'bg-blue-600 text-white' : dayOfWeek === 0 ? 'text-red-400' : dayOfWeek === 6 ? 'text-blue-400' : 'text-gray-300'}
                `}>
                  {cell.day}
                </span>
                {totalItems > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {/* Render schedule events first, then assignments, up to maxVisible total */}
                    {(() => {
                      const items: React.ReactNode[] = []
                      let count = 0

                      for (const ev of events) {
                        if (count >= maxVisible) break
                        items.push(
                          <div
                            key={`s-${ev.id}`}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${statusConfig[ev.status].color}`}
                            onClick={e => { e.stopPropagation(); setDetailSchedule(ev) }}
                          >
                            {ev.title}
                          </div>
                        )
                        count++
                      }

                      for (const asn of dateAssignments) {
                        if (count >= maxVisible) break
                        items.push(
                          <div
                            key={`a-${asn.id}`}
                            className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${assignmentStatusConfig[asn.status].color}`}
                            onClick={e => { e.stopPropagation(); setSelectedDate(cell.dateStr) }}
                          >
                            {asn.title}
                          </div>
                        )
                        count++
                      }

                      return items
                    })()}
                    {totalItems > maxVisible && (
                      <div className="text-[10px] text-gray-500 px-1">+{totalItems - maxVisible}개</div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Selected Date Panel */}
      {selectedDate && (
        <div className="bg-gray-750 rounded-xl border border-gray-700 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-white">{selectedDate} 일정</h4>
            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  onClick={() => handleAddOnDate(selectedDate)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs transition"
                >
                  <Plus className="w-3 h-3" /> 일정 추가
                </button>
              )}
              <button
                onClick={() => setSelectedDate(null)}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Schedule Events Section */}
          {selectedDateEvents.length > 0 && (
            <div className="space-y-2">
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => setDetailSchedule(event)}
                  className="rounded-lg border border-gray-700 hover:border-gray-600 p-3 cursor-pointer transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{event.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${statusConfig[event.status].color}`}>
                          {statusConfig[event.status].icon}
                          {statusConfig[event.status].label}
                        </span>
                        {event.event_time && <span className="text-xs text-gray-400">{event.event_time.slice(0, 5)}</span>}
                        {event.type && <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{event.type}</span>}
                        {event.zoom_link && <Video className="w-3 h-3 text-blue-400" />}
                        {event.file_url && <Paperclip className="w-3 h-3 text-blue-400" />}
                      </div>
                    </div>
                    {canEdit && event.status === 'upcoming' && (
                      <button
                        onClick={e => { e.stopPropagation(); handleStatusChange(event.id, 'completed') }}
                        className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700 rounded-lg transition flex-shrink-0"
                        title="완료 처리"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Assignments Section */}
          {selectedDateAssignments.length > 0 && (
            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-orange-400 uppercase tracking-wide flex items-center gap-1.5 pt-1">
                <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                과제 마감
              </h5>
              {selectedDateAssignments.map(asn => (
                <div
                  key={asn.id}
                  className="rounded-lg border border-gray-700 hover:border-gray-600 p-3 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{asn.title}</div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${assignmentStatusConfig[asn.status].color}`}>
                          {assignmentStatusConfig[asn.status].icon}
                          {assignmentStatusConfig[asn.status].label}
                        </span>
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{asn.category}</span>
                      </div>
                      {asn.description && (
                        <p className="text-xs text-gray-400 mt-1.5 whitespace-pre-wrap">{asn.description}</p>
                      )}
                    </div>
                    {canEdit && asn.status !== 'done' && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {asn.status === 'todo' && (
                          <button
                            onClick={() => handleAssignmentStatusChange(asn.id, 'in_progress')}
                            className="p-1.5 text-gray-500 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition"
                            title="진행 중으로 변경"
                          >
                            <Clock className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleAssignmentStatusChange(asn.id, 'done')}
                          className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700 rounded-lg transition"
                          title="완료 처리"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {selectedDateEvents.length === 0 && selectedDateAssignments.length === 0 && (
            <p className="text-sm text-gray-500 py-2">이 날짜에 일정이 없습니다.</p>
          )}
        </div>
      )}

      {/* Schedule Detail Modal */}
      {detailSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setDetailSchedule(null)}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-white">{detailSchedule.title}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${statusConfig[detailSchedule.status].color}`}>
                    {statusConfig[detailSchedule.status].icon}
                    {statusConfig[detailSchedule.status].label}
                  </span>
                  {detailSchedule.type && (
                    <span className="text-xs bg-gray-700 text-gray-300 px-2.5 py-1 rounded-full">{detailSchedule.type}</span>
                  )}
                </div>
              </div>
              <button onClick={() => setDetailSchedule(null)} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info rows */}
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 w-16 flex-shrink-0">날짜</span>
                <span className="text-gray-200">{detailSchedule.event_date}</span>
              </div>
              {detailSchedule.event_time && (
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 w-16 flex-shrink-0">시간</span>
                  <span className="text-gray-200">{detailSchedule.event_time.slice(0, 5)}</span>
                </div>
              )}
              {detailSchedule.description && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">설명</span>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap bg-gray-750 rounded-lg p-3 border border-gray-700">{detailSchedule.description}</p>
                </div>
              )}
              {detailSchedule.zoom_link && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">줌 링크</span>
                  <a
                    href={detailSchedule.zoom_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
                  >
                    <Video className="w-4 h-4" />
                    줌 미팅 참여
                  </a>
                </div>
              )}
              {detailSchedule.file_url && detailSchedule.file_name && (
                <div>
                  <span className="text-gray-500 text-xs block mb-1">첨부 파일</span>
                  <button
                    onClick={() => handleDownload(detailSchedule.file_url!, detailSchedule.file_name!)}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-blue-400 rounded-lg text-sm transition border border-gray-600"
                  >
                    <Download className="w-4 h-4" />
                    {detailSchedule.file_name}
                  </button>
                </div>
              )}
            </div>

            {/* Action buttons */}
            {canManage && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-700">
                <button
                  onClick={() => handleStartEditSchedule(detailSchedule)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition"
                >
                  <Edit2 className="w-3.5 h-3.5" /> 수정
                </button>
                <button
                  onClick={() => { handleDelete(detailSchedule.id) }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm transition border border-red-800"
                >
                  <Trash2 className="w-3.5 h-3.5" /> 삭제
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Schedule Edit Modal */}
      {editingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setEditingSchedule(null); setEditScheduleFile(null) }}>
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg mx-4 p-6 space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">일정 수정</h3>
              <button onClick={() => { setEditingSchedule(null); setEditScheduleFile(null) }} className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-700 rounded-lg transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-red-400 text-xs">{error}</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">제목 *</label>
                <input type="text" value={editScheduleForm.title} onChange={e => setEditScheduleForm({ ...editScheduleForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">날짜 *</label>
                <input type="date" value={editScheduleForm.event_date} onChange={e => setEditScheduleForm({ ...editScheduleForm, event_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">시간</label>
                <input type="time" value={editScheduleForm.event_time} onChange={e => setEditScheduleForm({ ...editScheduleForm, event_time: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">유형</label>
                <select value={editScheduleForm.type} onChange={e => setEditScheduleForm({ ...editScheduleForm, type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">선택</option>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">상태</label>
                <select value={editScheduleForm.status} onChange={e => setEditScheduleForm({ ...editScheduleForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="upcoming">예정</option>
                  <option value="completed">완료</option>
                  <option value="cancelled">취소</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1">설명</label>
                <textarea value={editScheduleForm.description} onChange={e => setEditScheduleForm({ ...editScheduleForm, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Video className="w-3 h-3" /> 줌 링크
                </label>
                <input type="url" value={editScheduleForm.zoom_link} onChange={e => setEditScheduleForm({ ...editScheduleForm, zoom_link: e.target.value })}
                  placeholder="https://zoom.us/j/..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Paperclip className="w-3 h-3" /> 파일 첨부 (PDF)
                </label>
                <div className="flex items-center gap-2">
                  {editingSchedule.file_url && !editScheduleFile && (
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" /> {editingSchedule.file_name || '첨부 파일'}
                    </span>
                  )}
                  <label className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs cursor-pointer transition border border-gray-600">
                    <Upload className="w-3 h-3" />
                    {editScheduleFile ? editScheduleFile.name : (editingSchedule.file_url ? '파일 변경' : '파일 선택')}
                    <input type="file" accept=".pdf" className="hidden" onChange={e => setEditScheduleFile(e.target.files?.[0] || null)} />
                  </label>
                  {editScheduleFile && (
                    <button onClick={() => setEditScheduleFile(null)} className="p-1 text-gray-500 hover:text-red-400 transition">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2 border-t border-gray-700">
              <button onClick={() => { setEditingSchedule(null); setEditScheduleFile(null) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm transition">
                <X className="w-3.5 h-3.5" /> 취소
              </button>
              <button onClick={handleUpdateSchedule} disabled={saving || uploading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm transition">
                <Save className="w-3.5 h-3.5" /> {uploading ? '업로드 중...' : saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
