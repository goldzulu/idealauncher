import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/providers/session-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import { SkipToMain } from '@/components/ui/accessibility'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'IdeaLauncher MVP',
  description: 'Transform raw ideas into validated, prioritized specifications',
}

function LayoutContent({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipToMain />
      <main id="main-content">
        {children}
      </main>
      <Toaster />
    </>
  )
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <LayoutContent>
              {children}
            </LayoutContent>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}

