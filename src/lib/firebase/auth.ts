import { getClientAuth } from './config'
import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'

// ── Sign in ────────────────────────────────────────────────
export async function signInWithPassword(
  email: string,
  password: string
): Promise<{ userId: string; token: string; error: string | null }> {
  try {
    const cred = await signInWithEmailAndPassword(getClientAuth(), email, password)
    const token = await cred.user.getIdToken()
    return { userId: cred.user.uid, token, error: null }
  } catch (err: any) {
    const msg =
      err.code === 'auth/invalid-credential'
        ? '이메일 또는 비밀번호가 올바르지 않습니다.'
        : err.code === 'auth/user-not-found'
        ? '등록되지 않은 사용자입니다.'
        : err.message || '로그인 실패'
    return { userId: '', token: '', error: msg }
  }
}

// ── Sign out ───────────────────────────────────────────────
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(getClientAuth())
  } catch {
    // ignore
  }
  clearSessionCookies()
}

// ── Cookie helpers (browser-side) ──────────────────────────
export function setSessionCookies(token: string) {
  const maxAge = 60 * 60 * 24 * 7 // 7 days
  document.cookie = `fb-token=${token}; path=/; max-age=${maxAge}; SameSite=Lax`
}

export function clearSessionCookies() {
  document.cookie = 'fb-token=; path=/; max-age=0'
}

export function getTokenFromCookie(): string | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|; )fb-token=([^;]*)/)
  return match ? match[1] : null
}

// ── Decode Firebase ID token (JWT) ─────────────────────────
function decodeJwt(token: string): Record<string, any> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

// ── Get session from cookies (sync, browser-side) ──────────
export function getSessionFromCookies(): {
  accessToken: string
  userId: string
  email: string
} | null {
  const token = getTokenFromCookie()
  if (!token) return null
  const payload = decodeJwt(token)
  if (!payload) return null
  return {
    accessToken: token,
    userId: payload.user_id || payload.sub,
    email: payload.email || '',
  }
}

// ── Token refresh: renew if expiring within 1 hour ─────────
export async function refreshTokenIfNeeded(): Promise<boolean> {
  const token = getTokenFromCookie()
  if (!token) return false

  const payload = decodeJwt(token)
  if (!payload?.exp) return false

  const expiresAt = payload.exp * 1000
  const oneHour = 60 * 60 * 1000
  const now = Date.now()

  // Still valid for more than 1 hour — no refresh needed
  if (expiresAt - now > oneHour) return false

  try {
    const auth = getClientAuth()
    const user = auth.currentUser
    if (!user) return false

    const freshToken = await user.getIdToken(true)
    setSessionCookies(freshToken)
    return true
  } catch {
    return false
  }
}
