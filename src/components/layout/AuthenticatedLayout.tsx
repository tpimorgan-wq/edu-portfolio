'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Header from '@/components/layout/Header'
import { createClient } from '@/lib/firebase/db'
import { getSessionFromCookies, refreshTokenIfNeeded } from '@/lib/firebase/auth'
import { Profile } from '@/types'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      try {
        // 1. Refresh token first if it's about to expire
        await refreshTokenIfNeeded()

        // 2. Check session after refresh
        const session = getSessionFromCookies()
        if (!session) {
          setLoading(false)
          router.push('/login')
          return
        }

        // 3. Fetch profile from Firestore
        const db = createClient()
        const { data: profileData } = await db
          .from('profiles')
          .select('*')
          .eq('id', session.userId)
          .single()

        if (!profileData) {
          setLoading(false)
          router.push('/login')
          return
        }

        setProfile(profileData)
      } catch (err: any) {
        console.error('Failed to fetch profile:', err)

        // Permission denied — try refreshing token once more
        if (err?.code === 'permission-denied') {
          try {
            const refreshed = await refreshTokenIfNeeded()
            if (refreshed) {
              // Retry fetch with fresh token
              const session = getSessionFromCookies()
              if (session) {
                const db = createClient()
                const { data: retryData } = await db
                  .from('profiles')
                  .select('*')
                  .eq('id', session.userId)
                  .single()
                if (retryData) {
                  setProfile(retryData)
                  setLoading(false)
                  return
                }
              }
            }
          } catch {
            // Retry also failed
          }
          document.cookie = 'fb-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        }

        setLoading(false)
        router.push('/login')
        return
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [router])

  // Periodic token refresh (every 5 minutes)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshTokenIfNeeded()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="animate-spin w-10 h-10 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!profile) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <svg className="animate-spin w-10 h-10 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-gray-400">로딩 중...</p>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-gray-900 overflow-hidden">
      <Sidebar
        role={profile.role}
        userId={profile.id}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          profile={profile}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
