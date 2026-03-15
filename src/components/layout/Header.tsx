'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Menu, LogOut, User, Bell, Check } from 'lucide-react'
import { signOut } from '@/lib/firebase/auth'
import { createClient } from '@/lib/firebase/db'
import { Profile } from '@/types'

interface PushNotification {
  id: string
  user_id: string
  title: string
  body: string
  type: string
  read: boolean
  created_at: string
}

interface HeaderProps {
  profile: Profile
  onMenuToggle: () => void
}

export default function Header({ profile, onMenuToggle }: HeaderProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<PushNotification[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [profile.id])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    try {
      const db = createClient()
      const { data } = await db
        .from('push_notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
      if (data && Array.isArray(data)) {
        setNotifications(data.slice(0, 20) as PushNotification[])
      }
    } catch {
      // ignore
    }
  }

  const handleMarkAsRead = async (notifId: string) => {
    try {
      const db = createClient()
      await db.from('push_notifications').update({ read: true }).eq('id', notifId)
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, read: true } : n))
    } catch {
      // ignore
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read)
      const db = createClient()
      await Promise.all(
        unread.map(n => db.from('push_notifications').update({ read: true }).eq('id', n.id))
      )
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    } catch {
      // ignore
    }
  }

  const handleLogout = async () => {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel: Record<string, string> = {
    admin: '관리자',
    consultant: '컨설턴트',
    parent: '학부모',
    student: '학생',
  }

  const roleColor: Record<string, string> = {
    admin: 'text-purple-400',
    consultant: 'text-blue-400',
    parent: 'text-green-400',
    student: 'text-yellow-400',
  }

  const currentRoleLabel = roleLabel[profile.role]
  const currentRoleColor = roleColor[profile.role]

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return '방금'
    if (diffMin < 60) return `${diffMin}분 전`
    const diffHr = Math.floor(diffMin / 60)
    if (diffHr < 24) return `${diffHr}시간 전`
    const diffDay = Math.floor(diffHr / 24)
    if (diffDay < 7) return `${diffDay}일 전`
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  return (
    <header className="h-16 bg-gray-800 border-b border-gray-700 px-4 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-white hidden sm:block">
          산타크로체 에듀펌
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Bell Notification */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => { setShowDropdown(!showDropdown); if (!showDropdown) fetchNotifications() }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-bold text-white">알림</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition"
                  >
                    <Check className="w-3 h-3" />
                    모두 읽음
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto divide-y divide-gray-700/50">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    알림이 없습니다
                  </div>
                ) : (
                  notifications.map(n => (
                    <button
                      key={n.id}
                      onClick={() => handleMarkAsRead(n.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-700/50 transition ${
                        !n.read ? 'bg-blue-900/10' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && (
                          <span className="mt-1.5 w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                        <div className={`flex-1 ${n.read ? 'pl-4' : ''}`}>
                          <p className={`text-sm leading-snug ${n.read ? 'text-gray-400' : 'text-white font-medium'}`}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                          )}
                          <p className="text-[11px] text-gray-600 mt-1">{formatTime(n.created_at)}</p>
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-gray-700 rounded-xl">
          <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-gray-300" />
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-medium text-white leading-none">
              {profile.full_name || profile.email.split('@')[0]}
            </div>
            <div className={`text-xs mt-0.5 ${currentRoleColor}`}>{currentRoleLabel}</div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
          title="로그아웃"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}
