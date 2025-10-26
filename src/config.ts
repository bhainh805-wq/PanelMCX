// Centralized configuration loader for config.panel
// Reads and parses simple KEY=VALUE pairs and exposes typed config

export type PanelConfig = {
  JAR_NAME: string
  MC_DIR: string
  MIN_RAM?: string
  MAX_RAM?: string
  JAVA_IP?: string
  BEDROCK_IP?: string
}

// Default values if keys are missing
const DEFAULTS: Required<Pick<PanelConfig, 'MIN_RAM' | 'MAX_RAM'>> = {
  MIN_RAM: '1G',
  MAX_RAM: '2G',
}

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

export async function getConfig(): Promise<PanelConfig> {
  // config.panel is expected at project root (process.cwd())
  const path = (await import('path')).default
  const fs = (await import('fs/promises'))
  const filePath = path.join(process.cwd(), 'config.panel')

  let content = ''
  try {
    content = await fs.readFile(filePath, 'utf8')
  } catch (e) {
    // If missing, return minimal defaults; callers can handle missing mandatory fields
    return {
      JAR_NAME: '',
      MC_DIR: '',
      MIN_RAM: DEFAULTS.MIN_RAM,
      MAX_RAM: DEFAULTS.MAX_RAM,
    }
  }

  const map = parseKeyValue(content)
  const cfg: PanelConfig = {
    JAR_NAME: map.JAR_NAME || '',
    MC_DIR: map.MC_DIR || '',
    MIN_RAM: map.MIN_RAM || DEFAULTS.MIN_RAM,
    MAX_RAM: map.MAX_RAM || DEFAULTS.MAX_RAM,
    JAVA_IP: map.JAVA_IP || '',
    BEDROCK_IP: map.BEDROCK_IP || '',
  }
  return cfg
}

// Helper to validate memory values like 512M or 1G and to compare
export function parseRamToMB(v: string): number | null {
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

export function validateConfig(c: PanelConfig): { ok: boolean; error?: string } {
  if (!c.MC_DIR) return { ok: false, error: 'MC_DIR is missing in config.panel' }
  if (!c.JAR_NAME) return { ok: false, error: 'JAR_NAME is missing in config.panel' }
  const minMB = parseRamToMB(c.MIN_RAM || DEFAULTS.MIN_RAM)
  const maxMB = parseRamToMB(c.MAX_RAM || DEFAULTS.MAX_RAM)
  if (minMB == null || maxMB == null) return { ok: false, error: 'Invalid MIN_RAM or MAX_RAM format. Use values like 512M or 1G.' }
  if (minMB > maxMB) return { ok: false, error: `MIN_RAM (${c.MIN_RAM}) must be <= MAX_RAM (${c.MAX_RAM})` }
  return { ok: true }
}
