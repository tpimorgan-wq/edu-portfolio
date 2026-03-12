import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  const token = request.cookies.get('fb-token')?.value
  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  let callerUid: string
  try {
    const decoded = await getAdminAuth().verifyIdToken(token)
    callerUid = decoded.uid
  } catch {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const callerDoc = await getAdminDb().collection('profiles').doc(callerUid).get()
  if (!callerDoc.exists || callerDoc.data()?.role !== 'admin') {
    return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
  }

  const { userId } = await request.json()
  if (!userId) {
    return NextResponse.json({ error: '삭제할 사용자 ID가 필요합니다.' }, { status: 400 })
  }

  if (userId === callerUid) {
    return NextResponse.json({ error: '자신의 계정은 삭제할 수 없습니다.' }, { status: 400 })
  }

  try {
    await getAdminAuth().deleteUser(userId)
    await getAdminDb().collection('profiles').doc(userId).delete()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
