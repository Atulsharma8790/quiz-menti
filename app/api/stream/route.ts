import { NextRequest } from 'next/server'
import { getSession, addSSEClient, sessionSnapshot } from '../../../lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? ''
  const session = getSession(code)

  if (!session) {
    return new Response('Session not found', { status: 404 })
  }

  const encoder = new TextEncoder()
  let cleanup: (() => void) | null = null

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`))
        } catch { /* stream closed */ }
      }

      // Send current state immediately
      send(JSON.stringify(sessionSnapshot(session)))

      // Register for broadcasts
      cleanup = addSSEClient(code, send)

      // Heartbeat every 25s to keep connection alive
      const hb = setInterval(() => {
        try { controller.enqueue(encoder.encode(': ping\n\n')) } catch { clearInterval(hb) }
      }, 25000)

      req.signal.addEventListener('abort', () => {
        cleanup?.()
        clearInterval(hb)
        try { controller.close() } catch { /* already closed */ }
      })
    },
    cancel() {
      cleanup?.()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
