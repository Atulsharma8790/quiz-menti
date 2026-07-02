'use client'
import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { PORTFOLIO_URL } from '../lib/config'

const FEATURES = [
  { icon: '⚡', title: 'Speed scoring',        sub: 'Fastest correct answer = max points' },
  { icon: '🏆', title: 'Live leaderboard',     sub: 'See your rank after every question' },
  { icon: '🎯', title: 'MCQ, Poll & Word Cloud', sub: 'Mix question types freely' },
  { icon: '📊', title: 'Export CSV',           sub: 'Download results when done' },
]

const AVATARS = ['🎮','👾','🚀','🦊','🐺','🦁','🐯','🦄','🐲','🎃','👑','💎','⚡','🔥','🌟','🎯']

function JoinForm() {
  const router  = useRouter()
  const params  = useSearchParams()
  const prefill = params.get('code') ?? ''

  const [digits, setDigits]   = useState(Array(6).fill('').map((_, i) => prefill[i] ?? ''))
  const [name, setName]       = useState('')
  const [emoji, setEmoji]     = useState(AVATARS[0])
  const [joining, setJoining] = useState(false)
  const [error, setError]     = useState('')
  const [shake, setShake]     = useState(false)
  const [showAvatars, setShowAvatars] = useState(false)

  useEffect(() => {
    setEmoji(AVATARS[Math.floor(Math.random() * AVATARS.length)])
  }, [])

  const ref0 = useRef<HTMLInputElement>(null)
  const ref1 = useRef<HTMLInputElement>(null)
  const ref2 = useRef<HTMLInputElement>(null)
  const ref3 = useRef<HTMLInputElement>(null)
  const ref4 = useRef<HTMLInputElement>(null)
  const ref5 = useRef<HTMLInputElement>(null)
  const refs = [ref0, ref1, ref2, ref3, ref4, ref5]

  const code = digits.join('')

  const handleDigit = (i: number, val: string) => {
    const d = val.replace(/\D/g, '').slice(-1)
    const next = [...digits]; next[i] = d; setDigits(next)
    if (d && i < 5) refs[i + 1].current?.focus()
  }
  const handleKey = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      const next = [...digits]; next[i - 1] = ''; setDigits(next)
      refs[i - 1].current?.focus()
    }
    if (e.key === 'ArrowLeft'  && i > 0) refs[i - 1].current?.focus()
    if (e.key === 'ArrowRight' && i < 5) refs[i + 1].current?.focus()
  }
  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length) {
      setDigits(Array(6).fill('').map((_, i) => text[i] ?? ''))
      refs[Math.min(text.length, 5)].current?.focus()
    }
    e.preventDefault()
  }

  const join = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < 6 || !name.trim()) return
    setJoining(true); setError('')
    try {
      const res  = await fetch('/api/join', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, name: name.trim(), emoji }) })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Room not found. Check the code.')
        setShake(true); setTimeout(() => setShake(false), 500); return
      }
      sessionStorage.setItem(`qm_pid_${data.code}`, data.participantId)
      sessionStorage.setItem(`qm_name_${data.code}`, name.trim())
      sessionStorage.setItem(`qm_emoji_${data.code}`, data.emoji ?? emoji)
      router.push(`/play/${data.code}`)
    } catch { setError('Network error — try again.') }
    finally { setJoining(false) }
  }

  return (
    <form onSubmit={join} className={shake ? 'a-shake' : ''}>
      <div className="mb-6">
        <p className="label mb-3">Room Code</p>
        <div className="flex gap-2 justify-center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input key={i} ref={refs[i]} type="text" inputMode="numeric" maxLength={2}
              value={d} onChange={e => handleDigit(i, e.target.value)}
              onKeyDown={e => handleKey(i, e)} onFocus={e => e.target.select()}
              autoFocus={i === 0 && !prefill} className={`otp ${d ? 'filled' : ''}`} />
          ))}
        </div>
      </div>

      <div className="mb-6">
        <p className="label mb-3">Your Identity</p>
        <div className="flex gap-3 items-center">
          <div className="relative">
            <button type="button" onClick={() => setShowAvatars(v => !v)}
              className="w-[56px] h-[56px] rounded-2xl text-2xl flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: `2px solid ${showAvatars ? 'rgba(244,63,94,0.5)' : 'rgba(255,255,255,0.1)'}` }}
              title="Pick your avatar">
              {emoji}
            </button>
            {showAvatars && (
              <div className="absolute bottom-full left-0 mb-3 z-20 p-3 rounded-2xl"
                style={{ background: '#0E0C26', border: '1px solid rgba(255,255,255,0.1)',
                  boxShadow: '0 16px 48px rgba(0,0,0,0.7)', width: '220px' }}>
                <p className="text-xs font-bold mb-2.5" style={{ color: 'rgba(255,255,255,0.35)' }}>PICK YOUR AVATAR</p>
                <div className="grid grid-cols-4 gap-2">
                  {AVATARS.map(av => (
                    <button key={av} type="button"
                      onClick={() => { setEmoji(av); setShowAvatars(false) }}
                      className="h-12 rounded-xl text-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                      style={{ background: emoji === av ? 'rgba(244,63,94,0.2)' : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${emoji === av ? 'rgba(244,63,94,0.4)' : 'transparent'}` }}>
                      {av}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <input value={name} onChange={e => setName(e.target.value.slice(0, 20))}
            placeholder="Enter your nickname..." autoComplete="off"
            className="input flex-1 text-base font-bold" style={{ padding: '0.875rem 1.125rem', height: '56px' }} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl mb-5 a-zoom"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.28)', color: '#FCA5A5' }}>
          <span>⚠</span>
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      <button type="submit" disabled={joining || code.length < 6 || !name.trim()} className="btn w-full py-4 text-base">
        {joining
          ? <span className="flex items-center justify-center gap-2.5">
              <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Joining arena...
            </span>
          : <span className="flex items-center justify-center gap-2">{emoji} Enter the Arena</span>}
      </button>
    </form>
  )
}

export default function Home() {
  const [tab, setTab] = useState<'join' | 'host'>('join')

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="bg" />

      {/* Portfolio link */}
      <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer"
        className="fixed top-5 right-6 z-50 text-xs font-semibold px-3.5 py-2 rounded-full"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(255,255,255,0.32)' }}>
        by Atul ↗
      </a>

      {/* ── Centered two-column grid ── */}
      <div className="relative z-10 w-full" style={{ maxWidth: '1040px' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* ── LEFT: branding + features ── */}
          <div className="a-down">
            {/* Logo */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-2xl pulse"
                  style={{ background: 'linear-gradient(135deg,#F43F5E,#7C3AED)' }} />
                <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'linear-gradient(135deg,#F43F5E,#7C3AED)', boxShadow: '0 10px 40px rgba(244,63,94,0.5)' }}>
                  ⚡
                </div>
              </div>
              <h1 className="text-5xl lg:text-6xl font-black tracking-tight leading-none"
                style={{ background: 'linear-gradient(135deg,#F43F5E,#A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                QuizMenti
              </h1>
            </div>

            <p className="text-lg mb-10" style={{ color: 'rgba(237,233,254,0.5)' }}>
              Live quiz battles where speed wins.
            </p>

            {/* Features */}
            <div className="space-y-4 mb-10">
              {FEATURES.map((f, i) => (
                <div key={f.title} className="flex items-center gap-4 a-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {f.icon}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#EDE9FE' }}>{f.title}</p>
                    <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.38)' }}>{f.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Badges */}
            <div className="flex gap-6">
              {[['⚡', 'Real-time'], ['🎯', 'No sign-up'], ['📱', 'Any device']].map(([icon, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.3)' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT: form card ── */}
          <div className="a-up" style={{ animationDelay: '0.1s' }}>
            {/* Tab switcher */}
            <div className="flex p-1 rounded-2xl mb-5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {(['join', 'host'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200"
                  style={{
                    background: tab === t ? 'linear-gradient(135deg,#F43F5E,#7C3AED)' : 'transparent',
                    color: tab === t ? '#fff' : 'rgba(237,233,254,0.38)',
                    boxShadow: tab === t ? '0 4px 16px rgba(244,63,94,0.35)' : 'none',
                  }}>
                  {t === 'join' ? '🎮 Join a Game' : '🎤 Host a Game'}
                </button>
              ))}
            </div>

            {/* Card */}
            <div className="card p-7" style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
              {tab === 'join' ? (
                <Suspense>
                  <JoinForm />
                </Suspense>
              ) : (
                <div>
                  <div className="text-center mb-7">
                    <p className="text-5xl mb-4">🎤</p>
                    <h2 className="text-xl font-black mb-2">Host a Live Quiz</h2>
                    <p className="text-sm leading-relaxed" style={{ color: 'rgba(237,233,254,0.45)' }}>
                      Build questions, share the code, and run it live.<br />
                      Players race to answer fastest — speed earns bonus points.
                    </p>
                  </div>
                  <a href="/host" className="btn w-full py-4 text-base flex items-center justify-center gap-2">
                    Build My Quiz →
                  </a>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}
