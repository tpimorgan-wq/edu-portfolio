'use client'

import { useEffect, useRef } from 'react'
import { getSessionFromCookies } from '@/lib/firebase/auth'

export default function FcmInitializer() {
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const session = getSessionFromCookies()
    if (!session) return

    // Delay FCM init to not block page load
    const timer = setTimeout(async () => {
      try {
        const { requestFcmToken } = await import('@/lib/firebase/fcm')
        await requestFcmToken(session.userId)
      } catch {
        // ignore
      }
    }, 3000)

    return () => clearTimeout(timer)
  }, [])

  return null
}
