'use client'

import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useTheme } from '@/contexts/ThemeContext'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const display = date ? format(date, "d MMM yyyy", { locale: ptBR }) : 'Selecionar data'

  const handleSelect = (day: Date | undefined) => {
    if (!day) return
    onChange(format(day, 'yyyy-MM-dd'))
    setOpen(false)
  }

  const handleToday = () => {
    onChange(format(new Date(), 'yyyy-MM-dd'))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center gap-2 w-full text-left text-xs outline-none transition-all"
          style={{
            background: isDark ? 'rgba(255,255,255,0.07)' : '#EDEEF2',
            border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #C8C9D0',
            borderRadius: 5,
            padding: '8px 12px',
            color: value
              ? (isDark ? 'rgba(255,255,255,0.85)' : '#1A1A2E')
              : (isDark ? 'rgba(255,255,255,0.3)' : '#8888A0'),
          }}
        >
          <CalendarIcon style={{ width: 13, height: 13, color: isDark ? 'rgba(255,255,255,0.3)' : '#8888A0', flexShrink: 0 }} />
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        side="right"
        align="start"
        onInteractOutside={(e) => e.preventDefault()}
        style={{
          zIndex: 99999,
          background: isDark ? '#0e0e16' : '#FFFFFF',
          border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #C8C9D0',
          borderRadius: 5,
          boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.6)' : '0 4px 16px rgba(0,0,0,0.1)',
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={ptBR}
          initialFocus
          className={isDark ? 'text-white' : 'text-gray-900'}
          classNames={{
            months: 'flex flex-col',
            month: 'space-y-3',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: `text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-700'}`,
            nav: 'space-x-1 flex items-center',
            nav_button: `h-7 w-7 bg-transparent border rounded p-0 inline-flex items-center justify-center transition-colors ${
              isDark
                ? 'border-white/10 text-white/50 hover:text-white/80 hover:bg-white/5'
                : 'border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`,
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse',
            head_row: 'flex',
            head_cell: `rounded w-9 font-normal text-[10px] uppercase ${isDark ? 'text-white/30' : 'text-gray-400'}`,
            row: 'flex w-full mt-1',
            cell: 'h-8 w-9 text-center text-xs p-0 relative focus-within:relative focus-within:z-20',
            day: `h-8 w-8 p-0 font-normal rounded transition-colors inline-flex items-center justify-center ${
              isDark
                ? 'text-white/60 hover:bg-white/10 hover:text-white'
                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
            }`,
            day_selected: `bg-[var(--color-brand,#00D4AA)] ${isDark ? 'text-[#050508]' : 'text-white'} font-bold hover:bg-[var(--color-brand,#00D4AA)] ${isDark ? 'hover:text-[#050508]' : 'hover:text-white'}`,
            day_today: `ring-1 font-semibold ${isDark ? 'ring-white/20 text-white' : 'ring-gray-300 text-gray-900'}`,
            day_outside: isDark ? 'text-white/15' : 'text-gray-300',
            day_disabled: isDark ? 'text-white/10' : 'text-gray-200',
            day_hidden: 'invisible',
          }}
        />
        <div
          className="px-3 pb-3 pt-1"
          style={{ borderTop: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid #E8E9ED' }}
        >
          <button
            onClick={handleToday}
            className="w-full text-[11px] font-semibold py-1.5 rounded transition-all"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : '#F4F5F7',
              color: isDark ? 'rgba(255,255,255,0.5)' : '#4A4A68',
              border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #C8C9D0',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = isDark ? '#fff' : '#1A1A2E'
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.1)' : '#E8E9ED'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = isDark ? 'rgba(255,255,255,0.5)' : '#4A4A68'
              e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.05)' : '#F4F5F7'
            }}
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
