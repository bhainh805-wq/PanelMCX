import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Check if Minecraft server process is running
 */
async function isMinecraftProcessRunning(): Promise<{ running: boolean; pid?: number; details?: string }> {
  try {

    
    // Check for Java process running paper jar
    const platform = process.platform;
    let command: string;
    
    if (platform === 'win32') {
      // Windows: Use tasklist and findstr
      command = 'tasklist /FI "IMAGENAME eq java.exe" /FO CSV /NH';
    } else {
      // Linux/Mac: Use ps and grep
      command = 'ps aux | grep "[j]ava.*paper.*\\.jar"';
    }
    
    const { stdout, stderr } = await execAsync(command);
    
    if (platform === 'win32') {
      // Parse Windows tasklist output
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('java.exe')) {
          const parts = line.split(',');
          const pid = parts[1]?.replace(/"/g, '').trim();

          return { running: true, pid: parseInt(pid || '0'), details: line };
        }
      }
    } else {
      // Parse Unix ps output
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/^\S+\s+(\d+)/);
          if (match) {
            const pid = parseInt(match[1]);


            return { running: true, pid, details: line };
          }
        }
      }
    }
    

    return { running: false };
  } catch (error: any) {

    return { running: false };
  }
}

/**
 * Check if log file is being actively updated
 */
async function isLogFileActive(): Promise<{ active: boolean; ageSeconds?: number }> {
  try {
    const logPath = path.join(process.cwd(), 'mc', 'logs', 'latest.log');
    const stats = await fs.stat(logPath);
    const ageMs = Date.now() - stats.mtimeMs;
    const ageSeconds = ageMs / 1000;
    const active = ageMs < 30000; // 30 seconds
    

    return { active, ageSeconds };
  } catch (error: any) {

    return { active: false };
  }
}

/**
 * Check if server is listening on the Minecraft port
 */
async function isPortListening(): Promise<{ listening: boolean; port?: number }> {
  try {
    const propsPath = path.join(process.cwd(), 'mc', 'server.properties');
    const content = await fs.readFile(propsPath, 'utf8');
    
    // Parse server port
    let serverPort = 25565; // default
    for (const line of content.split(/\r?\n/)) {
      if (line.startsWith('server-port=')) {
        serverPort = parseInt(line.split('=')[1].trim()) || 25565;
        break;
      }
    }
    

    
    const platform = process.platform;
    let command: string;
    
    if (platform === 'win32') {
      command = `netstat -ano | findstr :${serverPort}`;
    } else {
      command = `lsof -i :${serverPort} -sTCP:LISTEN || netstat -tuln | grep :${serverPort}`;
    }
    
    const { stdout } = await execAsync(command);
    const listening = stdout.trim().length > 0;
    

    return { listening, port: serverPort };
  } catch (error: any) {

    return { listening: false };
  }
}

export async function GET() {

  
  try {
    // Check 1: Process running
    const processCheck = await isMinecraftProcessRunning();
    
    // Check 2: Log file activity
    const logCheck = await isLogFileActive();
    
    // Check 3: Port listening
    const portCheck = await isPortListening();
    
    // Determine overall status
    // Server is considered online if:
    // - Process is running AND
    // - (Log is active OR Port is listening)
    const isOnline = processCheck.running && (logCheck.active || portCheck.listening);
    






    
    const response = {
      status: isOnline ? 'online' : 'offline',
      checks: {
        process: {
          running: processCheck.running,
          pid: processCheck.pid,
        },
        log: {
          active: logCheck.active,
          ageSeconds: logCheck.ageSeconds,
        },
        port: {
          listening: portCheck.listening,
          port: portCheck.port,
        },
      },
      timestamp: new Date().toISOString(),
    };
    

    
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {

    const response = {
      status: 'error',
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}
