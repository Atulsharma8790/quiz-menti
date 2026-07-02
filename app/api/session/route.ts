import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { sessions, saveSession, getSession, sessionSnapshot } from '../../../lib/store'
import { QuizSession, Question } from '../../../lib/types'
import { DEFAULT_QUESTIONS } from '../../../lib/config'

function makeCode(): string {
  let code: string
  do { code = Math.floor(100000 + Math.random() * 900000).toString() }
  while (sessions.has(code))
  return code
}

// POST /api/session — create a new quiz session
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const title: string = body.title?.trim() || 'My Quiz'
  const rawQuestions: Question[] = Array.isArray(body.questions) && body.questions.length > 0
    ? body.questions
    : DEFAULT_QUESTIONS

  const hostId = uuidv4()
  const code = makeCode()

  const session: QuizSession = {
    code,
    hostId,
    title,
    questions: rawQuestions,
    participants: {},
    answers: [],
    phase: 'lobby',
    currentQuestionIdx: 0,
    createdAt: Date.now(),
  }

  saveSession(session)

  return NextResponse.json({ code, hostId, title })
}

// GET /api/session?code=&hostId= — get full session state (host only)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code') ?? ''
  const hostId = searchParams.get('hostId') ?? ''
  const session = getSession(code)
  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  if (session.hostId !== hostId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })
  return NextResponse.json(sessionSnapshot(session))
}
