import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '산타크로체 에듀펌',
  description: '컨설팅 포트폴리오 관리 시스템',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark">
      <body className="bg-gray-900 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
