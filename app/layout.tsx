import React from "react"
import type { Metadata } from 'next'
import { Tajawal } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const tajawal = Tajawal({ 
  subsets: ['arabic', 'latin'],
  weight: ['200', '300', '400', '500', '700', '800', '900']
})

export const metadata: Metadata = {
  title: {
    default: 'منصة تخطيط المحتوى | الهدف الأمثل للتسويق',
    template: '%s | الهدف الأمثل للتسويق',
  },
  description: 'منصة احترافية لتخطيط وإدارة المحتوى التسويقي على وسائل التواصل الاجتماعي - الهدف الأمثل للتسويق وتطوير الأعمال | Optimum Target for Marketing & Business Development',
  keywords: ['تخطيط المحتوى', 'إدارة السوشيال ميديا', 'التسويق الرقمي', 'الهدف الأمثل', 'OPT', 'content planning', 'social media management'],
  authors: [{ name: 'Optimum Target for Marketing & Business Development', url: 'https://op-target.com' }],
  creator: 'Optimum Target for Marketing & Business Development',
  publisher: 'Optimum Target for Marketing & Business Development',
  metadataBase: new URL('https://op-target.com'),
  openGraph: {
    type: 'website',
    locale: 'ar_SA',
    url: 'https://op-target.com',
    siteName: 'الهدف الأمثل للتسويق | OPT',
    title: 'منصة تخطيط المحتوى | الهدف الأمثل للتسويق',
    description: 'منصة احترافية لتخطيط وإدارة المحتوى التسويقي على وسائل التواصل الاجتماعي',
    images: [
      {
        url: '/z806a4z806a4z806.png',
        width: 1200,
        height: 630,
        alt: 'الهدف الأمثل للتسويق وتطوير الأعمال',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@optdm_sa',
    creator: '@optdm_sa',
    title: 'منصة تخطيط المحتوى | الهدف الأمثل للتسويق',
    description: 'منصة احترافية لتخطيط وإدارة المحتوى التسويقي على وسائل التواصل الاجتماعي',
    images: ['/z806a4z806a4z806.png'],
  },
  icons: {
    icon: [
      { url: '/opt-logo.png', sizes: '32x32', type: 'image/png' },
      { url: '/opt-logo.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/opt-logo.png',
    shortcut: '/opt-logo.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
