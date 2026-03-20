'use client'

import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'
import { useTheme } from '@/contexts/ThemeContext'

interface ColorPickerFieldProps {
  value: string
  onChange: (color: string) => void
  label: string
}

export default function ColorPickerField({ value, onChange, label }: ColorPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 w-full px-4 py-3 rounded transition-all"
        style={{
          background: isDark ? 'rgba(255,255,255,0.04)' : '#EDEEF2',
          border: isDark
            ? `1px solid ${open ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.08)'}`
            : `1px solid ${open ? '#8888A0' : '#C8C9D0'}`,
        }}
      >
        <div className="w-7 h-7 rounded shrink-0" style={{ background: value }} />
        <div className="text-left">
          <p className="text-[10px] mb-0.5" style={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0' }}>
            {label}
          </p>
          <p className="text-xs font-mono" style={{ color: isDark ? 'rgba(255,255,255,0.6)' : '#4A4A68' }}>
            {value}
          </p>
        </div>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 p-3 rounded"
          style={{
            background: isDark ? '#0e0e16' : '#FFFFFF',
            border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #C8C9D0',
            boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.5)' : '0 4px 20px rgba(0,0,0,0.12)',
          }}
        >
          <HexColorPicker color={value} onChange={onChange} />
          <div className="flex items-center gap-2 mt-3">
            <div className="w-6 h-6 rounded shrink-0" style={{ background: value }} />
            <input
              type="text"
              value={value}
              onChange={e => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
              }}
              className="flex-1 text-xs font-mono px-2 py-1.5 rounded outline-none"
              style={{
                background: isDark ? 'rgba(255,255,255,0.06)' : '#F4F5F7',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #C8C9D0',
                color: isDark ? 'rgba(255,255,255,0.8)' : '#1A1A2E',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
