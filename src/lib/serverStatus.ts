import { exec } from 'child_process';
import { promisify } from 'util';
import net from 'net';

const execAsync = promisify(exec);

/**
 * Server status type - only two states
 */
export type ServerStatus = 'running' | 'stopped';

/**
 * Detailed status information
 */
export interface ServerStatusInfo {
  status: ServerStatus;
  port: number;
  portOpen: boolean;
  processFound: boolean;
  pid?: number;
  timestamp: string;
}

/**
 * Check if a TCP port is open and listening
 */
async function isPortOpen(port: number, timeout: number = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const onError = () => {
      socket.destroy();
      resolve(false);
    };
    
    const onTimeout = () => {
      socket.destroy();
      resolve(false);
    };
    
    socket.setTimeout(timeout);
    socket.once('error', onError);
    socket.once('timeout', onTimeout);
    
    socket.connect(port, '127.0.0.1', () => {
      socket.destroy();
      resolve(true);
    });
  });
}

/**
 * Find Java processes running the Minecraft server
 * Simple check - just looks for java process with jar file
 */
async function findMinecraftProcess(): Promise<{ pid: number } | null> {
  try {
    const platform = process.platform;
    let command: string;
    
    if (platform === 'win32') {
      // Windows: Find java.exe processes
      command = 'tasklist /FI "IMAGENAME eq java.exe" /FO CSV /NH';
    } else {
      // Linux/macOS: Find java processes
      command = 'ps aux | grep "[j]ava.*\\.jar"';
    }
    
    const { stdout } = await execAsync(command);
    
    if (platform === 'win32') {
      // Parse Windows output
      const lines = stdout.trim().split('\n');
      for (const line of lines) {
        if (line.toLowerCase().includes('java.exe')) {
          const parts = line.split(',');
          const pid = parts[1]?.replace(/"/g, '').trim();
          return { pid: parseInt(pid || '0') };
        }
      }
    } else {
      // Parse Linux/macOS output
      if (stdout.trim()) {
        const lines = stdout.trim().split('\n');
        for (const line of lines) {
          const match = line.match(/^\S+\s+(\d+)/);
          if (match) {
            const pid = parseInt(match[1]);
            return { pid };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    // No process found or command failed
    return null;
  }
}

/**
 * Get the current Minecraft server status
 * Simple check:
 * 1. Java process is running
 * 2. Port is open
 */
export async function getServerStatus(port: number = 25565): Promise<ServerStatusInfo> {
  const timestamp = new Date().toISOString();
  
  // Check if port is open
  const portOpen = await isPortOpen(port);
  
  // Find Java process
  const processInfo = await findMinecraftProcess();
  
  let status: ServerStatus = 'stopped';
  let processFound = false;
  let pid: number | undefined;
  
  if (processInfo) {
    pid = processInfo.pid;
    processFound = true;
    
    // Server is running if both process exists and port is open
    if (portOpen) {
      status = 'running';
    }
  }
  
  return {
    status,
    port,
    portOpen,
    processFound,
    pid,
    timestamp,
  };
}

/**
 * Simple status check - returns only 'running' or 'stopped'
 */
export async function checkServerStatus(port: number = 25565): Promise<ServerStatus> {
  const info = await getServerStatus(port);
  return info.status;
}
