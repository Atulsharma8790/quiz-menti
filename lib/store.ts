import { QuizSession } from './types'

// In-memory store — survives hot reload via globalThis
declare global {
  // eslint-disable-next-line no-var
  var __quizSessions: Map<string, QuizSession> | undefined
  // eslint-disable-next-line no-var
  var __sseClients: Map<string, Set<(data: string) => void>> | undefined
}

if (!global.__quizSessions) global.__quizSessions = new Map()
if (!global.__sseClients) global.__sseClients = new Map()

export const sessions = global.__quizSessions
export const sseClients = global.__sseClients

export function getSession(code: string): QuizSession | undefined {
  return sessions.get(code.toUpperCase())
}

export function saveSession(session: QuizSession): void {
  sessions.set(session.code, session)
  broadcast(session.code)
}

export function broadcast(code: string): void {
  const session = sessions.get(code)
  if (!session) return
  const clients = sseClients.get(code)
  if (!clients || clients.size === 0) return
  const payload = JSON.stringify(sessionSnapshot(session))
  clients.forEach(send => {
    try { send(payload) } catch { /* client disconnected */ }
  })
}

export function addSSEClient(code: string, send: (data: string) => void): () => void {
  if (!sseClients.has(code)) sseClients.set(code, new Set())
  sseClients.get(code)!.add(send)
  return () => sseClients.get(code)?.delete(send)
}

// What clients receive — strip host-sensitive data during active questions
export function sessionSnapshot(session: QuizSession) {
  const current = session.questions[session.currentQuestionIdx]
  // Hide correct-answer flags while question is live
  // Hide correct-answer flags while question is live (reading or question phase)
  const safeQuestion = current && (session.phase === 'question' || session.phase === 'reading')
    ? { ...current, options: current.options.map(o => ({ id: o.id, text: o.text, imageUrl: o.imageUrl })) }
    : current

  const answerCounts: Record<string, number> = {}
  const wordMap: Record<string, number> = {}

  if (current) {
    session.answers
      .filter(a => a.questionId === current.id)
      .forEach(a => {
        if (Array.isArray(a.value)) {
          a.value.forEach(w => { wordMap[w] = (wordMap[w] ?? 0) + 1 })
        } else {
          answerCounts[a.value] = (answerCounts[a.value] ?? 0) + 1
        }
      })
  }

  const leaderboard = Object.values(session.participants)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(p => ({ name: p.name, score: p.score, id: p.id, emoji: p.emoji ?? '🎮', streak: p.streak ?? 0 }))

  return {
    code: session.code,
    title: session.title,
    phase: session.phase,
    currentQuestionIdx: session.currentQuestionIdx,
    totalQuestions: session.questions.length,
    question: safeQuestion ?? null,
    readStartedAt: session.readStartedAt,
    questionStartedAt: session.questionStartedAt,
    answerCounts,
    wordMap,
    participantCount: Object.keys(session.participants).length,
    participants: Object.values(session.participants).map(p => ({ id: p.id, name: p.name, emoji: p.emoji ?? '🎮' })),
    leaderboard,
    endedAt: session.endedAt,
  }
}
