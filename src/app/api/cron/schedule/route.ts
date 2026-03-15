import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { getMessaging } from 'firebase-admin/messaging'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const todayStr = formatDate(today)
    const tomorrowStr = formatDate(tomorrow)

    // Query upcoming schedules for today and tomorrow
    const schedulesSnap = await db.collection('schedules')
      .where('status', '==', 'upcoming')
      .get()

    const targets: { studentId: string; title: string; eventDate: string; type: string }[] = []

    for (const doc of schedulesSnap.docs) {
      const data = doc.data()
      if (data.event_date === todayStr || data.event_date === tomorrowStr) {
        targets.push({
          studentId: data.student_id,
          title: data.title,
          eventDate: data.event_date,
          type: data.type || '일정',
        })
      }
    }

    if (!targets.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Find consultants for each student
    const studentIds = Array.from(new Set(targets.map(t => t.studentId)))
    const consultantTokens: Record<string, string[]> = {}

    for (const sid of studentIds) {
      const studentDoc = await db.collection('students').doc(sid).get()
      const s = studentDoc.data()
      if (!s) continue

      const consultantIds: string[] = s.consultant_ids || []
      if (s.main_consultant_id && !consultantIds.includes(s.main_consultant_id)) {
        consultantIds.push(s.main_consultant_id)
      }

      const tokens: string[] = []
      for (const cid of consultantIds) {
        const profileDoc = await db.collection('profiles').doc(cid).get()
        const t = profileDoc.data()?.fcm_token
        if (t && !tokens.includes(t)) tokens.push(t)
      }
      consultantTokens[sid] = tokens
    }

    const messaging = getMessaging()
    let totalSent = 0

    for (const target of targets) {
      const tokens = consultantTokens[target.studentId]
      if (!tokens?.length) continue

      const isToday = target.eventDate === todayStr
      const res = await messaging.sendEachForMulticast({
        tokens: Array.from(tokens),
        notification: {
          title: `${isToday ? '오늘' : '내일'} ${target.type} 일정`,
          body: `"${target.title}" - ${target.eventDate}`,
        },
        webpush: { fcmOptions: { link: '/' } },
      })
      totalSent += res.successCount
    }

    return NextResponse.json({ success: true, sent: totalSent })
  } catch (err: any) {
    console.error('Schedule cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
