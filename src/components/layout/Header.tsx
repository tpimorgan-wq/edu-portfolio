'use client'

import { useRouter } from 'next/navigation'
import { Menu, LogOut, User, Bell } from 'lucide-react'
import { signOut } from '@/lib/firebase/auth'
import { Profile } from '@/types'

interface HeaderProps {
  profile: Profile
  onMenuToggle: () => void
}

export default function Header({ profile, onMenuToggle }: HeaderProps) {
  const router = useRouter()

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
        <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition">
          <Bell className="w-5 h-5" />
        </button>

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
