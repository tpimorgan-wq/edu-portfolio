'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  X,
  ChevronRight,
  AlertTriangle,
  ClipboardList,
  Bell,
  MessageSquare,
  Calendar,
} from 'lucide-react'
import { UserRole, Notification, Schedule } from '@/types'
import { createClient } from '@/lib/firebase/db'

interface SidebarProps {
  role: UserRole
  userId: string
  isOpen: boolean
  onClose: () => void
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: UserRole[]
}

interface DeadlineAssignment {
  id: string
  title: string
  due_date: string
  status: string
  student_id: string
  student_name?: string
}

const navItems: NavItem[] = [
  {
    label: '대시보드',
    href: '/dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    roles: ['admin', 'consultant', 'parent', 'student'],
  },
  {
    label: '학생 목록',
    href: '/students',
    icon: <Users className="w-5 h-5" />,
    roles: ['admin', 'consultant'],
  },
  {
    label: '메시지',
    href: '/messages',
    icon: <MessageSquare className="w-5 h-5" />,
    roles: ['admin', 'consultant', 'parent', 'student'],
  },
  {
    label: '계정 관리',
    href: '/admin/accounts',
    icon: <UserCog className="w-5 h-5" />,
    roles: ['admin'],
  },
]

function getThisWeekRange(): { weekStart: string; weekEnd: string } {
  const now = new Date()
  const day = now.getDay() // 0=Sun
  const diffToMonday = day === 0 ? -6 : 1 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diffToMonday)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  return { weekStart: fmt(monday), weekEnd: fmt(sunday) }
}

function getDaysLeft(dueDate: string): number {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export default function Sidebar({ role, userId, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const [deadlines, setDeadlines] = useState<DeadlineAssignment[]>([])
  const [weekSchedules, setWeekSchedules] = useState<(Schedule & { student_name?: string })[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  const visibleItems = navItems.filter((item) => item.roles.includes(role))

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  useEffect(() => {
    const fetchDeadlines = async () => {
      try {
        const db = createClient()

        // Fetch students visible to this user
        let studentIds: string[] = []
        if (role === 'admin') {
          const { data: students } = await db.from('students').select('id, name')
          if (students) {
            studentIds = students.map((s: any) => s.id)
            // Store name map for later
            var studentMap: Record<string, string> = {}
            for (const s of students) studentMap[s.id] = (s as any).name
          }
        } else if (role === 'consultant') {
          // Fetch students where this consultant is main or in consultant_ids
          const { data: allStudents } = await db.from('students').select('id, name, main_consultant_id, consultant_ids')
          const students = (allStudents || []).filter((s: any) =>
            s.main_consultant_id === userId || (s.consultant_ids && s.consultant_ids.includes(userId))
          )
          if (students.length > 0) {
            studentIds = students.map((s: any) => s.id)
            var studentMap: Record<string, string> = {}
            for (const s of students) studentMap[s.id] = (s as any).name
          }
        } else if (role === 'student') {
          // student: match by user_id first, fallback to name matching
          const { data: students } = await db.from('students').select('id, name').eq('user_id', userId)
          if (students && students.length > 0) {
            studentIds = students.map((s: any) => s.id)
            var studentMap: Record<string, string> = {}
            for (const s of students) studentMap[s.id] = (s as any).name
          } else {
            // fallback: match profile full_name to student name
            const { data: profile } = await db.from('profiles').select('full_name').eq('id', userId).single()
            if (profile?.full_name) {
              const { data: matched } = await db.from('students').select('id, name').eq('name', profile.full_name)
              if (matched && matched.length > 0) {
                studentIds = matched.map((s: any) => s.id)
                var studentMap: Record<string, string> = {}
                for (const s of matched) studentMap[s.id] = (s as any).name
              }
            }
          }
        } else {
          // parent
          const { data: students } = await db.from('students').select('id, name').eq('parent_id', userId)
          if (students) {
            studentIds = students.map((s: any) => s.id)
            var studentMap: Record<string, string> = {}
            for (const s of students) studentMap[s.id] = (s as any).name
          }
        }

        if (!studentIds.length) return

        // Fetch incomplete assignments for all visible students
        const allAssignments: DeadlineAssignment[] = []
        for (const sid of studentIds) {
          const { data } = await db
            .from('assignments')
            .select('*')
            .eq('student_id', sid)
            .order('due_date', { ascending: true })
          if (data) {
            for (const a of data) {
              if (a.status === 'done') continue
              allAssignments.push({
                ...a,
                student_name: studentMap![sid] || '',
              })
            }
          }
        }

        // Sort by due_date and take top 5
        allAssignments.sort((a, b) => a.due_date.localeCompare(b.due_date))
        setDeadlines(allAssignments.slice(0, 5))

        // Fetch this week's schedules for student/parent
        if (role === 'student' || role === 'parent') {
          const { weekStart, weekEnd } = getThisWeekRange()
          const allSchedules: (Schedule & { student_name?: string })[] = []
          for (const sid of studentIds) {
            const { data } = await db.from('schedules').select('*')
              .eq('student_id', sid).gte('event_date', weekStart)
              .order('event_date', { ascending: true })
            if (data) {
              for (const s of data) {
                if (s.event_date <= weekEnd && s.status !== 'cancelled') {
                  allSchedules.push({ ...s, student_name: studentMap![sid] || '' })
                }
              }
            }
          }
          allSchedules.sort((a, b) => a.event_date.localeCompare(b.event_date) || (a.event_time || '').localeCompare(b.event_time || ''))
          setWeekSchedules(allSchedules)
        }
      } catch (err) {
        console.error('Failed to fetch deadline assignments:', err)
      }
    }

    fetchDeadlines()
  }, [role, userId])

  // Fetch unread message count + 60s polling
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      try {
        const db = createClient()
        const { data } = await db
          .from('messages')
          .select('id, is_read')
          .eq('receiver_id', userId)
        if (data) {
          setUnreadMsgCount(data.filter((m: any) => !m.is_read).length)
        }
      } catch (err) {
        console.error('Failed to fetch unread messages:', err)
      }
    }
    fetchUnreadMessages()
    const interval = setInterval(fetchUnreadMessages, 60000)
    return () => clearInterval(interval)
  }, [userId])

  // Fetch unread notifications for admin/consultant
  useEffect(() => {
    if (role !== 'admin' && role !== 'consultant') return
    const fetchNotifications = async () => {
      try {
        const db = createClient()
        const { data } = await db
          .from('notifications')
          .select('*')
          .eq('recipient_id', userId)
          .eq('read', false)
          .order('created_at', { ascending: false })
        setNotifications((data || []).slice(0, 10))
      } catch (err) {
        console.error('Failed to fetch notifications:', err)
      }
    }
    fetchNotifications()
  }, [role, userId])

  const markAsRead = async (id: string) => {
    const db = createClient()
    await db.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gray-800 border-r border-gray-700 z-30
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-700">
          <Link href="/dashboard" className="flex items-center gap-3">
            <img src="/icon-192.png" alt="산타크로체 에듀펌" className="w-9 h-9 rounded-xl flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-white leading-tight">산타크로체 에듀펌</div>
              <div className="text-xs text-gray-400">컨설팅 포트폴리오 관리</div>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden text-gray-400 hover:text-white transition p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-5 py-3 border-b border-gray-700">
          <span className={`
            inline-block px-2 py-1 rounded text-xs font-medium
            ${role === 'admin' ? 'bg-purple-900/50 text-purple-300 border border-purple-700' :
              role === 'consultant' ? 'bg-blue-900/50 text-blue-300 border border-blue-700' :
              role === 'student' ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700' :
              'bg-green-900/50 text-green-300 border border-green-700'}
          `}>
            {role === 'admin' ? '관리자' : role === 'consultant' ? '컨설턴트' : role === 'student' ? '학생' : '학부모'}
          </span>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4">
          <ul className="space-y-1">
            {visibleItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                    ${isActive(item.href)
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-900/50'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  {item.icon}
                  <span className="flex-1">{item.label}</span>
                  {item.href === '/messages' && unreadMsgCount > 0 && (
                    <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">{unreadMsgCount}</span>
                  )}
                  {isActive(item.href) && <ChevronRight className="w-4 h-4 opacity-70" />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Weekly Schedule (student/parent) */}
        {weekSchedules.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-semibold text-gray-300">이번 주 일정</span>
            </div>
            <div className="space-y-2">
              {Object.entries(
                weekSchedules.reduce<Record<string, (Schedule & { student_name?: string })[]>>((groups, s) => {
                  const d = new Date(s.event_date + 'T00:00:00')
                  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
                  const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} (${dayNames[d.getDay()]})`
                  if (!groups[key]) groups[key] = []
                  groups[key].push(s)
                  return groups
                }, {})
              ).map(([day, items]) => (
                <div key={day}>
                  <div className="text-[10px] font-medium text-gray-500 mb-1">{day}</div>
                  <div className="space-y-1">
                    {items.map(s => (
                      <div key={s.id} className="px-2 py-1.5 bg-cyan-900/10 border border-cyan-900/30 rounded-lg">
                        <div className="text-[11px] text-white font-medium truncate">{s.title}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          {s.event_time && <span className="text-[10px] text-gray-400">{s.event_time.slice(0, 5)}</span>}
                          {s.student_name && <span className="text-[10px] text-gray-500">· {s.student_name}</span>}
                        </div>
                        {s.zoom_link && (
                          <a href={s.zoom_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline mt-0.5 inline-block">Zoom 참여</a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Update Notifications (admin/consultant only) */}
        {notifications.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-gray-300">학생 업데이트</span>
              <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full font-bold">{notifications.length}</span>
            </div>
            <div className="space-y-1.5">
              {notifications.map(n => (
                <div key={n.id} className="flex items-start gap-2 px-2 py-1.5 bg-blue-900/10 border border-blue-900/30 rounded-lg">
                  <Link
                    href={`/students/${n.student_id}`}
                    onClick={onClose}
                    className="flex-1 min-w-0"
                  >
                    <div className="text-[11px] text-white"><span className="font-medium">{n.updater_name}</span>님이 업데이트</div>
                    <div className="text-[10px] text-gray-400 truncate">{n.student_name} · {n.tab_name}</div>
                  </Link>
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-gray-500 hover:text-white p-0.5 flex-shrink-0"
                    title="읽음 처리"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadline Assignments */}
        {deadlines.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-700 flex-1 overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-bold text-white">마감 임박 과제</span>
            </div>
            <div className="space-y-2">
              {deadlines.map(a => {
                const days = getDaysLeft(a.due_date)
                let urgencyColor = 'text-gray-400'
                let urgencyBg = ''
                if (days <= 0) { urgencyColor = 'text-red-400'; urgencyBg = 'bg-red-900/20 border-red-900/40' }
                else if (days <= 7) { urgencyColor = 'text-red-400'; urgencyBg = 'bg-red-900/10 border-red-900/30' }
                else if (days <= 14) { urgencyColor = 'text-yellow-400'; urgencyBg = 'bg-yellow-900/10 border-yellow-900/30' }
                else { urgencyBg = 'border-gray-700' }

                return (
                  <Link
                    key={a.id}
                    href={`/students/${a.student_id}`}
                    onClick={onClose}
                    className={`block px-3 py-2 rounded-lg border text-left transition hover:bg-gray-700/50 ${urgencyBg}`}
                  >
                    <div className="text-xs font-medium text-white truncate">{a.title}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500 truncate max-w-[80px]">{a.student_name}</span>
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${urgencyColor}`}>
                        {days <= 0 && <AlertTriangle className="w-3 h-3" />}
                        {days < 0 ? `${Math.abs(days)}일 지남` : days === 0 ? '오늘 마감' : `${days}일 남음`}
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </aside>
    </>
  )
}
