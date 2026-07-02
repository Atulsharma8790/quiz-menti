'use client'
import { useState, useEffect, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  message: string
  type: ToastType
  emoji?: string
}

let toastId = 0
type Listener = (t: ToastItem) => void
const listeners = new Set<Listener>()

export function toast(message: string, type: ToastType = 'info', emoji?: string) {
  const item: ToastItem = { id: ++toastId, message, type, emoji }
  listeners.forEach(fn => fn(item))
}

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  const add = useCallback((t: ToastItem) => {
    setItems(p => [...p.slice(-4), t])
    setTimeout(() => setItems(p => p.filter(i => i.id !== t.id)), 3200)
  }, [])

  useEffect(() => {
    listeners.add(add)
    return () => { listeners.delete(add) }
  }, [add])

  const bg: Record<ToastType, string> = {
    success: 'rgba(34,197,94,0.12)',
    error:   'rgba(239,68,68,0.12)',
    info:    'rgba(124,58,237,0.12)',
    warning: 'rgba(245,158,11,0.12)',
  }
  const border: Record<ToastType, string> = {
    success: 'rgba(34,197,94,0.35)',
    error:   'rgba(239,68,68,0.35)',
    info:    'rgba(124,58,237,0.35)',
    warning: 'rgba(245,158,11,0.35)',
  }
  const color: Record<ToastType, string> = {
    success: '#86EFAC',
    error:   '#FCA5A5',
    info:    '#C4B5FD',
    warning: '#FDE68A',
  }
  const defaultEmoji: Record<ToastType, string> = {
    success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️'
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {items.map(t => (
        <div key={t.id}
          className="flex items-center gap-3 px-5 py-4 rounded-2xl a-slide pointer-events-auto"
          style={{
            background: bg[t.type],
            border: `1.5px solid ${border[t.type]}`,
            backdropFilter: 'blur(20px)',
            boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${border[t.type]}22`,
            maxWidth: '360px',
          }}>
          <span className="text-xl flex-shrink-0">{t.emoji ?? defaultEmoji[t.type]}</span>
          <p className="text-sm font-semibold" style={{ color: color[t.type] }}>{t.message}</p>
        </div>
      ))}
    </div>
  )
}
