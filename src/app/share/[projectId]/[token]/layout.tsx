import type { ReactNode } from 'react'

export default function ShareLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: '#050508', minHeight: '100vh' }}>
      {/* Header */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
        style={{
          height: 56,
          background: 'rgba(5,5,8,0.97)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px) saturate(160%)',
        }}
      >
        <span
          style={{
            fontFamily: 'Conthrax, Orbitron, "Share Tech Mono", monospace',
            fontSize: 18,
            fontWeight: 700,
            color: '#00D4AA',
            letterSpacing: 2,
          }}
        >
          LAT
        </span>

        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded text-xs"
          style={{
            color: 'rgba(255,255,255,0.3)',
            border: '1px solid rgba(255,255,255,0.10)',
          }}
        >
          <span>👁</span>
          Somente visualização
        </div>
      </header>

      {/* Content */}
      <main style={{ paddingTop: 56 }}>
        {children}
      </main>
    </div>
  )
}
