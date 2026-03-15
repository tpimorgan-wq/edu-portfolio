'use client'

import { getClientFirestore } from './config'
import { doc, updateDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
}

async function waitForSwActive(reg: ServiceWorkerRegistration): Promise<ServiceWorker> {
  if (reg.active) return reg.active
  const sw = reg.installing || reg.waiting
  if (!sw) throw new Error('No service worker found')
  return new Promise((resolve) => {
    sw.addEventListener('statechange', () => {
      if (sw.state === 'activated') resolve(sw)
    })
  })
}

export async function requestFcmToken(userId: string): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!('Notification' in window)) return null

  try {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return null

    // Register the FCM service worker
    const reg = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
    const sw = await waitForSwActive(reg)

    // Send Firebase config to the service worker
    sw.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig })

    // Dynamically import firebase/messaging (client-only)
    const { getMessaging, getToken } = await import('firebase/messaging')
    const { initializeApp, getApps } = await import('firebase/app')

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
    const messaging = getMessaging(app)
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: reg,
    })

    if (token) {
      const db = getClientFirestore()
      await updateDoc(doc(db, 'profiles', userId), { fcm_token: token })
    }

    return token
  } catch (err) {
    console.error('FCM token request failed:', err)
    return null
  }
}
