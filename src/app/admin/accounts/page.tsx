'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { Profile, UserRole } from '@/types'
import { getTokenFromCookie, setSessionCookies } from '@/lib/firebase/auth'
import { getClientAuth } from '@/lib/firebase/config'
import { Plus, X, Users, Trash2, Search, Shield, User, UserCheck } from 'lucide-react'

interface CreateUserForm {
  email: string
  password: string
  full_name: string
  role: UserRole
  phone: string
}

const emptyForm: CreateUserForm = {
  email: '',
  password: '',
  full_name: '',
  role: 'consultant',
  phone: '',
}

async function getFreshToken(): Promise<string | null> {
  const auth = getClientAuth()
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken(true)
    setSessionCookies(token)
    return token
  }
  return getTokenFromCookie()
}

export default function AccountsPage() {
  const router = useRouter()
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [filtered, setFiltered] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateUserForm>(emptyForm)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const fetchProfiles = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
      setProfiles(data || [])
      setFiltered(data || [])
    } catch (err) {
      console.error('Failed to fetch profiles:', err)
    }
  }

  useEffect(() => {
    const init = async () => {
      const session = getSessionFromCookies()
      if (!session) { router.push('/login'); return }

      const supabase = createClient()
      const { data: prof } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.userId)
        .single()

      if (!prof || prof.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      await fetchProfiles()
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    let result = profiles
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(p =>
        (p.full_name || '').toLowerCase().includes(s) ||
        p.email.toLowerCase().includes(s)
      )
    }
    if (roleFilter !== 'all') {
      result = result.filter(p => p.role === roleFilter)
    }
    setFiltered(result)
  }, [search, roleFilter, profiles])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setSuccess(null)

    try {
      await getFreshToken()
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '계정 생성에 실패했습니다.')
        setCreating(false)
        return
      }

      setSuccess(`${form.full_name || form.email} 계정이 생성되었습니다.`)
      setForm(emptyForm)
      setShowForm(false)
      await fetchProfiles()
    } catch (err) {
      setError('서버 오류가 발생했습니다.')
    }

    setCreating(false)
  }

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`${profile.full_name || profile.email} 계정을 삭제하시겠습니까?`)) return
    try {
      await getFreshToken()
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || '삭제에 실패했습니다.')
        return
      }
      setProfiles(prev => prev.filter(p => p.id !== profile.id))
      setSuccess(`${profile.full_name || profile.email} 계정이 삭제되었습니다.`)
    } catch {
      alert('서버 오류가 발생했습니다.')
    }
  }

  const roleConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    admin: { label: '관리자', color: 'bg-purple-900/40 text-purple-400 border border-purple-700', icon: <Shield className="w-3 h-3" /> },
    consultant: { label: '컨설턴트', color: 'bg-blue-900/40 text-blue-400 border border-blue-700', icon: <UserCheck className="w-3 h-3" /> },
    parent: { label: '학부모', color: 'bg-green-900/40 text-green-400 border border-green-700', icon: <User className="w-3 h-3" /> },
    student: { label: '학생', color: 'bg-cyan-900/40 text-cyan-400 border border-cyan-700', icon: <User className="w-3 h-3" /> },
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <svg className="animate-spin w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">계정 관리</h1>
          <p className="text-gray-400 text-sm mt-1">총 {filtered.length}개 계정</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setError(null); setSuccess(null) }}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">계정 생성</span>
        </button>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-green-900/30 border border-green-700 rounded-xl px-4 py-3 text-green-400 text-sm flex items-center justify-between">
          {success}
          <button onClick={() => setSuccess(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">새 계정 생성</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  이메일 <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  비밀번호 <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  placeholder="최소 8자"
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">이름</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={e => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">전화번호</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  역할 <span className="text-red-400">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="admin">관리자</option>
                  <option value="consultant">컨설턴트</option>
                  <option value="parent">학부모</option>
                  <option value="student">학생</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(emptyForm); setError(null) }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-medium transition"
              >
                <X className="w-4 h-4" /> 취소
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white rounded-xl text-sm font-medium transition"
              >
                {creating ? '생성 중...' : '계정 생성'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름, 이메일 검색..."
            className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">전체 역할</option>
          <option value="admin">관리자</option>
          <option value="consultant">컨설턴트</option>
          <option value="parent">학부모</option>
          <option value="student">학생</option>
        </select>
      </div>

      {/* Account List */}
      {filtered.length === 0 ? (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-16 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">계정이 없습니다</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
          <div className="divide-y divide-gray-700">
            {filtered.map(profile => (
              <div key={profile.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-700/30 transition">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gray-700 flex items-center justify-center font-semibold text-gray-300 flex-shrink-0">
                    {(profile.full_name || profile.email)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">
                      {profile.full_name || '이름 없음'}
                    </div>
                    <div className="text-xs text-gray-400 truncate">{profile.email}</div>
                    {profile.phone && (
                      <div className="text-xs text-gray-500">{profile.phone}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                  <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${roleConfig[profile.role].color}`}>
                    {roleConfig[profile.role].icon}
                    {roleConfig[profile.role].label}
                  </span>
                  <button
                    onClick={() => handleDelete(profile)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-700 rounded-lg transition"
                    title="계정 삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
