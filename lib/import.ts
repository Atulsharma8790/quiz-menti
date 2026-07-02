import { Question, QuestionType } from './types'

export interface ImportError {
  row: number       // 1-based (0 = top-level / file error)
  field?: string
  message: string
}

export interface ImportResult {
  questions: Question[]
  errors: ImportError[]
}

/* ── Helpers ─────────────────────────────────── */

function makeId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function optId(letter: string) {
  return letter.toLowerCase()  // 'a' | 'b' | 'c' | 'd'
}

const VALID_TYPES: QuestionType[] = ['mcq', 'poll', 'wordcloud']

function validateQuestion(
  raw: Record<string, unknown>,
  rowLabel: string,
): { q: Question | null; errors: ImportError[] } {
  const errors: ImportError[] = []
  const row = parseInt(rowLabel) || 0

  const type = String(raw.type ?? '').toLowerCase().trim() as QuestionType
  if (!VALID_TYPES.includes(type)) {
    errors.push({ row, field: 'type', message: `Row ${rowLabel}: "type" must be mcq, poll, or wordcloud — got "${raw.type}"` })
  }

  const text = String(raw.text ?? '').trim()
  if (!text) {
    errors.push({ row, field: 'text', message: `Row ${rowLabel}: "text" (question text) is required` })
  }

  const timeLimit = raw.time_limit ?? raw.timeLimit
  const tl = timeLimit !== undefined ? Number(timeLimit) : 20
  if (isNaN(tl) || tl <= 0) {
    errors.push({ row, field: 'time_limit', message: `Row ${rowLabel}: "time_limit" must be a positive number — got "${timeLimit}"` })
  }

  const readTimeRaw = raw.read_time ?? raw.readTime
  const rt = readTimeRaw !== undefined ? Number(readTimeRaw) : 5
  if (isNaN(rt) || rt < 0) {
    errors.push({ row, field: 'read_time', message: `Row ${rowLabel}: "read_time" must be a non-negative number — got "${readTimeRaw}"` })
  }

  const pointsRaw = raw.points
  const pts = pointsRaw !== undefined ? Number(pointsRaw) : (type === 'mcq' ? 1000 : 0)
  if (isNaN(pts) || pts < 0) {
    errors.push({ row, field: 'points', message: `Row ${rowLabel}: "points" must be a non-negative number — got "${pointsRaw}"` })
  }

  if (errors.length) return { q: null, errors }

  // Build options
  let options: Question['options'] = []

  if (type === 'wordcloud') {
    // no options needed
  } else if (Array.isArray(raw.options)) {
    // JSON format: options array
    const rawOpts = raw.options as Array<Record<string, unknown>>
    if (rawOpts.length < 2) {
      errors.push({ row, field: 'options', message: `Row ${rowLabel}: must have at least 2 options — got ${rawOpts.length}` })
    } else if (rawOpts.length > 4) {
      errors.push({ row, field: 'options', message: `Row ${rowLabel}: maximum 4 options allowed — got ${rawOpts.length}` })
    } else {
      const letters = ['a','b','c','d']
      options = rawOpts.map((o, i) => ({
        id: optId(letters[i]),
        text: String(o.text ?? '').trim(),
        isCorrect: type === 'mcq' ? Boolean(o.isCorrect) : undefined,
        imageUrl: o.imageUrl ? String(o.imageUrl) : undefined,
      }))

      // Validate non-empty text
      const emptyOpts = options.filter(o => !o.text)
      if (emptyOpts.length) {
        errors.push({ row, field: 'options', message: `Row ${rowLabel}: all option texts must be non-empty` })
      }

      if (type === 'mcq') {
        const correctCount = options.filter(o => o.isCorrect).length
        if (correctCount === 0) {
          errors.push({ row, field: 'options', message: `Row ${rowLabel}: MCQ must have exactly one option with "isCorrect": true — found none` })
        } else if (correctCount > 1) {
          errors.push({ row, field: 'options', message: `Row ${rowLabel}: MCQ must have exactly one correct option — found ${correctCount}` })
        }
      }
    }
  } else {
    // CSV flat format: option_a, option_b, option_c, option_d, correct_option
    const oA = String(raw.option_a ?? raw.optionA ?? '').trim()
    const oB = String(raw.option_b ?? raw.optionB ?? '').trim()
    const oC = String(raw.option_c ?? raw.optionC ?? '').trim()
    const oD = String(raw.option_d ?? raw.optionD ?? '').trim()
    const correct = String(raw.correct_option ?? raw.correctOption ?? '').toLowerCase().trim()

    const rawOpts = [oA, oB, oC, oD]
    const filled  = rawOpts.filter(Boolean)

    if (filled.length < 2) {
      errors.push({ row, field: 'options', message: `Row ${rowLabel}: at least 2 non-empty options required (option_a through option_d)` })
    } else {
      options = ['a','b','c','d']
        .map((letter, i) => ({
          id: letter,
          text: rawOpts[i],
          isCorrect: type === 'mcq' ? correct === letter : undefined,
        }))
        .filter(o => o.text) // only keep non-empty options

      if (type === 'mcq') {
        if (!correct || !['a','b','c','d'].includes(correct)) {
          errors.push({ row, field: 'correct_option', message: `Row ${rowLabel}: "correct_option" must be a, b, c, or d for MCQ — got "${raw.correct_option ?? raw.correctOption}"` })
        } else {
          const correctOpt = options.find(o => o.id === correct)
          if (!correctOpt) {
            errors.push({ row, field: 'correct_option', message: `Row ${rowLabel}: correct_option "${correct}" refers to an empty option — add text for that option` })
          }
        }
      }
    }
  }

  if (errors.length) return { q: null, errors }

  return {
    q: {
      id: makeId(),
      type,
      text,
      imageUrl: raw.image_url ? String(raw.image_url) : (raw.imageUrl ? String(raw.imageUrl) : undefined),
      options,
      timeLimit: tl,
      readTime: rt,
      points: pts,
    },
    errors: [],
  }
}

/* ══════════════════════════════════════════════
   JSON IMPORT
══════════════════════════════════════════════ */
export function parseJSON(text: string): ImportResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (e: unknown) {
    return { questions: [], errors: [{ row: 0, message: `Invalid JSON: ${(e as Error).message}` }] }
  }

  if (!Array.isArray(parsed)) {
    return { questions: [], errors: [{ row: 0, message: 'JSON must be an array of question objects, e.g. [{ "type": "mcq", ... }]' }] }
  }

  if (parsed.length === 0) {
    return { questions: [], errors: [{ row: 0, message: 'No questions found in the JSON array' }] }
  }

  const allErrors: ImportError[] = []
  const questions: Question[] = []

  parsed.forEach((raw, i) => {
    const { q, errors } = validateQuestion(raw as Record<string, unknown>, String(i + 1))
    allErrors.push(...errors)
    if (q) questions.push(q)
  })

  if (allErrors.length) return { questions: [], errors: allErrors }
  return { questions, errors: [] }
}

/* ══════════════════════════════════════════════
   CSV IMPORT
══════════════════════════════════════════════ */
function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur.trim()); cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur.trim())
  return result
}

export function parseCSV(text: string): ImportResult {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return { questions: [], errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }] }
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g,'_').replace(/[^a-z0-9_]/g,''))

  const requiredHeaders = ['type', 'text']
  const missingHeaders  = requiredHeaders.filter(h => !headers.includes(h))
  if (missingHeaders.length) {
    return { questions: [], errors: [{ row: 0, message: `Missing required CSV columns: ${missingHeaders.join(', ')}. See the sample template.` }] }
  }

  const allErrors: ImportError[] = []
  const questions: Question[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? '' })

    const { q, errors } = validateQuestion(row, String(i + 1))
    allErrors.push(...errors)
    if (q) questions.push(q)
  }

  if (allErrors.length) return { questions: [], errors: allErrors }
  return { questions, errors: [] }
}

/* ══════════════════════════════════════════════
   SAMPLE TEMPLATES
══════════════════════════════════════════════ */
export const CSV_TEMPLATE = `type,text,option_a,option_b,option_c,option_d,correct_option,time_limit,read_time,points
mcq,"Which planet is closest to the Sun?","Mercury","Venus","Earth","Mars",a,20,5,1000
mcq,"What is the capital of Japan?","Beijing","Seoul","Tokyo","Bangkok",c,15,5,1000
poll,"What is your preferred learning method?","Videos","Reading docs","Building projects","Pair programming",,20,5,0
wordcloud,"In one word, describe your ideal work culture?",,,,,,20,5,0
`

export const JSON_TEMPLATE = JSON.stringify([
  {
    type: 'mcq',
    text: 'Which planet is closest to the Sun?',
    options: [
      { text: 'Mercury', isCorrect: true },
      { text: 'Venus' },
      { text: 'Earth' },
      { text: 'Mars' },
    ],
    timeLimit: 20,
    readTime: 5,
    points: 1000,
  },
  {
    type: 'poll',
    text: 'What is your preferred learning method?',
    options: [
      { text: 'Videos' },
      { text: 'Reading docs' },
      { text: 'Building projects' },
      { text: 'Pair programming' },
    ],
    timeLimit: 20,
    readTime: 5,
    points: 0,
  },
  {
    type: 'wordcloud',
    text: 'In one word, describe your ideal work culture?',
    options: [],
    timeLimit: 20,
    readTime: 5,
    points: 0,
  },
], null, 2)
