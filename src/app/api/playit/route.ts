import { NextRequest } from 'next/server'
export const runtime = 'nodejs'

let playitProcess: ReturnType<typeof spawn> | null = null
let logs: string[] = []
const MAX_LOG_LINES = 1000

function pushLog(line: string) {
  logs.push(line)
  if (logs.length > MAX_LOG_LINES) {
    logs = logs.slice(logs.length - MAX_LOG_LINES)
  }
}

import { spawn } from 'child_process'

export async function GET() {
  // return current status and last logs (only through API; nothing printed to terminal)
  const running = !!playitProcess && !playitProcess.killed
  return Response.json({ running, logs })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { action?: 'start' | 'stop' }
  const action = body.action || 'start'

  if (action === 'stop') {
    if (playitProcess && !playitProcess.killed) {
      playitProcess.kill('SIGTERM')
      playitProcess = null
      pushLog('[playit] stopped via API')
      return Response.json({ ok: true, message: 'stopped' })
    }
    return Response.json({ ok: true, message: 'not running' })
  }

  // start
  if (playitProcess && !playitProcess.killed) {
    return Response.json({ ok: true, message: 'already running' })
  }

  pushLog('[playit] starting...')
  try {
    playitProcess = spawn('playit', [], { env: process.env })
  } catch (e: any) {
    pushLog(`[playit] failed to spawn: ${e?.message || e}`)
    return Response.json({ ok: false, error: 'spawn_failed', message: String(e) }, { status: 500 })
  }

  playitProcess.stdout?.on('data', (d) => {
    const s = d.toString()
    for (const line of s.split(/\r?\n/)) {
      if (line) pushLog(line)
    }
  })
  playitProcess.stderr?.on('data', (d) => {
    const s = d.toString()
    for (const line of s.split(/\r?\n/)) {
      if (line) pushLog(`[stderr] ${line}`)
    }
  })
  playitProcess.on('exit', (code, signal) => {
    pushLog(`[playit] exited code=${code} signal=${signal}`)
    playitProcess = null
  })
  playitProcess.on('error', (err) => {
    pushLog(`[playit] process error: ${err?.message || err}`)
  })

  return Response.json({ ok: true, message: 'started' })
}
