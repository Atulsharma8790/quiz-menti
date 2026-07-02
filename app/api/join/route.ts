import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getSession, saveSession } from '../../../lib/store'

export async function POST(req: NextRequest) {
  const { code, name, emoji } = await req.json()
  const session = getSession(code)

  if (!session) return NextResponse.json({ error: 'Room not found. Check the code and try again.' }, { status: 404 })
  if (session.phase === 'ended') return NextResponse.json({ error: 'This session has already ended.' }, { status: 410 })
  if (!name?.trim()) return NextResponse.json({ error: 'Please enter your name.' }, { status: 400 })

  const existing = Object.values(session.participants).find(
    p => p.name.toLowerCase() === name.trim().toLowerCase()
  )
  if (existing) {
    return NextResponse.json({ participantId: existing.id, code: session.code, title: session.title, emoji: existing.emoji })
  }

  const participantId = uuidv4()
  session.participants[participantId] = {
    id: participantId,
    name: name.trim(),
    score: 0,
    answers: {},
    joinedAt: Date.now(),
    emoji: emoji || '🎮',
    streak: 0,
  }

  saveSession(session)
  return NextResponse.json({ participantId, code: session.code, title: session.title, emoji: emoji || '🎮' })
}
