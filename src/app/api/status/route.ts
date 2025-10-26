import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Check if Minecraft server process is running
 */
async function isMinecraftProcessRunning(): Promise<boolean> {
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
          return true;
        }
      }
    } else {
      if (stdout.trim()) {
        return true;
      }
    }
    
    return false;
  } catch (error: any) {
    return false;
  }
}

/**
 * Check if log file is being actively updated (server is preparing/starting)
 */
async function isLogFileActive(): Promise<boolean> {
  try {
    const logPath = path.join(process.cwd(), 'mc', 'logs', 'latest.log');
    const stats = await fs.stat(logPath);
    const ageMs = Date.now() - stats.mtimeMs;
    return ageMs < 30000; // 30 seconds
  } catch (error: any) {
    return false;
  }
}

/**
 * Check if server is listening on the Minecraft port (fully running)
 */
async function isPortListening(): Promise<boolean> {
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
    return stdout.trim().length > 0;
  } catch (error: any) {
    return false;
  }
}

export async function GET() {

  
  try {
    const processRunning = await isMinecraftProcessRunning();
    const logActive = await isLogFileActive();
    const portListening = await isPortListening();
    
    let status: 'running' | 'stopped' | 'preparing';
    
    // Determine status based on checks
    if (processRunning && portListening) {
      // Process is running AND port is listening = fully running
      status = 'running';
    } else if (processRunning && logActive && !portListening) {
      // Process is running, log is active, but port not listening yet = preparing/starting
      status = 'preparing';
    } else if (processRunning && !portListening) {
      // Process exists but port not listening (could be starting or shutting down)
      // Check log activity to determine
      status = logActive ? 'preparing' : 'stopped';
    } else {
      // No process running = stopped
      status = 'stopped';
    }
    




    
    const response = {
      status,
      details: {
        processRunning,
        logActive,
        portListening,
      },
      timestamp: new Date().toISOString(),
    };
    

    
    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {

    
    const response = {
      status: 'stopped' as const,
      error: error?.message || String(error),
      timestamp: new Date().toISOString(),
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
