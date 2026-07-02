'use client'

interface Props { timeLeft: number; total: number; size?: number; label?: string }

export function CountdownRing({ timeLeft, total, size = 100, label }: Props) {
  const r    = size / 2 - 9
  const circ = 2 * Math.PI * r
  const pct  = Math.max(0, timeLeft / total)
  const off  = circ * (1 - pct)

  const color = pct > 0.6 ? '#22D3EE' : pct > 0.3 ? '#FCD34D' : '#F43F5E'
  const glow  = pct > 0.6 ? 'rgba(34,211,238,.85)' : pct > 0.3 ? 'rgba(252,211,77,.85)' : 'rgba(244,63,94,.9)'

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)', overflow:'visible' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={off}
          style={{ transition:'stroke-dashoffset 0.55s linear, stroke 0.4s', filter:`drop-shadow(0 0 8px ${glow})` }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-black tabular-nums leading-none"
          style={{ fontSize:size*0.32, color, textShadow:`0 0 22px ${glow}`, transition:'color 0.4s' }}>
          {timeLeft}
        </span>
        {label && <span className="text-[10px] font-bold mt-0.5" style={{ color:'rgba(255,255,255,0.35)' }}>{label}</span>}
      </div>
    </div>
  )
}
