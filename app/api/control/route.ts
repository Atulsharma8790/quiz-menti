import { NextRequest, NextResponse } from 'next/server'
import { getSession, saveSession } from '../../../lib/store'

export async function POST(req: NextRequest) {
  const { code, hostId, action } = await req.json()
  const session = getSession(code)

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.hostId !== hostId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  switch (action) {
    // lobby → reading (shows question text, no answer tiles)
    case 'start': {
      if (session.phase !== 'lobby') break
      session.currentQuestionIdx = 0
      session.phase = 'reading'
      session.readStartedAt = Date.now()
      break
    }

    // reading → question (answer tiles appear, scoring clock starts)
    case 'begin': {
      if (session.phase !== 'reading') break
      session.phase = 'question'
      session.questionStartedAt = Date.now()
      break
    }

    // question → reveal (correct answers + leaderboard shown)
    case 'reveal': {
      if (session.phase !== 'question') break
      session.phase = 'reveal'
      break
    }

    // reveal → next reading or ended
    case 'next': {
      if (session.phase !== 'reveal') break
      const nextIdx = session.currentQuestionIdx + 1
      if (nextIdx >= session.questions.length) {
        session.phase = 'ended'
        session.endedAt = Date.now()
      } else {
        session.currentQuestionIdx = nextIdx
        session.phase = 'reading'
        session.readStartedAt = Date.now()
      }
      break
    }

    case 'end': {
      session.phase = 'ended'
      session.endedAt = Date.now()
      break
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  saveSession(session)
  return NextResponse.json({ ok: true, phase: session.phase })
}
