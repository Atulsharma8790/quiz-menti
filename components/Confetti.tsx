'use client'
import { useEffect, useRef } from 'react'

const COLORS = ['#FF2D78','#8B5CF6','#06E5FF','#FFB800','#39FF6B','#FF6EA0','#BBA4FF']

export function Confetti({ active }: { active: boolean }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!active) return
    const container = ref.current
    if (!container) return

    const pieces: HTMLDivElement[] = []
    for (let i = 0; i < 90; i++) {
      const el = document.createElement('div')
      el.className = 'cpiece'
      const size = 6 + Math.random() * 8
      el.style.cssText = `
        left:${Math.random() * 100}vw;
        width:${size}px; height:${size * (Math.random() > 0.5 ? 1 : 2.5)}px;
        background:${COLORS[Math.floor(Math.random() * COLORS.length)]};
        animation-duration:${1.8 + Math.random() * 1.8}s;
        animation-delay:${Math.random() * 0.6}s;
        border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
      `
      document.body.appendChild(el)
      pieces.push(el)
    }
    const cleanup = setTimeout(() => pieces.forEach(p => p.remove()), 4000)
    return () => { clearTimeout(cleanup); pieces.forEach(p => p.remove()) }
  }, [active])

  return <div ref={ref} />
}
