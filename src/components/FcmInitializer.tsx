'use client'

import { useEffect, useRef, useState } from 'react'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import NotificationPermissionModal from './NotificationPermissionModal'

export default function FcmInitializer() {
  const initialized = useRef(false)
  const [showModal, setShowModal] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const session = getSessionFromCookies()
    if (!session) return

    setUserId(session.userId)

    // Check browser support
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      return
    }

    // Already granted — silently register token
    if (Notification.permission === 'granted') {
      registerToken(session.userId)
      return
    }

    // Already asked before — don't show modal again
    if (localStorage.getItem('notification_asked') === 'true') {
      return
    }

    // Permission is 'default' and never asked — show modal after short delay
    if (Notification.permission === 'default') {
      const timer = setTimeout(() => setShowModal(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const registerToken = async (uid: string) => {
    try {
      const { requestFcmToken } = await import('@/lib/firebase/fcm')
      await requestFcmToken(uid)
    } catch {
      // ignore
    }
  }

  const handleGranted = () => {
    setShowModal(false)
    if (userId && Notification.permission === 'granted') {
      registerToken(userId)
    }
  }

  if (!showModal) return null

  return <NotificationPermissionModal onGranted={handleGranted} />
}
