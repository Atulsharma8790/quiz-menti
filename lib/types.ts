export type QuestionType = 'mcq' | 'poll' | 'wordcloud'

export interface Option {
  id: string
  text: string
  isCorrect?: boolean  // only for mcq
  imageUrl?: string
}

export interface Question {
  id: string
  type: QuestionType
  text: string
  imageUrl?: string
  options: Option[]
  timeLimit: number   // seconds to answer (once tiles shown)
  readTime: number    // seconds to read before tiles appear
  points: number
}

export interface Participant {
  id: string
  name: string
  score: number
  answers: Record<string, string | string[]>
  joinedAt: number
  emoji?: string      // player avatar emoji chosen at join
  streak?: number     // consecutive correct answers
}

export interface Answer {
  participantId: string
  questionId: string
  value: string | string[]
  answeredAt: number
  elapsedMs: number
  isCorrect?: boolean
  pointsAwarded: number
}

export type SessionPhase =
  | 'lobby'
  | 'reading'
  | 'question'
  | 'reveal'
  | 'ended'

export interface QuizSession {
  code: string
  hostId: string
  title: string
  questions: Question[]
  participants: Record<string, Participant>
  answers: Answer[]
  phase: SessionPhase
  currentQuestionIdx: number
  readStartedAt?: number
  questionStartedAt?: number
  createdAt: number
  endedAt?: number
}
