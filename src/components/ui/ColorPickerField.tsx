'use client'

import { useState, useRef, useEffect } from 'react'
import { HexColorPicker } from 'react-colorful'

interface ColorPickerFieldProps {
  value: string
  onChange: (color: string) => void
  label: string
}

export default function ColorPickerField({ value, onChange, label }: ColorPickerFieldProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

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
          background: 'rgba(255,255,255,0.04)',
          border: open ? '1px solid rgba(255,255,255,0.22)' : '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="w-7 h-7 rounded shrink-0" style={{ background: value }} />
        <div className="text-left">
          <p className="text-[10px] mb-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {label}
          </p>
          <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {value}
          </p>
        </div>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 p-3 rounded"
          style={{
            background: '#0e0e16',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
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
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
