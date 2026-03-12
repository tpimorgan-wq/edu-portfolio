import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

let _app: FirebaseApp | null = null
let _auth: Auth | null = null
let _firestore: Firestore | null = null

function getApp(): FirebaseApp {
  if (_app) return _app
  if (getApps().length) {
    _app = getApps()[0]
    return _app
  }
  _app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy',
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  })
  return _app
}

export function getClientAuth(): Auth {
  if (_auth) return _auth
  _auth = getAuth(getApp())
  return _auth
}

export function getClientFirestore(): Firestore {
  if (_firestore) return _firestore
  _firestore = getFirestore(getApp())
  return _firestore
}
