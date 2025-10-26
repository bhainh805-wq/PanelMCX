import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Check if Minecraft server process is running
 */
async function isMinecraftProcessRunning(): Promise<{ running: boolean; pid?: number }> {
  try {
    const platform = process.platform;
    let command: string;
    
    if (platform === 'win32') {
      command = 'tasklist /FI "IMAGENAME eq java.exe" /FO CSV /NH';
    } else {
      command = 'ps aux | grep "[j]ava.*paper.*\\.jar"';
    }
    
    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('java.exe')) {
          const parts = line.split(',');
          const pid = parts[1]?.replace(/"/g, '').trim();
          return { running: true, pid: parseInt(pid || '0') };
        }
      }
    } else {
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/^\S+\s+(\d+)/);
          if (match) {
            const pid = parseInt(match[1]);
            return { running: true, pid };
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
    
    let serverPort = 25565;
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

/**
 * Get current server status
 */
async function getServerStatus() {
  const processCheck = await isMinecraftProcessRunning();
  const logCheck = await isLogFileActive();
  const portCheck = await isPortListening();
  
  const isOnline = processCheck.running && (logCheck.active || portCheck.listening);
  
  return {
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
}

/**
 * Server-Sent Events endpoint for real-time server status updates
 */
export async function GET(request: Request) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial status
      const initialStatus = await getServerStatus();
      const data = `data: ${JSON.stringify(initialStatus)}\n\n`;
      controller.enqueue(encoder.encode(data));
      
      // Set up interval to check status every 3 seconds
      const interval = setInterval(async () => {
        try {
          const status = await getServerStatus();
          const data = `data: ${JSON.stringify(status)}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch (error) {
          console.error('[SSE] Error getting server status:', error);
        }
      }, 3000);
      
      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
