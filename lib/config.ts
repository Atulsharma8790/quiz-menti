export const PORTFOLIO_URL = process.env.NEXT_PUBLIC_PORTFOLIO_URL ?? 'https://atulsharma8790.github.io'

export const DEFAULT_QUESTIONS = [
  {
    id: 'q1', type: 'mcq' as const,
    text: 'Which country invented the game of chess?',
    options: [
      { id: 'a', text: 'China',  isCorrect: false },
      { id: 'b', text: 'India',  isCorrect: true  },
      { id: 'c', text: 'Persia', isCorrect: false },
      { id: 'd', text: 'Greece', isCorrect: false },
    ],
    timeLimit: 20, readTime: 5, points: 1000,
  },
  {
    id: 'q2', type: 'poll' as const,
    text: 'What is your preferred way to learn new tech?',
    options: [
      { id: 'a', text: 'Video tutorials' },
      { id: 'b', text: 'Reading docs' },
      { id: 'c', text: 'Building projects' },
      { id: 'd', text: 'Pair programming' },
    ],
    timeLimit: 15, readTime: 5, points: 0,
  },
  {
    id: 'q3', type: 'wordcloud' as const,
    text: 'In one word, describe your ideal work culture.',
    options: [],
    timeLimit: 20, readTime: 5, points: 0,
  },
  {
    id: 'q4', type: 'mcq' as const,
    text: 'What does "TDD" stand for in software development?',
    options: [
      { id: 'a', text: 'Test-Driven Development',  isCorrect: true  },
      { id: 'b', text: 'Technical Design Document', isCorrect: false },
      { id: 'c', text: 'Test Data Definition',      isCorrect: false },
      { id: 'd', text: 'Total Deployment Duration', isCorrect: false },
    ],
    timeLimit: 20, readTime: 5, points: 1000,
  },
]
