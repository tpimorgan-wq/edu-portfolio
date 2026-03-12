'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { createClient } from '@/lib/firebase/db'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const redirect = async () => {
      const session = getSessionFromCookies()
      if (!session) {
        router.push('/login')
        return
      }

      const db = createClient()
      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', session.userId)
        .single()

      if (!profile) {
        router.push('/login')
        return
      }

      if (profile.role === 'parent') {
        const { data: student } = await db
          .from('students')
          .select('id')
          .eq('parent_id', session.userId)
          .single()
        if (student) {
          router.push(`/students/${student.id}`)
          return
        }
      }

      router.push('/dashboard')
    }

    redirect()
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <svg className="animate-spin w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}
