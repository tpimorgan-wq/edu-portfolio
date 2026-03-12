import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin'

export async function POST(request: NextRequest) {
  // Verify caller is authenticated admin
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

  const body = await request.json()
  const { email, password, full_name, role, phone } = body

  if (!email || !password || !role) {
    return NextResponse.json({ error: '이메일, 비밀번호, 역할은 필수입니다.' }, { status: 400 })
  }

  const validRoles = ['admin', 'consultant', 'parent', 'student']
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: '유효하지 않은 역할입니다.' }, { status: 400 })
  }

  try {
    // Create Firebase Auth user
    const userRecord = await getAdminAuth().createUser({
      email,
      password,
      displayName: full_name || undefined,
    })

    // Create profile document in Firestore
    const now = new Date().toISOString()
    await getAdminDb().collection('profiles').doc(userRecord.uid).set({
      id: userRecord.uid,
      email,
      full_name: full_name || '',
      role,
      phone: phone || null,
      created_at: now,
      updated_at: now,
    })

    return NextResponse.json({ user: { id: userRecord.uid, email } }, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
