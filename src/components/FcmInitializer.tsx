'use client'

import { useEffect, useRef, useState } from 'react'
import { getSessionFromCookies } from '@/lib/firebase/auth'
import { X } from 'lucide-react'

export default function FcmInitializer() {
  const initialized = useRef(false)
  const [bannerState, setBannerState] = useState<'hidden' | 'denied' | 'unsupported'>('hidden')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const session = getSessionFromCookies()
    if (!session) return

    // Check browser support
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setBannerState('unsupported')
      return
    }

    // If already denied, show banner immediately
    if (Notification.permission === 'denied') {
      setBannerState('denied')
      return
    }

    // If already granted, silently register token
    if (Notification.permission === 'granted') {
      registerToken(session.userId)
      return
    }

    // Permission is 'default' — request it after short delay
    const timer = setTimeout(() => {
      requestAndRegister(session.userId)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  const requestAndRegister = async (userId: string) => {
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setBannerState('hidden')
        await registerToken(userId)
      } else {
        setBannerState('denied')
      }
    } catch {
      setBannerState('denied')
    }
  }

  const registerToken = async (userId: string) => {
    try {
      const { requestFcmToken } = await import('@/lib/firebase/fcm')
      await requestFcmToken(userId)
    } catch {
      // ignore
    }
  }

  if (dismissed || bannerState === 'hidden') return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-yellow-900/95 border-b border-yellow-700 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
        <p className="text-yellow-200 text-sm flex-1">
          {bannerState === 'unsupported'
            ? '이 브라우저는 푸시 알림을 지원하지 않습니다. Chrome 또는 Edge를 사용해주세요.'
            : '알림이 차단되어 있습니다. 브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하여 알림을 허용해주세요.'}
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 text-yellow-400 hover:text-yellow-200 rounded-lg transition flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
