import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { getMessaging } from 'firebase-admin/messaging'

export async function POST(req: NextRequest) {
  // 인증: fb-token 쿠키 또는 cron 비밀키
  const token = req.cookies.get('fb-token')?.value
  const cronSecret = req.headers.get('x-cron-secret')
  const isCron = cronSecret === process.env.CRON_SECRET

  if (!isCron) {
    if (!token) {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
    try {
      await getAdminAuth().verifyIdToken(token)
    } catch {
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
    }
  }

  const { user_ids, title, body, data, type } = await req.json()

  if (!user_ids?.length || !title) {
    return NextResponse.json({ error: 'user_ids와 title은 필수입니다.' }, { status: 400 })
  }

  try {
    const db = getAdminDb()
    const now = new Date().toISOString()

    // Store notification records in Firestore for each user
    const batch = db.batch()
    for (const uid of user_ids) {
      const ref = db.collection('push_notifications').doc()
      batch.set(ref, {
        user_id: uid,
        title,
        body: body || '',
        type: type || 'general',
        read: false,
        created_at: now,
      })
    }
    await batch.commit()

    // Fetch FCM tokens from profiles
    const tokens: string[] = []
    for (const uid of user_ids) {
      const doc = await db.collection('profiles').doc(uid).get()
      const fcmToken = doc.data()?.fcm_token
      if (fcmToken) tokens.push(fcmToken)
    }

    if (!tokens.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    const messaging = getMessaging()
    const response = await messaging.sendEachForMulticast({
      tokens,
      notification: { title, body: body || '' },
      data: data || {},
      webpush: {
        fcmOptions: { link: '/' },
      },
    })

    return NextResponse.json({
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    })
  } catch (err: any) {
    console.error('FCM send error:', err)
    return NextResponse.json({ error: err.message || '발송 실패' }, { status: 500 })
  }
}
