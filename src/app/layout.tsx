import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'Sellers Pulse',
  description: 'Gestão de Projetos de Implantação — Sellers',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="noise">
        <div className="ambient-orb-1" />
        <div className="ambient-orb-2" />
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'rgba(22,22,34,0.95)',
                color: '#F0F0F5',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
                fontFamily: 'Outfit, sans-serif',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
