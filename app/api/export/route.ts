import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '../../../lib/store'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get('code') ?? ''
  const hostId = searchParams.get('hostId') ?? ''
  const session = getSession(code)

  if (!session) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (session.hostId !== hostId) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const rows: string[] = ['Participant,Question,Type,Answer,Correct,Points']

  Object.values(session.participants).forEach(p => {
    session.questions.forEach(q => {
      const answer = session.answers.find(a => a.participantId === p.id && a.questionId === q.id)
      rows.push([
        `"${p.name}"`,
        `"${q.text.replace(/"/g, '""')}"`,
        q.type,
        `"${answer ? (Array.isArray(answer.value) ? answer.value.join(', ') : answer.value) : ''}"`,
        answer?.isCorrect === true ? 'Yes' : answer?.isCorrect === false ? 'No' : 'N/A',
        answer?.pointsAwarded ?? 0,
      ].join(','))
    })
  })

  const csv = rows.join('\n')
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="quiz-${code}-results.csv"`,
    },
  })
}
