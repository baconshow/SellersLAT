'use client'

import { useState } from 'react'
import { CalendarIcon } from 'lucide-react'
import { format, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export default function DatePicker({ value, onChange, label }: DatePickerProps) {
  const [open, setOpen] = useState(false)

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
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 5,
            padding: '8px 12px',
            color: value ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.3)',
          }}
        >
          <CalendarIcon style={{ width: 13, height: 13, color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
          {display}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        side="right"
        align="start"
        style={{
          zIndex: 99999,
          background: '#0e0e16',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 5,
        }}
      >
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          locale={ptBR}
          initialFocus
          className="text-white"
          classNames={{
            months: 'flex flex-col',
            month: 'space-y-3',
            caption: 'flex justify-center pt-1 relative items-center',
            caption_label: 'text-xs font-semibold text-white',
            nav: 'space-x-1 flex items-center',
            nav_button:
              'h-7 w-7 bg-transparent border border-white/10 rounded p-0 opacity-50 hover:opacity-100 hover:bg-white/5 inline-flex items-center justify-center text-white',
            nav_button_previous: 'absolute left-1',
            nav_button_next: 'absolute right-1',
            table: 'w-full border-collapse',
            head_row: 'flex',
            head_cell: 'text-white/30 rounded w-9 font-normal text-[10px] uppercase',
            row: 'flex w-full mt-1',
            cell: 'h-8 w-9 text-center text-xs p-0 relative focus-within:relative focus-within:z-20',
            day: 'h-8 w-8 p-0 font-normal rounded text-white/60 hover:bg-white/10 hover:text-white transition-colors inline-flex items-center justify-center',
            day_selected:
              'bg-[var(--color-brand,#00D4AA)] text-[#050508] font-bold hover:bg-[var(--color-brand,#00D4AA)] hover:text-[#050508]',
            day_today: 'ring-1 ring-white/20 text-white font-semibold',
            day_outside: 'text-white/15',
            day_disabled: 'text-white/10',
            day_hidden: 'invisible',
          }}
        />
        <div
          className="px-3 pb-3 pt-1"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <button
            onClick={handleToday}
            className="w-full text-[11px] font-semibold py-1.5 rounded transition-all"
            style={{
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.5)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
          >
            Hoje
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
