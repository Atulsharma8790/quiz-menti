'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { Trash2, Plus, Check, Users, Download, Image as ImgIcon, X, ChevronRight, Upload } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Question, QuestionType } from '../../lib/types'
import { DEFAULT_QUESTIONS, PORTFOLIO_URL } from '../../lib/config'
import { CountdownRing } from '../../components/CountdownRing'
import { Confetti } from '../../components/Confetti'
import { ToastContainer, toast } from '../../components/Toast'
import { parseCSV, parseJSON, CSV_TEMPLATE, JSON_TEMPLATE } from '../../lib/import'

// QR code — client-only
const QRCode = dynamic(() => import('qrcode.react').then(m => m.QRCodeSVG), { ssr: false })

const COLS   = ['#E11D48','#7C3AED','#0891B2','#EA580C']
const LABELS = ['A','B','C','D']
const TILE_CLS = ['tile-a','tile-b','tile-c','tile-d']
const STORAGE_KEY = 'qm_builder'
const SESSION_KEY = 'qm_live_session'

interface LiveSnap {
  code:string; title:string; phase:string
  currentQuestionIdx:number; totalQuestions:number
  question: Question|null
  readStartedAt?:number; questionStartedAt?:number
  answerCounts:Record<string,number>; wordMap:Record<string,number>
  participantCount:number
  participants:{id:string;name:string;emoji?:string}[]
  leaderboard:{name:string;score:number;id:string;emoji?:string;streak?:number}[]
}

/* ── Import Modal ── */
function ImportModal({ onClose, onImport }: { onClose:()=>void; onImport:(qs:Question[])=>void }) {
  const [tab, setTab]       = useState<'csv'|'json'>('csv')
  const [errors, setErrors] = useState<string[]>([])
  const fileRef             = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const content = tab === 'csv' ? CSV_TEMPLATE : JSON_TEMPLATE
    const mime    = tab === 'csv' ? 'text/csv' : 'application/json'
    const ext     = tab === 'csv' ? 'csv' : 'json'
    const blob    = new Blob([content], { type: mime })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a')
    a.href = url; a.download = `quizmenti_template.${ext}`; a.click()
    URL.revokeObjectURL(url)
    toast('Template downloaded!', 'success', '📥')
  }

  const handleFile = async (file: File) => {
    setErrors([])
    const text   = await file.text()
    const result = tab === 'csv' ? parseCSV(text) : parseJSON(text)
    if (result.errors.length) { setErrors(result.errors.map(e => e.message)); return }
    onImport(result.questions)
    onClose()
    toast(`Imported ${result.questions.length} question${result.questions.length!==1?'s':''}!`, 'success', '🎉')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background:'rgba(7,6,26,0.88)', backdropFilter:'blur(12px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="card p-8 a-zoom" style={{ width:'100%', maxWidth:'520px', maxHeight:'88vh', overflowY:'auto' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-black" style={{ color:'#EDE9FE' }}>Import Questions</h2>
            <p className="text-sm mt-1" style={{ color:'rgba(255,255,255,0.4)' }}>Upload CSV or JSON to populate your quiz</p>
          </div>
          <button type="button" onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="flex p-1 rounded-xl mb-6"
          style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
          {(['csv','json'] as const).map(t => (
            <button key={t} type="button" onClick={() => { setTab(t); setErrors([]) }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all duration-200"
              style={{ background:tab===t?'linear-gradient(135deg,#F43F5E,#7C3AED)':'transparent',
                color:tab===t?'#fff':'rgba(255,255,255,0.38)' }}>
              {t.toUpperCase()} Format
            </button>
          ))}
        </div>

        <button type="button" onClick={downloadTemplate}
          className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl mb-5 transition-all hover:scale-[1.01]"
          style={{ background:'rgba(124,58,237,0.1)', border:'1.5px solid rgba(124,58,237,0.25)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background:'rgba(124,58,237,0.2)' }}>
            <Download size={15} style={{ color:'#A78BFA' }} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold" style={{ color:'#C4B5FD' }}>Download Sample Template</p>
            <p className="text-xs mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>
              See the exact {tab.toUpperCase()} format required
            </p>
          </div>
        </button>

        <div className="rounded-2xl p-4 mb-5" style={{ background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-bold mb-2.5" style={{ color:'rgba(255,255,255,0.3)' }}>FORMAT GUIDE</p>
          {tab === 'csv' ? (
            <div className="space-y-1 text-xs font-mono" style={{ color:'rgba(255,255,255,0.5)' }}>
              <p><span style={{ color:'#67E8F9' }}>type</span> — mcq · poll · wordcloud</p>
              <p><span style={{ color:'#67E8F9' }}>text</span> — question text (required)</p>
              <p><span style={{ color:'#67E8F9' }}>option_a/b/c/d</span> — answer choices (2-4 for mcq/poll)</p>
              <p><span style={{ color:'#67E8F9' }}>correct_option</span> — a/b/c/d (mcq only, required for mcq)</p>
              <p><span style={{ color:'#67E8F9' }}>time_limit</span> — answer seconds (default 20)</p>
              <p><span style={{ color:'#67E8F9' }}>read_time</span> — read phase seconds (default 5)</p>
              <p><span style={{ color:'#67E8F9' }}>points</span> — base points (default 1000 for mcq)</p>
            </div>
          ) : (
            <div className="space-y-1 text-xs font-mono" style={{ color:'rgba(255,255,255,0.5)' }}>
              <p>Array of objects: <span style={{ color:'#67E8F9' }}>type, text, options[], timeLimit, readTime, points</span></p>
              <p>Each option: <span style={{ color:'#67E8F9' }}>{"{ text, isCorrect? }"}</span></p>
              <p>MCQ needs exactly <span style={{ color:'#FCD34D' }}>one</span> option with <span style={{ color:'#67E8F9' }}>isCorrect: true</span></p>
            </div>
          )}
        </div>

        <div onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f=e.dataTransfer.files[0]; if(f) handleFile(f) }}
          onClick={() => fileRef.current?.click()}
          className="rounded-2xl flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-all hover:scale-[1.01]"
          style={{ border:'2px dashed rgba(255,255,255,0.12)', background:'rgba(255,255,255,0.02)' }}>
          <Upload size={28} style={{ color:'rgba(255,255,255,0.3)' }} />
          <p className="text-sm font-semibold" style={{ color:'rgba(255,255,255,0.5)' }}>
            Drop .{tab} file here or click to browse
          </p>
          <input ref={fileRef} type="file" accept={`.${tab}`} className="hidden"
            onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f) }} />
        </div>

        {errors.length > 0 && (
          <div className="mt-4 rounded-2xl p-4" style={{ background:'rgba(239,68,68,0.08)', border:'1.5px solid rgba(239,68,68,0.25)' }}>
            <p className="text-sm font-bold mb-2.5" style={{ color:'#FCA5A5' }}>
              ⚠ {errors.length} error{errors.length!==1?'s':''} — no questions imported
            </p>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-xs font-black flex-shrink-0 mt-0.5" style={{ color:'#F87171' }}>{i+1}.</span>
                  <p className="text-xs" style={{ color:'rgba(252,165,165,0.85)' }}>{err}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── BUILDER SUB-COMPONENTS ──────────────────── */

function ImageInput({ value, onChange, placeholder='Image URL (optional)' }: {
  value?:string; onChange:(v:string)=>void; placeholder?:string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
        style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:value?'#86EFAC':'rgba(255,255,255,0.4)' }}>
        <ImgIcon size={12} /> {value ? 'Image set' : 'Add image'}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-20 flex gap-2 p-3 rounded-2xl"
          style={{ background:'#0E0C26', border:'1px solid rgba(255,255,255,0.1)', minWidth:'280px', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
          <input value={value??''} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} autoFocus
            className="input flex-1 text-xs" style={{ padding:'0.6rem 0.8rem', borderRadius:'10px' }} />
          <button onClick={() => { onChange(''); setOpen(false) }}
            className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0"
            style={{ background:'rgba(239,68,68,0.12)', color:'#FCA5A5' }}>
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════ */
export default function HostPage() {
  const [view, setView]         = useState<'build'|'live'>('build')
  const [title, setTitle]       = useState('My Quiz')
  const [questions, setQ]       = useState<Question[]>(DEFAULT_QUESTIONS as Question[])
  const [busy, setBusy]         = useState(false)
  const [showImport, setImport] = useState(false)

  // live
  const [code, setCode]   = useState('')
  const [hostId, setHID]  = useState('')
  const [snap, setSnap]   = useState<LiveSnap|null>(null)
  const [readLeft, setRL] = useState(0)  // reading phase countdown
  const [qLeft, setQL]    = useState(0)  // question phase countdown
  const readTimer  = useRef<ReturnType<typeof setInterval>|null>(null)
  const qTimer     = useRef<ReturnType<typeof setInterval>|null>(null)
  const calledBegin = useRef(false)
  const prevParticipantCount = useRef(0)

  /* ── Persist builder to localStorage ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) { const d = JSON.parse(saved); setTitle(d.title??'My Quiz'); setQ(d.questions??DEFAULT_QUESTIONS) }
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ title, questions })) } catch {}
  }, [title, questions])

  /* ── Restore live session on mount ── */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY)
      if (saved) {
        const { code: c, hostId: h } = JSON.parse(saved)
        if (c && h) { setCode(c); setHID(h); setView('live') }
      }
    } catch {}
  }, [])

  /* ── SSE ── */
  useEffect(() => {
    if (!code) return
    const es = new EventSource(`/api/stream?code=${code}`)
    es.onmessage = e => { try { setSnap(JSON.parse(e.data)) } catch {} }
    return () => es.close()
  }, [code])

  /* ── Toast when player joins ── */
  useEffect(() => {
    if (!snap) return
    const count = snap.participantCount ?? 0
    if (count > prevParticipantCount.current && prevParticipantCount.current > 0) {
      const newest = snap.participants[snap.participants.length - 1]
      if (newest) toast(`${newest.emoji ?? '🎮'} ${newest.name} joined!`, 'success')
    }
    prevParticipantCount.current = count
  }, [snap?.participantCount])

  /* ── Reading phase: auto-advance to 'begin' after readTime ── */
  useEffect(() => {
    if (readTimer.current) clearInterval(readTimer.current)
    calledBegin.current = false
    if (snap?.phase === 'reading' && snap.readStartedAt && snap.question) {
      const rt = snap.question.readTime ?? 5
      readTimer.current = setInterval(() => {
        const left = Math.max(0, rt - Math.floor((Date.now() - snap.readStartedAt!) / 1000))
        setRL(left)
        if (left <= 0 && !calledBegin.current) {
          calledBegin.current = true
          ctrl('begin')
        }
      }, 200)
    }
    return () => { if (readTimer.current) clearInterval(readTimer.current) }
  }, [snap?.phase, snap?.readStartedAt, snap?.currentQuestionIdx])

  /* ── Question phase timer ── */
  useEffect(() => {
    if (qTimer.current) clearInterval(qTimer.current)
    if (snap?.phase === 'question' && snap.questionStartedAt && snap.question) {
      qTimer.current = setInterval(() => {
        setQL(Math.max(0, snap.question!.timeLimit - Math.floor((Date.now() - snap.questionStartedAt!) / 1000)))
      }, 200)
    }
    return () => { if (qTimer.current) clearInterval(qTimer.current) }
  }, [snap?.phase, snap?.questionStartedAt, snap?.currentQuestionIdx])

  const ctrl = useCallback((action: string) =>
    fetch('/api/control', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, hostId, action }) }), [code, hostId])

  const launch = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/session', { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ title, questions }) })
      const d = await res.json()
      setCode(d.code); setHID(d.hostId)
      localStorage.setItem(SESSION_KEY, JSON.stringify({ code:d.code, hostId:d.hostId }))
      setView('live')
    } catch { toast('Failed to launch. Try again.', 'error') }
    finally { setBusy(false) }
  }

  const endSession = async () => {
    await ctrl('end')
    localStorage.removeItem(SESSION_KEY)
  }

  /* ── Fix: reset state instead of router.push (already on /host) ── */
  const startNewQuiz = () => {
    localStorage.removeItem(SESSION_KEY)
    setView('build')
    setCode('')
    setHID('')
    setSnap(null)
    prevParticipantCount.current = 0
  }

  const duplicateQ = (qi: number) => {
    const copy = { ...questions[qi], id:`q${Date.now()}`, options: questions[qi].options.map(o=>({...o})) }
    setQ(p => [...p.slice(0,qi+1), copy, ...p.slice(qi+1)])
    toast('Question duplicated', 'info', '📋')
  }

  /* ── Question mutations ── */
  const patchQ = (i: number, patch: Partial<Question>) =>
    setQ(p => p.map((q,idx) => idx===i ? {...q,...patch} : q))

  const patchOption = (qi: number, oi: number, patch: object) =>
    setQ(p => p.map((q,i) => i!==qi ? q : {...q, options:q.options.map((o,j) => j!==oi?o:{...o,...patch})}))

  const setCorrect = (qi: number, optId: string) =>
    setQ(p => p.map((q,i) => i!==qi ? q : {...q, options:q.options.map(o=>({...o,isCorrect:o.id===optId}))}))

  const changeType = (qi: number, type: QuestionType) => {
    const base: Partial<Question> = { type, points: type==='mcq' ? 1000 : 0 }
    if (type==='wordcloud') base.options = []
    else if (!questions[qi].options.length)
      base.options = [{id:'a',text:'',isCorrect:true},{id:'b',text:''},{id:'c',text:''},{id:'d',text:''}]
    patchQ(qi, base)
  }

  /* ════════════════════════════════════════════
     BUILDER VIEW
  ════════════════════════════════════════════ */
  if (view === 'build') return (
    <main className="min-h-dvh relative flex flex-col">
      <div className="bg" />
      <ToastContainer />
      {showImport && <ImportModal onClose={() => setImport(false)} onImport={qs => setQ(p => [...p, ...qs])} />}

      {/* Top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 border-b"
        style={{ background:'rgba(7,6,26,0.85)', borderColor:'rgba(255,255,255,0.08)', backdropFilter:'blur(20px)' }}>
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background:'linear-gradient(135deg,#F43F5E,#7C3AED)' }}>⚡</div>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Quiz title..."
            className="bg-transparent border-none outline-none text-xl font-black min-w-0 flex-1"
            style={{ color:'#EDE9FE' }} />
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setImport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.09)', color:'rgba(255,255,255,0.55)' }}>
            <Upload size={13} /> Import
          </button>
          <span className="text-sm font-semibold" style={{ color:'rgba(255,255,255,0.35)' }}>
            {questions.length}Q
          </span>
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.3)' }}>
            by Atul ↗
          </a>
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 relative z-10 max-w-3xl mx-auto w-full px-5 py-8 space-y-6">
        {questions.map((q, qi) => (
          <div key={q.id} className="card p-7 a-up" style={{ animationDelay:`${qi*0.04}s` }}>

            {/* Q header row */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                style={{ background:COLS[qi%4] }}>
                {qi+1}
              </div>
              {/* type pills */}
              <div className="flex gap-1.5 flex-wrap flex-1">
                {(['mcq','poll','wordcloud'] as QuestionType[]).map(t => (
                  <button key={t} onClick={() => changeType(qi,t)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: q.type===t?'rgba(124,58,237,0.22)':'rgba(255,255,255,0.04)',
                      border:`1.5px solid ${q.type===t?'rgba(124,58,237,0.55)':'rgba(255,255,255,0.08)'}`,
                      color: q.type===t?'#A78BFA':'rgba(255,255,255,0.35)',
                    }}>
                    {t==='mcq'?'✓ MCQ':t==='poll'?'📊 Poll':'☁ Word Cloud'}
                  </button>
                ))}
              </div>
              {/* Read time */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color:'rgba(255,255,255,0.35)' }}>Read</span>
                <select value={q.readTime??5} onChange={e => patchQ(qi,{readTime:+e.target.value})}
                  className="text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.55)' }}>
                  {[3,5,7,10].map(t => <option key={t} value={t}>{t}s</option>)}
                </select>
              </div>
              {/* Answer time */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs" style={{ color:'rgba(255,255,255,0.35)' }}>Answer</span>
                <select value={q.timeLimit} onChange={e => patchQ(qi,{timeLimit:+e.target.value})}
                  className="text-xs rounded-xl px-2.5 py-1.5 font-bold focus:outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.55)' }}>
                  {[10,15,20,30,45,60].map(t => <option key={t} value={t}>{t}s</option>)}
                </select>
              </div>
              {/* Points */}
              {q.type==='mcq' && (
                <input type="number" value={q.points} onChange={e=>patchQ(qi,{points:+e.target.value})}
                  className="w-20 text-xs text-center rounded-xl font-black focus:outline-none"
                  style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.08)',
                    color:'#FCD34D', padding:'0.375rem 0.5rem' }} />
              )}
              <button type="button" onClick={() => duplicateQ(qi)}
                className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0 text-xs"
                style={{ background:'rgba(124,58,237,0.1)', color:'#A78BFA', border:'1px solid rgba(124,58,237,0.2)' }}
                title="Duplicate">
                ⎘
              </button>
              <button type="button" onClick={() => setQ(p => p.filter((_,i) => i!==qi))}
                className="w-8 h-8 flex items-center justify-center rounded-xl flex-shrink-0"
                style={{ background:'rgba(239,68,68,0.1)', color:'#FCA5A5', border:'1px solid rgba(239,68,68,0.18)' }}
                title="Delete">
                <Trash2 size={13} />
              </button>
            </div>

            {/* Question text + image */}
            <div className="mb-2">
              <textarea value={q.text} onChange={e => patchQ(qi,{text:e.target.value})}
                placeholder="Type your question here..." rows={2}
                className="input resize-none text-base mb-3" style={{ padding:'0.9rem 1.1rem', fontWeight:500 }} />
              <ImageInput value={q.imageUrl} onChange={v => patchQ(qi,{imageUrl:v})} placeholder="Question image URL..." />
            </div>

            {/* Question image preview */}
            {q.imageUrl && (
              <div className="mt-3 mb-4 rounded-2xl overflow-hidden" style={{ maxHeight:'200px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={q.imageUrl} alt="Question" className="w-full object-cover" style={{ maxHeight:'200px' }} />
              </div>
            )}

            {/* Options */}
            {q.type !== 'wordcloud' && (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {q.options.map((opt, oi) => (
                  <div key={opt.id} className="flex flex-col gap-2 p-3 rounded-2xl"
                    style={{ background:`${COLS[oi]}12`, border:`1px solid ${COLS[oi]}28` }}>
                    <div className="flex items-center gap-2">
                      {q.type==='mcq' && (
                        <button onClick={() => setCorrect(qi, opt.id)}
                          className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all"
                          style={{ borderColor:opt.isCorrect?'#22C55E':'rgba(255,255,255,0.2)',
                                   background:opt.isCorrect?'#22C55E':'transparent' }}>
                          {opt.isCorrect && <Check size={10} className="text-black" strokeWidth={3} />}
                        </button>
                      )}
                      <span className="text-xs font-black flex-shrink-0" style={{ color:COLS[oi] }}>{LABELS[oi]}</span>
                      <input value={opt.text} onChange={e => patchOption(qi,oi,{text:e.target.value})}
                        placeholder={`Option ${LABELS[oi]}`}
                        className="bg-transparent border-none outline-none text-sm flex-1 min-w-0 font-medium"
                        style={{ color:'#EDE9FE' }} />
                    </div>
                    {/* Option image */}
                    <div className="flex items-center gap-2">
                      <ImageInput value={opt.imageUrl} onChange={v => patchOption(qi,oi,{imageUrl:v})}
                        placeholder="Option image URL..." />
                      {opt.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opt.imageUrl} alt="" className="w-12 h-8 rounded-lg object-cover flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {q.type==='wordcloud' && (
              <p className="text-xs italic mt-3" style={{ color:'rgba(255,255,255,0.28)' }}>
                Participants type a single word. A live word cloud builds as they respond.
              </p>
            )}
          </div>
        ))}

        {/* Add Q */}
        <button onClick={() => setQ(p => [...p, {
          id:`q${Date.now()}`, type:'mcq', text:'',
          options:[{id:'a',text:'',isCorrect:true},{id:'b',text:''},{id:'c',text:''},{id:'d',text:''}],
          timeLimit:20, readTime:5, points:1000
        }])}
          className="w-full py-5 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold transition-colors"
          style={{ background:'rgba(255,255,255,0.02)', border:'2px dashed rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.35)' }}>
          <Plus size={16} /> Add Question
        </button>
      </div>

      {/* Launch bar */}
      <div className="sticky bottom-0 z-30 px-5 py-4 border-t"
        style={{ background:'rgba(7,6,26,0.93)', borderColor:'rgba(255,255,255,0.08)', backdropFilter:'blur(20px)' }}>
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <p className="text-xs flex-shrink-0" style={{ color:'rgba(255,255,255,0.28)' }}>
            ~{Math.round(questions.reduce((a,q)=>(a+(q.readTime??5)+q.timeLimit),0)/60)}min
          </p>
          <button onClick={launch} disabled={busy || questions.length===0} className="btn flex-1 py-4 text-base">
            {busy
              ? <span className="flex items-center gap-2.5">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Launching...
                </span>
              : `🚀 Launch Game · ${questions.length} Question${questions.length!==1?'s':''}`}
          </button>
        </div>
      </div>
    </main>
  )

  /* ════════════════════════════════════════════
     LIVE CONTROL VIEW
  ════════════════════════════════════════════ */

  const s = snap
  const q = s?.question
  const maxCount = Math.max(...Object.values(s?.answerCounts??{}), 1)
  const totalAnswered = Object.values(s?.answerCounts??{}).reduce((a,b)=>a+b,0)
  const joinUrl = typeof window !== 'undefined' ? `${window.location.origin}/?code=${code}` : ''

  return (
    <main className="min-h-dvh relative flex flex-col">
      <div className="bg" />
      <ToastContainer />

      {/* Live top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-6 py-3 border-b"
        style={{ background:'rgba(7,6,26,0.9)', borderColor:'rgba(255,255,255,0.08)', backdropFilter:'blur(20px)' }}>
        <div>
          <h1 className="font-black text-base" style={{ color:'#EDE9FE' }}>{title}</h1>
          <p className="text-xs font-medium" style={{ color:'rgba(255,255,255,0.35)' }}>
            {s?.phase==='lobby' ? 'Lobby'
             : s?.phase==='reading' ? `Reading · Q${(s.currentQuestionIdx)+1}/${s.totalQuestions}`
             : s?.phase==='question' ? `Live · Q${(s?.currentQuestionIdx??0)+1}/${s?.totalQuestions}`
             : s?.phase==='reveal' ? 'Reveal'
             : 'Ended'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
            style={{ background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.25)' }}>
            <Users size={14} style={{ color:'#A78BFA' }} />
            <span className="font-black text-base glow-violet">{s?.participantCount??0}</span>
          </div>
          <div className="px-4 py-2 rounded-xl"
            style={{ background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.25)' }}>
            <p className="text-xl font-black tracking-widest glow-pink">{code}</p>
          </div>
          {s?.phase !== 'ended' && (
            <button onClick={endSession} className="text-xs px-3 py-2 rounded-xl font-semibold"
              style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)', color:'#FCA5A5' }}>
              End
            </button>
          )}
        </div>
      </div>

      {/* ── LOBBY ── */}
      {s?.phase==='lobby' && (
        <div className="flex-1 relative z-10 flex gap-0">

          {/* Left: QR + code */}
          <div className="flex flex-col items-center justify-center px-16 py-12 border-r"
            style={{ width:'50%', borderColor:'rgba(255,255,255,0.07)' }}>
            <p className="label mb-6">Players join at</p>

            {/* QR */}
            <div className="p-5 rounded-3xl mb-8" style={{ background:'#fff' }}>
              {joinUrl && <QRCode value={joinUrl} size={200} />}
            </div>

            <div className="text-center mb-6">
              <p className="text-8xl font-black tracking-[0.15em] glow-pink mb-2">{code}</p>
              <p className="text-sm" style={{ color:'rgba(255,255,255,0.35)' }}>
                Scan QR or visit this site and enter the code
              </p>
            </div>

            <div className="px-5 py-3 rounded-2xl text-sm font-mono"
              style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)' }}>
              {joinUrl}
            </div>
          </div>

          {/* Right: player list + start */}
          <div className="flex flex-col px-12 py-12" style={{ width:'50%' }}>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-black" style={{ color:'#EDE9FE' }}>
                  Waiting for players
                </h2>
                <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                  style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)' }}>
                  <span className="font-black text-2xl glow-violet">{s.participantCount}</span>
                  <span className="text-sm" style={{ color:'rgba(255,255,255,0.45)' }}>joined</span>
                </div>
              </div>

              {/* Player list */}
              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {(s.participants??[]).length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-4xl mb-4">👾</p>
                    <p className="font-semibold" style={{ color:'rgba(255,255,255,0.35)' }}>
                      Players will appear here
                    </p>
                  </div>
                ) : (s.participants??[]).map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-2xl a-slide"
                    style={{ animationDelay:`${i*0.05}s`, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                      style={{ background:`${COLS[i%4]}20`, border:`1px solid ${COLS[i%4]}30` }}>
                      {p.emoji ?? '🎮'}
                    </div>
                    <span className="font-semibold flex-1">{p.name}</span>
                    <span className="text-xs" style={{ color:'rgba(255,255,255,0.25)' }}>#{i+1}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <button onClick={() => ctrl('start')} disabled={(s.participantCount??0)===0}
                className="btn w-full py-5 text-xl">
                Start the Game 🚀
              </button>
              {(s.participantCount??0)===0 && (
                <p className="text-center text-xs mt-3" style={{ color:'rgba(255,255,255,0.28)' }}>
                  Need at least 1 player to start
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── READING PHASE ── */}
      {s?.phase==='reading' && q && (
        <div className="flex-1 relative z-10 flex flex-col items-center justify-center px-16 py-12 text-center">
          <div className="w-full max-w-3xl">
            <p className="label mb-6">Get Ready — Question {(s.currentQuestionIdx)+1} of {s.totalQuestions}</p>

            <div className="card p-10 mb-8 a-down">
              <p className="text-4xl font-black leading-tight mb-6" style={{ color:'#EDE9FE' }}>{q.text}</p>
              {q.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.imageUrl} alt="Question" className="rounded-2xl max-h-64 mx-auto object-cover" />
              )}
            </div>

            <div className="flex items-center justify-center gap-4">
              <CountdownRing timeLeft={readLeft} total={q.readTime??5} size={120} label="Read time" />
              <div className="text-left">
                <p className="text-2xl font-black mb-1" style={{ color:'#EDE9FE' }}>Reading time</p>
                <p className="text-base" style={{ color:'rgba(255,255,255,0.45)' }}>
                  Answer tiles appear when timer ends
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── QUESTION LIVE ── */}
      {s?.phase==='question' && q && (
        <div className="flex-1 relative z-10 flex gap-0">
          {/* Left: question + timer */}
          <div className="flex flex-col justify-center px-14 py-10 border-r"
            style={{ width:'55%', borderColor:'rgba(255,255,255,0.07)' }}>

            <div className="flex items-start gap-6 mb-8">
              <CountdownRing timeLeft={qLeft} total={q.timeLimit} size={110} />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                    style={{ background:'rgba(244,63,94,0.12)', color:'#FDA4AF' }}>
                    Q{(s.currentQuestionIdx)+1} / {s.totalQuestions}
                  </span>
                  <span className="text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{ background:'rgba(255,255,255,0.05)', color:'rgba(255,255,255,0.4)' }}>
                    {totalAnswered} / {s.participantCount} answered
                  </span>
                </div>
                <p className="text-3xl font-black leading-snug" style={{ color:'#EDE9FE' }}>{q.text}</p>
              </div>
            </div>

            {q.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={q.imageUrl} alt="Q" className="rounded-2xl max-h-48 object-cover mb-8" />
            )}

            <div className="px-5 py-3.5 rounded-2xl flex items-center gap-3 mb-8"
              style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)' }}>
              <span>⚡</span>
              <p className="text-sm font-semibold" style={{ color:'rgba(245,158,11,0.85)' }}>
                Speed scoring: faster correct answer = more points (up to {q.points.toLocaleString()})
              </p>
            </div>

            <button onClick={() => ctrl('reveal')} className="btn py-4 text-base">
              Reveal Answers <ChevronRight size={18} />
            </button>
          </div>

          {/* Right: answer bars */}
          <div className="flex flex-col justify-center px-10 py-10" style={{ width:'45%' }}>
            <p className="label mb-6">Live Responses</p>
            {q.type!=='wordcloud' && (
              <div className="space-y-4">
                {q.options.map((opt,i) => {
                  const count = s.answerCounts[opt.id]??0
                  return (
                    <div key={opt.id}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
                            style={{ background:`${COLS[i]}22`, color:COLS[i] }}>
                            {LABELS[i]}
                          </div>
                          <span className="font-semibold text-sm" style={{ color:'#EDE9FE' }}>
                            {opt.text||`Option ${LABELS[i]}`}
                          </span>
                        </div>
                        <span className="font-black text-lg" style={{ color:COLS[i] }}>{count}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width:`${(count/maxCount)*100}%`, background:COLS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            {q.type==='wordcloud' && (
              <div className="card p-6 flex flex-wrap gap-3 min-h-[200px] items-center content-center">
                {Object.entries(s.wordMap??{}).sort((a,b)=>b[1]-a[1]).map(([word,cnt]) => (
                  <span key={word} className="px-4 py-2 rounded-full font-bold"
                    style={{ fontSize:`${Math.min(1.8,0.85+cnt*0.28)}rem`,
                      background:'rgba(124,58,237,0.18)', color:'#C4B5FD',
                      border:'1px solid rgba(124,58,237,0.4)' }}>
                    {word}{cnt>1&&<sup className="opacity-50 text-xs ml-1">×{cnt}</sup>}
                  </span>
                ))}
                {!Object.keys(s.wordMap??{}).length && (
                  <p className="w-full text-center text-sm" style={{ color:'rgba(255,255,255,0.25)' }}>
                    Waiting for responses...
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── REVEAL + LEADERBOARD ── */}
      {s?.phase==='reveal' && q && (
        <div className="flex-1 relative z-10 flex gap-0">

          {/* Left: answer breakdown */}
          <div className="flex flex-col justify-center px-12 py-10 border-r"
            style={{ width:'55%', borderColor:'rgba(255,255,255,0.07)' }}>
            <p className="label mb-3">Answers Revealed · Q{(s.currentQuestionIdx)+1}</p>
            <p className="text-2xl font-black mb-8" style={{ color:'#EDE9FE' }}>{q.text}</p>

            {q.type!=='wordcloud' && (
              <div className="space-y-4 mb-8">
                {q.options.map((opt,i) => {
                  const count = s.answerCounts[opt.id]??0
                  const isC   = q.type==='mcq' && opt.isCorrect
                  return (
                    <div key={opt.id} className="p-4 rounded-2xl"
                      style={{ background:isC?'rgba(34,197,94,0.1)':'rgba(255,255,255,0.03)',
                        border:`2px solid ${isC?'#22C55E':'rgba(255,255,255,0.07)'}`,
                        boxShadow:isC?'0 0 24px rgba(34,197,94,0.22)':'none' }}>
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2.5">
                          {isC && <Check size={14} style={{ color:'#22C55E' }} />}
                          <span className="font-bold" style={{ color:isC?'#86EFAC':'#EDE9FE' }}>{opt.text}</span>
                        </div>
                        <span className="font-black text-lg" style={{ color:isC?'#22C55E':COLS[i] }}>{count}</span>
                      </div>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width:`${(count/maxCount)*100}%`, background:isC?'#22C55E':COLS[i] }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button onClick={() => ctrl('next')} className="btn py-4 text-base">
              {(s.currentQuestionIdx)+1>=s.totalQuestions ? '🏆 Final Results' : `Next Question →`}
            </button>
          </div>

          {/* Right: live leaderboard */}
          <div className="flex flex-col px-10 py-10" style={{ width:'45%' }}>
            <p className="label mb-6">🏆 Leaderboard</p>
            <div className="space-y-3 flex-1">
              {s.leaderboard.slice(0,10).map((p,i) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-4 rounded-2xl a-slide"
                  style={{ animationDelay:`${i*0.06}s`,
                    background: i===0?'rgba(252,211,77,0.08)':i===1?'rgba(180,180,190,0.06)':i===2?'rgba(205,127,50,0.06)':'rgba(255,255,255,0.03)',
                    border:`1px solid ${i===0?'rgba(252,211,77,0.2)':i===1?'rgba(180,180,190,0.15)':i===2?'rgba(205,127,50,0.15)':'rgba(255,255,255,0.06)'}` }}>
                  <span className="text-lg w-7 text-center flex-shrink-0">
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}
                  </span>
                  <span className="text-xl flex-shrink-0">{p.emoji ?? '🎮'}</span>
                  <span className="flex-1 font-bold text-sm" style={{ color:'#EDE9FE' }}>{p.name}</span>
                  {(p.streak ?? 0) >= 2 && <span className="text-sm">{'🔥'.repeat(Math.min(p.streak ?? 0, 3))}</span>}
                  <span className="font-black"
                    style={{ color: i===0?'#FCD34D':i===1?'#CBD5E1':i===2?'#D97706':'#A78BFA' }}>
                    {p.score.toLocaleString()}
                  </span>
                </div>
              ))}
              {s.leaderboard.length===0 && (
                <p className="text-center text-sm py-8" style={{ color:'rgba(255,255,255,0.3)' }}>
                  Scores will appear here
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── ENDED ── */}
      {s?.phase==='ended' && (
        <div className="flex-1 relative z-10 flex gap-0">
          <Confetti active={true} />

          {/* Podium */}
          <div className="flex flex-col items-center justify-center px-16 py-12 border-r"
            style={{ width:'50%', borderColor:'rgba(255,255,255,0.07)' }}>
            <p className="text-4xl mb-8">🏆</p>
            <h2 className="text-3xl font-black mb-10" style={{ color:'#EDE9FE' }}>Final Results</h2>

            {s.leaderboard.length>=2 && (
              <div className="flex items-end justify-center gap-6 w-full max-w-sm mb-8">
                {[1,0,2].map(rank => {
                  const p = s.leaderboard[rank]; if (!p) return null
                  const hs=[140,180,110], cs=['rgba(180,180,190,1)','rgba(255,214,0,1)','rgba(205,127,50,1)'], em=['🥈','🥇','🥉']
                  return (
                    <div key={p.id} className="flex-1 flex flex-col items-center">
                      <p className="text-2xl mb-1">{em[rank]}</p>
                      <p className="text-xs font-black truncate w-full text-center mb-1" style={{ color:'#EDE9FE' }}>{p.name}</p>
                      <p className="text-xs font-bold mb-2" style={{ color:cs[rank] }}>{p.score.toLocaleString()}</p>
                      <div className="w-full rounded-t-2xl"
                        style={{ height:hs[rank], background:`${cs[rank]}14`,
                          border:`2px solid ${cs[rank]}50`, boxShadow:`0 0 20px ${cs[rank]}25` }} />
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex gap-3 w-full">
              <a href={`/api/export?code=${code}&hostId=${hostId}`}
                className="btn flex-1 py-3.5 text-sm flex items-center justify-center gap-2">
                <Download size={14}/> Export CSV
              </a>
              <button onClick={startNewQuiz} className="btn-ghost flex-1 py-3.5 text-sm">
                New Quiz →
              </button>
            </div>
          </div>

          {/* Full leaderboard */}
          <div className="flex flex-col px-12 py-12" style={{ width:'50%' }}>
            <p className="label mb-6">Final Rankings</p>
            <div className="space-y-2.5">
              {s.leaderboard.map((p,i) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-4 rounded-2xl"
                  style={{ background:i===0?'rgba(252,211,77,0.07)':'rgba(255,255,255,0.03)',
                    border:`1px solid ${i===0?'rgba(252,211,77,0.18)':'rgba(255,255,255,0.06)'}` }}>
                  <span className="text-base w-7 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                  <span className="text-lg flex-shrink-0">{p.emoji ?? '🎮'}</span>
                  <span className="flex-1 font-bold" style={{ color:'#EDE9FE' }}>{p.name}</span>
                  {(p.streak ?? 0) >= 2 && <span className="text-sm">{'🔥'.repeat(Math.min(p.streak ?? 0, 3))}</span>}
                  <span className="font-black" style={{ color:i===0?'#FCD34D':'#A78BFA' }}>{p.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
