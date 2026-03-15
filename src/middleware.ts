import { NextResponse, type NextRequest } from 'next/server'

function decodeJwt(token: string): Record<string, any> | null {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('fb-token')?.value

  if (pathname === '/login') {
    if (token) {
      const payload = decodeJwt(token)
      if (payload && payload.exp * 1000 > Date.now()) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    }
    return NextResponse.next()
  }

  // Protect all other routes
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const payload = decodeJwt(token)
  if (!payload || payload.exp * 1000 < Date.now()) {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('fb-token')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest\\.json|sw\\.js|workbox-.*\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
