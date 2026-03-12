'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/firebase/db'
import { Schedule } from '@/types'
import {
  Plus, Trash2, Save, X, Calendar, CheckCircle, Clock, XCircle,
  ChevronLeft, ChevronRight, Video,
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

const EVENT_TYPES = ['상담', '시험', '제출 마감', '인터뷰', '학교 방문', '캠프', '행사', '기타']

const statusConfig = {
  upcoming: { label: '예정', color: 'bg-blue-900/40 text-blue-400 border-blue-700', dot: 'bg-blue-400', icon: <Clock className="w-3.5 h-3.5" /> },
  completed: { label: '완료', color: 'bg-green-900/40 text-green-400 border-green-700', dot: 'bg-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { label: '취소', color: 'bg-red-900/40 text-red-400 border-red-700', dot: 'bg-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
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
  const canEdit = true
  const today = new Date()
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Schedule | null>(null)

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const fetchSchedules = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .eq('student_id', studentId)
        .order('event_date', { ascending: true })
      setSchedules(data || [])
    } catch (err) {
      console.error('Failed to fetch schedules:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSchedules() }, [studentId])

  const handleAdd = async () => {
    if (!form.title || !form.event_date) {
      setError('제목과 날짜는 필수입니다.')
      return
    }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase.from('schedules').insert({
      student_id: studentId,
      title: form.title,
      description: form.description || null,
      event_date: form.event_date,
      event_time: form.event_time || null,
      type: form.type || null,
      zoom_link: form.zoom_link || null,
      status: form.status,
    })
    if (err) { setError(err.message); setSaving(false); return }
    setForm(emptyForm)
    setShowForm(false)
    fetchSchedules()
    setSaving(false)
  }

  const handleStatusChange = async (id: string, status: Schedule['status']) => {
    const supabase = createClient()
    await supabase.from('schedules').update({ status }).eq('id', id)
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, status } : s))
    if (selectedEvent?.id === id) setSelectedEvent({ ...selectedEvent, status })
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 일정을 삭제하시겠습니까?')) return
    const supabase = createClient()
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
    if (selectedEvent?.id === id) setSelectedEvent(null)
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

  const handleDateClick = (dateStr: string) => {
    setSelectedEvent(null)
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

  // Events for selected date
  const selectedDateEvents = selectedDate ? (eventsByDate[selectedDate] || []) : []

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
            const isToday = cell.dateStr === todayStr
            const isSelected = cell.dateStr === selectedDate
            const dayOfWeek = idx % 7

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
                {events.length > 0 && (
                  <div className="mt-0.5 space-y-0.5">
                    {events.slice(0, 2).map(ev => (
                      <div
                        key={ev.id}
                        className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate cursor-pointer ${statusConfig[ev.status].color}`}
                        onClick={e => { e.stopPropagation(); setSelectedEvent(ev); setSelectedDate(cell.dateStr) }}
                      >
                        {ev.title}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-[10px] text-gray-500 px-1">+{events.length - 2}개</div>
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
                onClick={() => { setSelectedDate(null); setSelectedEvent(null) }}
                className="p-1 text-gray-500 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-gray-500 py-2">이 날짜에 일정이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
                  className={`rounded-lg border p-3 cursor-pointer transition ${
                    selectedEvent?.id === event.id
                      ? 'border-blue-500 bg-blue-900/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
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
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {event.status === 'upcoming' && (
                          <button
                            onClick={e => { e.stopPropagation(); handleStatusChange(event.id, 'completed') }}
                            className="p-1.5 text-gray-500 hover:text-green-400 hover:bg-gray-700 rounded-lg transition"
                            title="완료 처리"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); handleDelete(event.id) }}
                          className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded detail */}
                  {selectedEvent?.id === event.id && (event.description || event.zoom_link) && (
                    <div className="mt-2 pt-2 border-t border-gray-700 space-y-2">
                      {event.description && (
                        <p className="text-xs text-gray-400 whitespace-pre-wrap">{event.description}</p>
                      )}
                      {event.zoom_link && (
                        <a
                          href={event.zoom_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition"
                        >
                          <Video className="w-4 h-4" />
                          줌 미팅 참여
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
