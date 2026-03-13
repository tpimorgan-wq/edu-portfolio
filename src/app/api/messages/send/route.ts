import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  // 1. 인증
  const token = req.cookies.get('fb-token')?.value
  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  let senderId: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    senderId = decoded.uid
  } catch {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // 2. body 파싱
  const { receiver_id, content, reply_to_id } = await req.json()

  if (!receiver_id || !content?.trim()) {
    return NextResponse.json({ error: '수신자와 내용은 필수입니다.' }, { status: 400 })
  }

  try {
    const db = getAdminDb()

    // 3. 프로필 조회
    const [senderDoc, receiverDoc] = await Promise.all([
      db.collection('profiles').doc(senderId).get(),
      db.collection('profiles').doc(receiver_id).get(),
    ])
    const senderName = senderDoc.data()?.full_name || '알 수 없음'
    const receiverEmail = receiverDoc.data()?.email

    // 4. Firestore에 메시지 저장
    const msgRef = await db.collection('messages').add({
      sender_id: senderId,
      receiver_id,
      content: content.trim(),
      is_read: false,
      reply_to_id: reply_to_id || null,
      created_at: new Date().toISOString(),
    })

    // 5. 이메일 발송 (best-effort)
    if (receiverEmail) {
      try {
        const preview = content.length > 100 ? content.slice(0, 100) + '...' : content
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: receiverEmail,
          subject: `[산타크로체 에듀펌] ${senderName}님의 새 메시지`,
          html: `
            <div style="font-family: 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
              <div style="background: #1e293b; border-radius: 12px; padding: 24px; color: #e2e8f0;">
                <h2 style="margin: 0 0 16px; font-size: 18px; color: #60a5fa;">새 메시지가 도착했습니다</h2>
                <p style="margin: 0 0 8px; font-size: 14px; color: #94a3b8;">보낸 사람: <strong style="color: #f1f5f9;">${senderName}</strong></p>
                <div style="background: #0f172a; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0; font-size: 14px; color: #cbd5e1; line-height: 1.6; white-space: pre-wrap;">${preview}</p>
                </div>
                <a href="https://edu-portfolio-self.vercel.app/messages" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; margin-top: 8px;">메시지 확인하기</a>
              </div>
              <p style="margin: 16px 0 0; font-size: 11px; color: #64748b; text-align: center;">산타크로체 에듀펌</p>
            </div>
          `,
        })
      } catch (e) {
        console.error('Email send failed:', e)
      }
    }

    return NextResponse.json({ success: true, messageId: msgRef.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
