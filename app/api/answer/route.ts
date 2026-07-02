import { NextRequest, NextResponse } from 'next/server'
import { getSession, saveSession } from '../../../lib/store'

export async function POST(req: NextRequest) {
  const { code, participantId, questionId, value } = await req.json()
  const session = getSession(code)

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.phase !== 'question') return NextResponse.json({ error: 'Not accepting answers' }, { status: 409 })

  const participant = session.participants[participantId]
  if (!participant) return NextResponse.json({ error: 'Participant not found' }, { status: 404 })

  const question = session.questions[session.currentQuestionIdx]
  if (!question) return NextResponse.json({ error: 'No active question' }, { status: 400 })
  if (questionId && question.id !== questionId) return NextResponse.json({ error: 'Question mismatch' }, { status: 409 })

  const alreadyAnswered = session.answers.some(
    a => a.participantId === participantId && a.questionId === question.id
  )
  if (alreadyAnswered) return NextResponse.json({ ok: true, alreadyAnswered: true })

  const answeredAt  = Date.now()
  const elapsedMs   = session.questionStartedAt ? (answeredAt - session.questionStartedAt) : 0
  const timeLimitMs = question.timeLimit * 1000

  let isCorrect     = false
  let pointsAwarded = 0

  if (question.type === 'mcq') {
    const correctOption = question.options.find(o => o.isCorrect)
    isCorrect = correctOption?.id === value
    if (isCorrect) {
      const speedFactor = Math.max(0, 1 - elapsedMs / timeLimitMs)
      pointsAwarded = Math.round(question.points * (0.1 + 0.9 * speedFactor))
    }
  }

  session.answers.push({ participantId, questionId: question.id, value, answeredAt, elapsedMs, isCorrect, pointsAwarded })
  participant.score += pointsAwarded
  participant.answers[question.id] = value

  // Track streak
  if (question.type === 'mcq') {
    participant.streak = isCorrect ? (participant.streak ?? 0) + 1 : 0
  }

  saveSession(session)
  return NextResponse.json({ ok: true, isCorrect, pointsAwarded, elapsedMs, streak: participant.streak ?? 0 })
}
