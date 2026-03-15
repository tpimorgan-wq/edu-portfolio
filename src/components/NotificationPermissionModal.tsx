'use client'

import { useState } from 'react'
import { Bell, CheckCircle, AlertTriangle } from 'lucide-react'

interface Props {
  onGranted: () => void
}

export default function NotificationPermissionModal({ onGranted }: Props) {
  const [state, setState] = useState<'prompt' | 'requesting' | 'denied'>('prompt')

  const handleAllow = async () => {
    setState('requesting')
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        localStorage.setItem('notification_asked', 'true')
        onGranted()
      } else {
        setState('denied')
        localStorage.setItem('notification_asked', 'true')
      }
    } catch {
      setState('denied')
      localStorage.setItem('notification_asked', 'true')
    }
  }

  const handleDeniedConfirm = () => {
    onGranted()
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md text-center">
        <div className="p-8 space-y-6">
          {state === 'denied' ? (
            <>
              <div className="w-16 h-16 bg-yellow-900/50 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8 text-yellow-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">알림이 차단되었습니다</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  브라우저 주소창 왼쪽의 자물쇠 아이콘을 클릭하여<br />
                  알림 권한을 허용으로 변경해주세요.
                </p>
              </div>
              <button
                onClick={handleDeniedConfirm}
                className="w-full bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-xl text-sm font-medium transition"
              >
                확인
              </button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-blue-900/50 rounded-full flex items-center justify-center mx-auto">
                <Bell className="w-8 h-8 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">알림 설정</h2>
                <p className="text-sm text-gray-400 leading-relaxed">
                  효과적인 포트폴리오 관리를 위해<br />
                  알림 설정이 필요합니다.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  일정, 과제, 메시지 등 중요한 알림을 받을 수 있습니다.
                </p>
              </div>
              <button
                onClick={handleAllow}
                disabled={state === 'requesting'}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
              >
                {state === 'requesting' ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    권한 요청 중...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    알림 허용하기
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
