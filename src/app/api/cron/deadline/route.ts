import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase/admin'
import { getMessaging } from 'firebase-admin/messaging'

export async function GET(req: NextRequest) {
  // Vercel Cron 인증
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const db = getAdminDb()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const d1 = new Date(today)
    d1.setDate(d1.getDate() + 1)
    const d3 = new Date(today)
    d3.setDate(d3.getDate() + 3)

    const formatDate = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const d1Str = formatDate(d1)
    const d3Str = formatDate(d3)

    // Query assignments due in D-1 or D-3 that are not done
    const assignmentsSnap = await db.collection('assignments')
      .where('status', 'in', ['todo', 'in_progress'])
      .get()

    const targets: { studentId: string; title: string; dueDate: string; dLabel: string }[] = []

    for (const doc of assignmentsSnap.docs) {
      const data = doc.data()
      if (data.due_date === d1Str) {
        targets.push({ studentId: data.student_id, title: data.title, dueDate: data.due_date, dLabel: 'D-1' })
      } else if (data.due_date === d3Str) {
        targets.push({ studentId: data.student_id, title: data.title, dueDate: data.due_date, dLabel: 'D-3' })
      }
    }

    if (!targets.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Collect user IDs (student's user_id + parent_id) for each target
    const studentIds = Array.from(new Set(targets.map(t => t.studentId)))
    const userIdSet = new Set<string>()
    const studentNameMap: Record<string, string> = {}

    for (const sid of studentIds) {
      const studentDoc = await db.collection('students').doc(sid).get()
      const s = studentDoc.data()
      if (!s) continue
      studentNameMap[sid] = s.name || ''
      if (s.user_id) userIdSet.add(s.user_id)
      if (s.parent_id) userIdSet.add(s.parent_id)
    }

    // Fetch FCM tokens
    const tokens: string[] = []
    const userIds = Array.from(userIdSet)
    for (const uid of userIds) {
      const profileDoc = await db.collection('profiles').doc(uid).get()
      const fcmToken = profileDoc.data()?.fcm_token
      if (fcmToken) tokens.push(fcmToken)
    }

    if (!tokens.length) {
      return NextResponse.json({ success: true, sent: 0 })
    }

    // Group messages (send one combined notification per token set)
    const messaging = getMessaging()
    let totalSent = 0

    // Send per-assignment notifications
    for (const target of targets) {
      const studentDoc = await db.collection('students').doc(target.studentId).get()
      const s = studentDoc.data()
      if (!s) continue

      const targetTokens: string[] = []
      for (const uid of [s.user_id, s.parent_id].filter(Boolean)) {
        const profileDoc = await db.collection('profiles').doc(uid).get()
        const t = profileDoc.data()?.fcm_token
        if (t) targetTokens.push(t)
      }
      if (!targetTokens.length) continue

      const res = await messaging.sendEachForMulticast({
        tokens: targetTokens,
        notification: {
          title: `과제 마감 임박 (${target.dLabel})`,
          body: `"${target.title}" 마감일: ${target.dueDate}`,
        },
        webpush: { fcmOptions: { link: '/' } },
      })
      totalSent += res.successCount
    }

    return NextResponse.json({ success: true, sent: totalSent })
  } catch (err: any) {
    console.error('Deadline cron error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
