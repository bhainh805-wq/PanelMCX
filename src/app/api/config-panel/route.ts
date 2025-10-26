import { NextResponse, NextRequest } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const CONFIG_NAME = 'config.panel'

function parseKeyValue(content: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const idx = line.indexOf('=')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (key) map[key] = value
  }
  return map
}

function buildCommand(map: Record<string, string>): string | null {
  const MC_DIR = map.MC_DIR || ''
  const JAR_NAME = map.JAR_NAME || ''
  const MIN_RAM = (map.MIN_RAM || '1G').trim()
  const MAX_RAM = (map.MAX_RAM || '2G').trim()
  if (!MC_DIR || !JAR_NAME) return null
  return `(cd ${MC_DIR} && java -Xms${MIN_RAM} -Xmx${MAX_RAM} -jar ${JAR_NAME} nogui)`
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const mode = url.searchParams.get('mode') // if mode=command, return command only

    const filePath = path.join(process.cwd(), CONFIG_NAME)
    let content = ''
    try {
      content = await fs.readFile(filePath, 'utf8')
    } catch (e: any) {
      if (e?.code !== 'ENOENT') throw e
      content = ''
    }

    if (mode === 'command') {
      const map = parseKeyValue(content)
      const command = buildCommand(map)
      if (!command) return NextResponse.json({ ok: false, error: 'Missing MC_DIR or JAR_NAME' }, { status: 400 })
      return NextResponse.json({ ok: true, command })
    }

    // Also surface parsed IPs for clients that want them
    const map = parseKeyValue(content)
    const JAVA_IP = map.JAVA_IP || ''
    const BEDROCK_IP = map.BEDROCK_IP || ''
    return NextResponse.json({ ok: true, content, JAVA_IP, BEDROCK_IP })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}

function parseRamToMB(v: string): number | null {
  if (!v) return null
  const m = String(v).trim()
  const g = m.match(/^([0-9]+)\s*[Gg]$/)
  if (g) return parseInt(g[1], 10) * 1024
  const mm = m.match(/^([0-9]+)\s*[Mm]$/)
  if (mm) return parseInt(mm[1], 10)
  const num = m.match(/^([0-9]+)$/)
  if (num) return parseInt(num[1], 10)
  return null
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const content = (body?.content ?? '').toString()

    // Validate MIN_RAM <= MAX_RAM server-side
    const map = parseKeyValue(content)
    const minRaw = (map.MIN_RAM || '1G').trim()
    const maxRaw = (map.MAX_RAM || '2G').trim()
    const minMB = parseRamToMB(minRaw)
    const maxMB = parseRamToMB(maxRaw)
    if (minMB == null || maxMB == null) {
      return NextResponse.json({ ok: false, error: 'Invalid MIN_RAM or MAX_RAM. Use values like 512M or 1G.' }, { status: 400 })
    }
    if (minMB > maxMB) {
      return NextResponse.json({ ok: false, error: `MIN_RAM (${minRaw}) must be <= MAX_RAM (${maxRaw})` }, { status: 400 })
    }

    const filePath = path.join(process.cwd(), CONFIG_NAME)
    await fs.writeFile(filePath, content, 'utf8')
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 })
  }
}
