import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const startedAt = Date.now()

export async function GET() {
  const now = Date.now()
  const uptimeMs = Math.max(0, now - startedAt)
  const uptimeSeconds = Math.floor(uptimeMs / 1000)
  const uptimeMinutes = Math.floor(uptimeSeconds / 60)
  return NextResponse.json({ startedAt, uptimeMs, uptimeSeconds, uptimeMinutes })
}
