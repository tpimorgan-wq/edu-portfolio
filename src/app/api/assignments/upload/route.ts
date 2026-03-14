import { NextRequest, NextResponse } from 'next/server'
import { getAdminAuth } from '@/lib/firebase/admin'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(req: NextRequest) {
  const token = req.cookies.get('fb-token')?.value
  if (!token) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    await getAdminAuth().verifyIdToken(token)
  } catch {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const studentId = formData.get('studentId') as string | null

  if (!file || !studentId) {
    return NextResponse.json({ error: '파일과 학생 ID는 필수입니다.' }, { status: 400 })
  }

  try {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `assignments/${studentId}`,
          resource_type: 'raw',
        },
        (error, result) => {
          if (error || !result) reject(error || new Error('업로드 실패'))
          else resolve(result)
        }
      )
      stream.end(buffer)
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (err: any) {
    console.error('Cloudinary upload error:', err)
    return NextResponse.json({ error: err.message || '업로드 실패' }, { status: 500 })
  }
}
