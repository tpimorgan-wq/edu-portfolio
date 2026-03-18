'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Eye, EyeOff } from 'lucide-react'
import { signInWithPassword, setSessionCookies } from '@/lib/firebase/auth'
import { createClient } from '@/lib/firebase/db'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('saved_email')
    if (saved) {
      setEmail(saved)
      setRememberMe(true)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (rememberMe) {
      localStorage.setItem('saved_email', email)
    } else {
      localStorage.removeItem('saved_email')
    }

    const { userId, token, error: signInError } = await signInWithPassword(email, password)

    if (signInError || !userId) {
      setError(`Sign in failed: ${signInError}`)
      setLoading(false)
      return
    }

    setSessionCookies(token)

    const db = createClient()
    let { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()

    // Auto-create profile if missing (first admin login)
    if (!profile) {
      const { data: newProfile } = await db
        .from('profiles')
        .insert({
          id: userId,
          email,
          full_name: '',
          role: 'parent',
        })
        .select('role')
        .single()
      profile = newProfile
    }

    if (profile?.role === 'parent') {
      const { data: student } = await db
        .from('students')
        .select('id')
        .eq('parent_id', userId)
        .single()

      if (student) {
        router.push(`/students/${student.id}`)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/icon-192.png" alt="Logo" className="w-20 h-20 rounded-2xl mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-[#F5E6C8] mb-4">Education Consultant Association</h2>
          <h1 className="text-xl font-bold text-white whitespace-nowrap">Education Portfolio Management System</h1>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl border border-gray-700">
          <h2 className="text-xl font-semibold text-[#F5E6C8] mb-6">Sign In</h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="info@santacroce.co.kr"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-12 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-300">아이디 저장</span>
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${rememberMe ? 'bg-[#C8A96E]' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${rememberMe ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#C8A96E] hover:bg-[#A8894E] disabled:bg-[#C8A96E]/50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition duration-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Don't have an account? Please contact your administrator.
        </p>
      </div>
    </div>
  )
}
