'use client'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('lat-theme') as 'dark' | 'light' | null
    if (saved) {
      setTheme(saved)
      if (saved === 'light') document.documentElement.classList.add('light')
    }
  }, [])

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('lat-theme', next)
    if (next === 'light') {
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center justify-center w-7 h-7 rounded transition-all"
      style={{ color: 'rgba(255,255,255,0.18)' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.55)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
    >
      {theme === 'dark' ? <Moon style={{ width: 14, height: 14 }} /> : <Sun style={{ width: 14, height: 14 }} />}
    </button>
  )
}
