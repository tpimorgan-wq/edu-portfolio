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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#1e293b" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="bg-gray-900 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  )
}
