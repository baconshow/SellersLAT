import type { ReactNode } from 'react'

export default function SlugLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--color-bg)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* ── Background effects ── */}

      {/* Top gradient glow */}
      <div
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 320,
          background: `linear-gradient(
            180deg,
            rgba(var(--color-brand-rgb, 0,212,170), 0.07) 0%,
            rgba(var(--color-brand-rgb, 0,212,170), 0.03) 40%,
            transparent 100%
          )`,
          zIndex: 0,
        }}
      />

      {/* Diagonal glow — left */}
      <div
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: -100,
          left: -200,
          width: 600,
          height: 600,
          background: `radial-gradient(ellipse,
            rgba(var(--color-brand-rgb, 0,212,170), 0.04) 0%,
            transparent 70%
          )`,
          transform: 'rotate(-25deg)',
          zIndex: 0,
        }}
      />

      {/* Diagonal glow — right */}
      <div
        className="pointer-events-none"
        style={{
          position: 'fixed',
          top: 0,
          right: -150,
          width: 500,
          height: 400,
          background: `radial-gradient(ellipse,
            rgba(var(--color-brand-secondary-rgb, 139,92,246), 0.04) 0%,
            transparent 70%
          )`,
          zIndex: 0,
        }}
      />

      {/* ── Content ── */}
      <main style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </main>
    </div>
  )
}
