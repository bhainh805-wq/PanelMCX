'use server';

import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_NAME = 'config.panel';

function parseKeyValue(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) map[key] = value;
  }
  return map;
}

function parseRamToMB(v: string): number | null {
  if (!v) return null;
  const m = String(v).trim();
  const g = m.match(/^([0-9]+)\s*[Gg]$/);
  if (g) return parseInt(g[1], 10) * 1024;
  const mm = m.match(/^([0-9]+)\s*[Mm]$/);
  if (mm) return parseInt(mm[1], 10);
  const num = m.match(/^([0-9]+)$/);
  if (num) return parseInt(num[1], 10);
  return null;
}

export async function loadConfig(): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const filePath = path.join(process.cwd(), CONFIG_NAME);
    let content = '';
    try {
      content = await fs.readFile(filePath, 'utf8');
    } catch (e: any) {
      if (e?.code !== 'ENOENT') throw e;
      content = '';
    }
    return { success: true, content };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

export async function saveConfig(content: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate MIN_RAM <= MAX_RAM server-side
    const map = parseKeyValue(content);
    const minRaw = (map.MIN_RAM || '1G').trim();
    const maxRaw = (map.MAX_RAM || '2G').trim();
    const minMB = parseRamToMB(minRaw);
    const maxMB = parseRamToMB(maxRaw);
    
    if (minMB == null || maxMB == null) {
      return { 
        success: false, 
        error: 'Invalid MIN_RAM or MAX_RAM. Use values like 512M or 1G.' 
      };
    }
    
    if (minMB > maxMB) {
      return { 
        success: false, 
        error: `MIN_RAM (${minRaw}) must be <= MAX_RAM (${maxRaw})` 
      };
    }

    const filePath = path.join(process.cwd(), CONFIG_NAME);
    await fs.writeFile(filePath, content, 'utf8');
    
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}
