import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('fb-token')?.value
  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }
  try {
    await getAdminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get('url')
  const filename = req.nextUrl.searchParams.get('filename')
  if (!url || !filename) {
    return NextResponse.json({ error: 'url과 filename은 필수입니다.' }, { status: 400 })
  }

  // Cloudinary 도메인만 허용
  if (!url.startsWith('https://res.cloudinary.com/')) {
    return NextResponse.json({ error: '허용되지 않는 URL입니다.' }, { status: 400 })
  }

  const upstream = await fetch(url)
  if (!upstream.ok) {
    return NextResponse.json({ error: '파일을 가져올 수 없습니다.' }, { status: 502 })
  }

  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
