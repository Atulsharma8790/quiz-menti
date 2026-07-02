'use client'
import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Confetti } from '../../../components/Confetti'
import { CountdownRing } from '../../../components/CountdownRing'

const TILE_CLS  = ['tile-a','tile-b','tile-c','tile-d']
const TILE_COLS = ['#E11D48','#7C3AED','#0891B2','#EA580C']
const LABELS    = ['A','B','C','D']

interface Q {
  id:string; text:string; type:string; points:number; timeLimit:number; readTime:number;
  imageUrl?:string;
  options:{id:string;text:string;isCorrect?:boolean;imageUrl?:string}[]
}
interface Snap {
  phase:string; title:string
  currentQuestionIdx:number; totalQuestions:number
  question:Q|null; readStartedAt?:number; questionStartedAt?:number
  leaderboard:{id:string;name:string;score:number}[]
  answerCounts:Record<string,number>; wordMap:Record<string,number>
  participantCount:number
}

function livePoints(base:number, timeLimit:number, elapsedSec:number) {
  const f = Math.max(0, 1 - elapsedSec / timeLimit)
  return Math.round(base * (0.1 + 0.9 * f))
}

export default function PlayPage() {
  const { code } = useParams<{code:string}>()
  const router   = useRouter()

  const pid        = typeof window !== 'undefined' ? (sessionStorage.getItem(`qm_pid_${code}`)??'') : ''
  const playerName = typeof window !== 'undefined' ? (sessionStorage.getItem(`qm_name_${code}`)??'You') : 'You'

  const [snap, setSnap]             = useState<Snap|null>(null)
  const [picked, setPicked]         = useState<string|null>(null)
  const [resultInfo, setResultInfo] = useState<{isCorrect:boolean;pts:number}|null>(null)
  const [word, setWord]             = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [showConf, setShowConf]     = useState(false)
  const [readLeft, setRL]           = useState(0)
  const [qLeft, setQL]              = useState(0)
  const [lastQIdx, setLastQIdx]     = useState(-1)
  const readTimer = useRef<ReturnType<typeof setInterval>|null>(null)
  const qTimer    = useRef<ReturnType<typeof setInterval>|null>(null)

  useEffect(() => { if (!pid) router.replace('/') }, [pid, router])

  // SSE
  useEffect(() => {
    const es = new EventSource(`/api/stream?code=${code}`)
    es.onmessage = e => { try { setSnap(JSON.parse(e.data)) } catch {} }
    return () => es.close()
  }, [code])

  // Reset on new question
  useEffect(() => {
    if (!snap) return
    if (snap.currentQuestionIdx !== lastQIdx) {
      setLastQIdx(snap.currentQuestionIdx)
      setPicked(null); setWord(''); setSubmitted(false); setResultInfo(null)
    }
  }, [snap?.currentQuestionIdx, snap?.phase])

  // Reading timer
  useEffect(() => {
    if (readTimer.current) clearInterval(readTimer.current)
    if (snap?.phase==='reading' && snap.readStartedAt && snap.question) {
      const rt = snap.question.readTime ?? 5
      readTimer.current = setInterval(() =>
        setRL(Math.max(0, rt - Math.floor((Date.now() - snap.readStartedAt!) / 1000))), 200)
    }
    return () => { if (readTimer.current) clearInterval(readTimer.current) }
  }, [snap?.phase, snap?.readStartedAt, snap?.currentQuestionIdx])

  // Question timer
  useEffect(() => {
    if (qTimer.current) clearInterval(qTimer.current)
    if (snap?.phase==='question' && snap.questionStartedAt && snap.question) {
      qTimer.current = setInterval(() =>
        setQL(Math.max(0, snap.question!.timeLimit - Math.floor((Date.now() - snap.questionStartedAt!) / 1000))), 200)
    }
    return () => { if (qTimer.current) clearInterval(qTimer.current) }
  }, [snap?.phase, snap?.questionStartedAt, snap?.currentQuestionIdx])

  // Confetti on end
  useEffect(() => {
    if (snap?.phase==='ended') {
      setShowConf(true)
      const t = setTimeout(() => setShowConf(false), 5500)
      return () => clearTimeout(t)
    }
  }, [snap?.phase])

  const submitAnswer = async (optionId: string) => {
    if (submitted || !snap?.question) return
    setPicked(optionId); setSubmitted(true)
    const res  = await fetch('/api/answer', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, participantId:pid, questionId:snap.question.id, value:optionId }) })
    const data = await res.json()
    if (data.ok) setResultInfo({ isCorrect:data.isCorrect, pts:data.pointsAwarded })
  }

  const submitWord = async () => {
    if (!word.trim() || submitted || !snap?.question) return
    setSubmitted(true)
    await fetch('/api/answer', { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ code, participantId:pid, questionId:snap.question.id, value:word.trim() }) })
  }

  if (!snap) return (
    <main className="min-h-dvh flex items-center justify-center">
      <div className="bg" />
      <div className="relative z-10 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-violet-400 border-t-transparent animate-spin mx-auto mb-5" />
        <p style={{ color:'rgba(255,255,255,0.38)' }}>Connecting...</p>
      </div>
    </main>
  )

  const q       = snap.question
  const myEntry = snap.leaderboard.find(p => p.id===pid)
  const myRank  = myEntry ? snap.leaderboard.findIndex(p=>p.id===pid)+1 : null
  const elapsedSec = snap.questionStartedAt ? (Date.now()-snap.questionStartedAt)/1000 : 0
  const potentialPts = q && snap.phase==='question' ? livePoints(q.points, q.timeLimit, elapsedSec) : 0

  /* ── LOBBY ── */
  if (snap.phase==='lobby') return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6 relative">
      <div className="bg" />
      <div className="relative z-10 w-full max-w-md text-center">
        <div className="relative inline-flex mb-10">
          <div className="absolute inset-0 rounded-full pulse" style={{ background:'linear-gradient(135deg,#F43F5E,#7C3AED)' }} />
          <div className="relative w-28 h-28 rounded-full flex items-center justify-center"
            style={{ background:'linear-gradient(135deg,#F43F5E,#7C3AED)', boxShadow:'0 16px 56px rgba(244,63,94,0.55)' }}>
            <span className="text-5xl">⚡</span>
          </div>
        </div>
        <h2 className="text-4xl font-black mb-3" style={{ color:'#EDE9FE' }}>{snap.title}</h2>
        <p className="text-base mb-10" style={{ color:'rgba(255,255,255,0.42)' }}>
          You&apos;re in! Waiting for the host to start.
        </p>
        <div className="inline-flex items-center gap-3 px-7 py-5 rounded-3xl mb-10"
          style={{ background:'rgba(244,63,94,0.1)', border:'2px solid rgba(244,63,94,0.25)' }}>
          <span className="text-3xl">👾</span>
          <span className="text-2xl font-black glow-pink">{playerName}</span>
        </div>
        <div className="flex items-center justify-center gap-2 mb-8" style={{ color:'rgba(255,255,255,0.4)' }}>
          <span>👥</span>
          <span className="font-black text-xl glow-violet">{snap.participantCount}</span>
          <span>{snap.participantCount!==1?'players':'player'} in lobby</span>
        </div>
        <div className="flex justify-center gap-3">
          {[0,1,2].map(i => (
            <div key={i} className="w-3 h-3 rounded-full"
              style={{ background:'#7C3AED', animation:`pulse ${1.4+i*0.2}s ease-in-out ${i*0.2}s infinite alternate`,
                opacity:0.6 }} />
          ))}
        </div>
        <style>{`@keyframes pulse { from{opacity:0.25;transform:scale(0.75)} to{opacity:0.95;transform:scale(1.1)} }`}</style>
      </div>
    </main>
  )

  /* ── READING PHASE ── */
  if (snap.phase==='reading' && q) return (
    <main className="min-h-dvh flex flex-col relative">
      <div className="bg" />

      {/* HUD */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-xs font-bold" style={{ color:'rgba(255,255,255,0.3)' }}>
            Q{snap.currentQuestionIdx+1} of {snap.totalQuestions}
          </p>
          <p className="text-sm font-bold mt-0.5" style={{ color:'rgba(255,255,255,0.5)' }}>{playerName}</p>
        </div>
        <CountdownRing timeLeft={readLeft} total={q.readTime??5} size={72} />
        <div className="text-right">
          <p className="text-xs font-bold" style={{ color:'rgba(255,255,255,0.3)' }}>Score</p>
          <p className="font-black text-xl glow-violet">{myEntry?.score.toLocaleString()??'0'}</p>
        </div>
      </div>

      {/* Read time banner */}
      <div className="relative z-10 px-6 py-3 flex items-center justify-center gap-2"
        style={{ background:'rgba(245,158,11,0.08)', borderBottom:'1px solid rgba(245,158,11,0.15)' }}>
        <span className="text-lg read-tick">👀</span>
        <p className="text-sm font-bold" style={{ color:'rgba(245,158,11,0.9)' }}>
          Read the question — answer tiles appear when time is up
        </p>
      </div>

      {/* Question */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {q.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={q.imageUrl} alt="Question" className="rounded-3xl w-full max-h-72 object-cover mb-8" />
          )}
          <p className="text-3xl font-black leading-tight text-center" style={{ color:'#EDE9FE' }}>{q.text}</p>
        </div>
      </div>
    </main>
  )

  /* ── QUESTION (tiles visible) ── */
  if (snap.phase==='question' && q) return (
    <main className="min-h-dvh flex flex-col relative">
      <div className="bg" />

      {/* HUD */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-4 border-b"
        style={{ borderColor:'rgba(255,255,255,0.07)' }}>
        <div>
          <p className="text-xs font-bold" style={{ color:'rgba(255,255,255,0.3)' }}>
            Q{snap.currentQuestionIdx+1}/{snap.totalQuestions}
          </p>
          <p className="text-sm font-bold" style={{ color:'rgba(255,255,255,0.5)' }}>{playerName}</p>
        </div>
        <CountdownRing timeLeft={qLeft} total={q.timeLimit} size={80} />
        <div className="text-right">
          <p className="text-xs font-bold" style={{ color:'rgba(255,255,255,0.3)' }}>Score</p>
          <p className="font-black text-xl glow-violet">{myEntry?.score.toLocaleString()??'0'}</p>
        </div>
      </div>

      {/* Speed bar */}
      {q.type==='mcq' && !submitted && (
        <div className="relative z-10 px-6 py-3 flex items-center gap-3"
          style={{ borderBottom:'1px solid rgba(255,255,255,0.05)', background:'rgba(0,0,0,0.2)' }}>
          <span className="text-xs font-bold" style={{ color:'rgba(245,158,11,0.75)' }}>⚡ Speed bonus</span>
          <div className="flex-1 speed-track">
            <div className="speed-fill" style={{ width:`${(qLeft/q.timeLimit)*100}%` }} />
          </div>
          <span className="font-black text-sm tabular-nums w-16 text-right"
            style={{ color:'rgba(245,158,11,0.9)' }}>
            +{potentialPts}pts
          </span>
        </div>
      )}

      {/* Question text */}
      <div className="relative z-10 px-6 py-6 flex-shrink-0">
        {q.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={q.imageUrl} alt="Question" className="rounded-2xl w-full max-h-44 object-cover mb-4" />
        )}
        <p className="text-2xl font-black leading-snug text-center" style={{ color:'#EDE9FE' }}>{q.text}</p>
      </div>

      {/* Tiles */}
      <div className="relative z-10 flex-1 px-5 pb-6 flex flex-col justify-center">
        {q.type!=='wordcloud' && (
          <div className="grid grid-cols-2 gap-4">
            {q.options.map((opt,i) => (
              <button key={opt.id} disabled={submitted} onClick={() => submitAnswer(opt.id)}
                className={`tile ${TILE_CLS[i]} ${picked===opt.id?'chosen':''} a-zoom flex-col items-start`}
                style={{ animationDelay:`${i*0.07}s`, minHeight:'100px', gap:'12px' }}>
                <div className="badge">{LABELS[i]}</div>
                {opt.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opt.imageUrl} alt="" className="w-full rounded-xl object-cover" style={{ maxHeight:'100px' }} />
                )}
                <span className="text-base font-bold leading-snug">{opt.text||`Option ${LABELS[i]}`}</span>
                {picked===opt.id && (
                  <div className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background:'rgba(255,255,255,0.2)' }}>
                    <span className="text-sm font-black">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {q.type==='wordcloud' && (
          <div className="card p-8 max-w-lg mx-auto w-full">
            <p className="text-base text-center mb-6" style={{ color:'rgba(255,255,255,0.5)' }}>
              Type your one-word answer
            </p>
            <div className="flex gap-3">
              <input value={word} onChange={e => setWord(e.target.value.split(' ')[0].slice(0,24))}
                onKeyDown={e => e.key==='Enter'&&submitWord()} disabled={submitted}
                placeholder="Your word..." className="input flex-1 text-xl font-bold text-center"
                style={{ padding:'1rem' }} autoFocus />
              <button onClick={submitWord} disabled={submitted||!word.trim()} className="btn px-7">Send</button>
            </div>
            {submitted && <p className="text-center mt-5 font-bold glow-lime">✓ Submitted!</p>}
          </div>
        )}

        {submitted && q.type!=='wordcloud' && (
          <div className="mt-5 text-center">
            {resultInfo ? (
              <div className={`inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold a-bounce ${resultInfo.isCorrect ? '' : ''}`}
                style={{
                  background: resultInfo.isCorrect ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.1)',
                  border: `1.5px solid ${resultInfo.isCorrect ? 'rgba(34,197,94,0.35)' : 'rgba(239,68,68,0.3)'}`,
                  color: resultInfo.isCorrect ? '#86EFAC' : '#FCA5A5',
                }}>
                <span className="text-xl">{resultInfo.isCorrect ? '🎯' : '💀'}</span>
                <span>{resultInfo.isCorrect ? `+${resultInfo.pts} points!` : 'Wrong answer'}</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl"
                style={{ background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.25)', color:'#C4B5FD' }}>
                <span className="animate-spin">⏳</span>
                <p className="text-sm font-semibold">Locked in — waiting for reveal...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )

  /* ── REVEAL + LEADERBOARD ── */
  if (snap.phase==='reveal' && q) {
    const correctId = q.type==='mcq' ? q.options.find(o=>o.isCorrect)?.id : null
    const isRight   = q.type!=='mcq' || picked===correctId
    const maxCount  = Math.max(...Object.values(snap.answerCounts), 1)

    return (
      <main className="min-h-dvh flex flex-col relative">
        <div className="bg" />
        <Confetti active={isRight && q.type==='mcq'} />

        {/* Result banner */}
        <div className={`relative z-10 py-8 px-6 text-center border-b ${isRight?'a-bounce':'a-shake'}`}
          style={{
            background: isRight
              ? 'linear-gradient(180deg,rgba(34,197,94,0.16),transparent)'
              : 'linear-gradient(180deg,rgba(239,68,68,0.14),transparent)',
            borderColor:'rgba(255,255,255,0.07)',
          }}>
          <p className="text-6xl mb-3">{q.type==='wordcloud'?'☁':isRight?'🎯':'💀'}</p>
          <h2 className={`text-3xl font-black ${isRight?'glow-lime':'text-red-400'}`}>
            {q.type==='wordcloud'?'Word received!':isRight?'Correct! 🔥':'Wrong answer'}
          </h2>
          {resultInfo?.isCorrect && (
            <p className="text-xl font-bold mt-2 glow-amber">+{resultInfo.pts} points earned!</p>
          )}
        </div>

        {/* 2-column: answers left, leaderboard right */}
        <div className="flex-1 relative z-10 flex gap-0">

          {/* Left: answer breakdown */}
          <div className="flex flex-col px-8 py-8 border-r" style={{ width:'55%', borderColor:'rgba(255,255,255,0.07)' }}>
            <p className="text-sm font-bold mb-2" style={{ color:'rgba(255,255,255,0.5)' }}>{q.text}</p>

            {q.type!=='wordcloud' && (
              <div className="space-y-3 mt-4">
                {q.options.map((opt,i) => {
                  const isC  = q.type==='mcq' && opt.isCorrect
                  const isP  = picked===opt.id
                  const count = snap.answerCounts[opt.id]??0
                  return (
                    <div key={opt.id}
                      className={`tile ${TILE_CLS[i]} ${isC?'correct':isP&&!isC?'wrong':'dimmed'} flex-col`}
                      style={{ cursor:'default', minHeight:'auto', gap:'10px' }}>
                      <div className="flex items-center gap-3 w-full">
                        <div className="badge">{LABELS[i]}</div>
                        <span className="flex-1 font-bold">{opt.text}</span>
                        <span className="font-black text-base">{count}</span>
                        {isC && <span className="text-xs glow-lime font-bold">✓</span>}
                        {isP && !isC && <span className="text-xs font-bold" style={{ color:'#FCA5A5' }}>✗ yours</span>}
                      </div>
                      <div className="bar-track w-full">
                        <div className="bar-fill" style={{ width:`${(count/maxCount)*100}%`,
                          background:isC?'#22C55E':TILE_COLS[i] }} />
                      </div>
                      {opt.imageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={opt.imageUrl} alt="" className="w-full rounded-xl object-cover max-h-24" />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {q.type==='wordcloud' && (
              <div className="flex flex-wrap gap-2.5 mt-4 p-5 rounded-2xl"
                style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)' }}>
                {Object.entries(snap.wordMap??{}).sort((a,b)=>b[1]-a[1]).map(([w,c]) => (
                  <span key={w} className="px-4 py-2 rounded-full font-bold"
                    style={{ fontSize:`${Math.min(1.7,0.85+c*0.28)}rem`,
                      background:'rgba(124,58,237,0.2)', color:'#C4B5FD', border:'1px solid rgba(124,58,237,0.4)' }}>
                    {w}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Right: leaderboard */}
          <div className="flex flex-col px-8 py-8" style={{ width:'45%' }}>
            <p className="label mb-5">🏆 Leaderboard</p>
            <div className="space-y-2.5 flex-1">
              {snap.leaderboard.slice(0,8).map((p,i) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3.5 rounded-2xl a-slide"
                  style={{ animationDelay:`${i*0.06}s`,
                    background: p.id===pid ? 'rgba(124,58,237,0.14)' : i===0?'rgba(252,211,77,0.07)':'rgba(255,255,255,0.03)',
                    border:`1px solid ${p.id===pid?'rgba(124,58,237,0.35)':i===0?'rgba(252,211,77,0.2)':'rgba(255,255,255,0.06)'}` }}>
                  <span className="text-base w-7 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                  <span className="flex-1 font-bold text-sm" style={{ color:p.id===pid?'#C4B5FD':'#EDE9FE' }}>
                    {p.name}{p.id===pid&&' (you)'}
                  </span>
                  <span className="font-black" style={{ color:i===0?'#FCD34D':p.id===pid?'#A78BFA':'rgba(255,255,255,0.45)' }}>
                    {p.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
            {myRank && (
              <div className="mt-4 px-4 py-3 rounded-2xl text-center"
                style={{ background:'rgba(244,63,94,0.08)', border:'1px solid rgba(244,63,94,0.2)' }}>
                <p className="text-sm font-bold" style={{ color:'rgba(255,255,255,0.5)' }}>Your position</p>
                <p className="text-2xl font-black glow-pink mt-1">#{myRank}</p>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  /* ── ENDED ── */
  if (snap.phase==='ended') {
    const total = snap.leaderboard.length
    const medal = myRank===1?'🥇':myRank===2?'🥈':myRank===3?'🥉':null

    return (
      <main className="min-h-dvh flex flex-col relative">
        <div className="bg" />
        <Confetti active={showConf} />

        <div className="flex-1 relative z-10 flex gap-0">
          {/* Left: personal result */}
          <div className="flex flex-col items-center justify-center px-12 py-12 border-r"
            style={{ width:'45%', borderColor:'rgba(255,255,255,0.07)' }}>
            <p className="text-8xl mb-6 a-bounce">{medal ?? (myRank && myRank<=Math.ceil(total/2)?'🔥':'👾')}</p>
            <p className="text-6xl font-black mb-2 glow-violet a-up d1">{myEntry?.score.toLocaleString()??'0'}</p>
            <p className="text-base mb-8 a-up d2" style={{ color:'rgba(255,255,255,0.4)' }}>total points</p>
            {myRank && (
              <div className="px-8 py-4 rounded-2xl font-black text-xl mb-10 a-zoom d2"
                style={{ background:'rgba(244,63,94,0.1)', border:'1.5px solid rgba(244,63,94,0.3)', color:'#FDA4AF' }}>
                #{myRank} of {total} players
              </div>
            )}
            <button onClick={() => router.replace('/')} className="btn w-full py-4 text-base a-up d3">
              Play Again 🚀
            </button>
          </div>

          {/* Right: final leaderboard */}
          <div className="flex flex-col px-10 py-12" style={{ width:'55%' }}>
            <p className="label mb-6">🏆 Final Standings</p>
            <div className="space-y-3 flex-1">
              {snap.leaderboard.map((p,i) => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-4 rounded-2xl a-slide"
                  style={{ animationDelay:`${i*0.05}s`,
                    background: p.id===pid?'rgba(124,58,237,0.14)':i===0?'rgba(252,211,77,0.07)':'rgba(255,255,255,0.03)',
                    border:`1px solid ${p.id===pid?'rgba(124,58,237,0.35)':i===0?'rgba(252,211,77,0.2)':'rgba(255,255,255,0.06)'}` }}>
                  <span className="text-xl w-8 text-center">{i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
                  <span className="flex-1 font-bold" style={{ color:p.id===pid?'#C4B5FD':'#EDE9FE' }}>
                    {p.name}{p.id===pid&&' (you)'}
                  </span>
                  <span className="font-black text-lg"
                    style={{ color:i===0?'#FCD34D':p.id===pid?'#A78BFA':'rgba(255,255,255,0.42)' }}>
                    {p.score.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-dvh flex items-center justify-center">
      <div className="bg" />
      <div className="relative z-10 text-center">
        <div className="w-10 h-10 rounded-full border-2 border-pink-400 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-sm" style={{ color:'rgba(255,255,255,0.35)' }}>Loading...</p>
      </div>
    </main>
  )
}
