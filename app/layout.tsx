import { Suspense } from 'react'
import type { Metadata } from 'next'
import './globals.css'
import PortfolioBar from '@/components/PortfolioBar'


export const metadata: Metadata = {
  title: 'QuizMenti — Live Interactive Quizzes',
  description: 'Host live quiz sessions with unique room codes. Participants join on any device — no sign-up needed.',
  authors: [{ name: "Atul Sharma", url: "https://atul-sharma-qa.vercel.app" }],
  creator: "Atul Sharma",
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Suspense fallback={null}><PortfolioBar /></Suspense>{children}</body>
    </html>
  )
}
