/**
 * Centralized Status Manager
 * 
 * Manages the Minecraft server status with proper state transitions:
 * stopped → starting → running → stopping → stopped
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type ServerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

export interface StatusInfo {
  status: ServerStatus;
  timestamp: string;
  processFound: boolean;
  pid?: number;
}

class StatusManager {
  private currentStatus: ServerStatus = 'stopped';
  private listeners = new Set<(statusInfo: StatusInfo) => void>();
  private stoppingMonitorInterval: NodeJS.Timeout | null = null;
  private runningMonitorInterval: NodeJS.Timeout | null = null;
  private lastProcessCheck: { found: boolean; pid?: number } = { found: false };

  /**
   * Initialize the status manager
   * Checks if Java process is already running on startup
   */
  async initialize(): Promise<void> {
    console.log('[StatusManager] Initializing...');
    const processInfo = await this.checkJavaProcess();
    
    if (processInfo.found) {
      console.log(`[StatusManager] Java process found (PID: ${processInfo.pid}), setting status to 'running'`);
      this.currentStatus = 'running';
    } else {
      console.log('[StatusManager] No Java process found, status is \'stopped\'');
      this.currentStatus = 'stopped';
    }
    
    this.lastProcessCheck = processInfo;
  }

  /**
   * Get current status
   */
  getStatus(): ServerStatus {
    return this.currentStatus;
  }

  /**
   * Get detailed status info
   */
  getStatusInfo(): StatusInfo {
    return {
      status: this.currentStatus,
      timestamp: new Date().toISOString(),
      processFound: this.lastProcessCheck.found,
      pid: this.lastProcessCheck.pid,
    };
  }

  /**
   * Set status and notify all listeners
   */
  setStatus(newStatus: ServerStatus): void {
    if (this.currentStatus === newStatus) {
      return; // No change
    }

    const oldStatus = this.currentStatus;
    this.currentStatus = newStatus;
    
    console.log(`[StatusManager] Status changed: ${oldStatus} → ${newStatus}`);

    // Notify all listeners with full status info
    const statusInfo = this.getStatusInfo();
    this.listeners.forEach((listener) => {
      try {
        listener(statusInfo);
      } catch (error) {
        console.error('[StatusManager] Error in status listener:', error);
      }
    });

    // Handle state-specific actions
    if (newStatus === 'running') {
      // Start monitoring when server is running
      this.startRunningMonitor();
      this.stopStoppingMonitor();
    } else if (newStatus === 'stopping') {
      // Switch to faster monitoring during stopping
      this.stopRunningMonitor();
      this.startStoppingMonitor();
    } else if (newStatus === 'stopped') {
      // Stop all monitoring
      this.stopRunningMonitor();
      this.stopStoppingMonitor();
    } else if (newStatus === 'starting') {
      // Stop monitoring during starting
      this.stopRunningMonitor();
      this.stopStoppingMonitor();
    }
  }

  /**
   * Check if Java process is running
   * Returns process info including PID if found
   */
  async checkJavaProcess(): Promise<{ found: boolean; pid?: number }> {
    try {
      const platform = process.platform;
      let command: string;
      
      if (platform === 'win32') {
        // Windows: Find java.exe processes
        command = 'tasklist /FI "IMAGENAME eq java.exe" /FO CSV /NH';
      } else {
        // Linux/macOS: Find java processes running jar files
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
            const pidNum = parseInt(pid || '0');
            this.lastProcessCheck = { found: true, pid: pidNum };
            return { found: true, pid: pidNum };
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
              this.lastProcessCheck = { found: true, pid };
              return { found: true, pid };
            }
          }
        }
      }
      
      this.lastProcessCheck = { found: false };
      return { found: false };
    } catch (error) {
      // No process found or command failed
      this.lastProcessCheck = { found: false };
      return { found: false };
    }
  }

  /**
   * Start monitoring Java process when server is running
   * Checks every 5 seconds to detect unexpected crashes
   */
  private startRunningMonitor(): void {
    // Clear any existing monitor
    this.stopRunningMonitor();

    console.log('[StatusManager] Starting running monitor (checking every 5s)...');
    
    this.runningMonitorInterval = setInterval(async () => {
      const processInfo = await this.checkJavaProcess();
      
      if (!processInfo.found) {
        console.log('[StatusManager] Java process crashed or stopped unexpectedly, setting status to \'stopped\'');
        this.setStatus('stopped');
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Stop the running monitor
   */
  private stopRunningMonitor(): void {
    if (this.runningMonitorInterval) {
      clearInterval(this.runningMonitorInterval);
      this.runningMonitorInterval = null;
      console.log('[StatusManager] Running monitor cleared');
    }
  }

  /**
   * Start monitoring Java process for stopping state
   * Checks every second until process is gone, then sets status to stopped
   */
  private startStoppingMonitor(): void {
    // Clear any existing monitor
    this.stopStoppingMonitor();

    console.log('[StatusManager] Starting stopping monitor (checking every 1s)...');
    
    this.stoppingMonitorInterval = setInterval(async () => {
      const processInfo = await this.checkJavaProcess();
      
      if (!processInfo.found) {
        console.log('[StatusManager] Java process no longer running, setting status to \'stopped\'');
        this.setStatus('stopped');
      }
    }, 1000); // Check every second
  }

  /**
   * Stop the stopping monitor
   */
  private stopStoppingMonitor(): void {
    if (this.stoppingMonitorInterval) {
      clearInterval(this.stoppingMonitorInterval);
      this.stoppingMonitorInterval = null;
      console.log('[StatusManager] Stopping monitor cleared');
    }
  }

  /**
   * Handle terminal output line
   * Checks for the "Done" message to transition from starting to running
   */
  handleTerminalLine(line: string): void {
    // Only process if we're in starting state
    if (this.currentStatus !== 'starting') {
      return;
    }

    // Pattern: [HH:MM:SS INFO]: Done (X.XXXs)! For help, type "help"
    const donePattern = /\[\d{2}:\d{2}:\d{2}\s+INFO\]:\s+Done\s+\(\d+\.\d+s\)!/;
    
    if (donePattern.test(line)) {
      console.log('[StatusManager] Server startup complete detected!');
      this.setStatus('running');
    }
  }

  /**
   * Add a status change listener
   * Returns a function to remove the listener
   */
  addListener(callback: (statusInfo: StatusInfo) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopRunningMonitor();
    this.stopStoppingMonitor();
    this.listeners.clear();
  }
}

// Export singleton instance
export const statusManager = new StatusManager();
