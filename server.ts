/**
 * Custom Next.js Server with Integrated Terminal
 * 
 * This single server handles:
 * 1. Next.js application (HTTP)
 * 2. WebSocket connections for terminal
 * 3. PTY (pseudo-terminal) session
 * 4. Blessed terminal UI display
 */

import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import * as pty from 'node-pty';
import stripAnsi from 'strip-ansi';
import { pinggy } from '@pinggy/pinggy';
import { getConfig } from './src/config';

import * as os from 'os';

// Server console TUI removed; use web UI with @xterm/xterm instead
const USE_BLESSED = false;

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Terminal configuration
const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
const clients = new Set<WebSocket>();
let outputBuffer = '';
const MAX_BUFFER_SIZE = 50000;

// Panel-driven uptime tracking (start on 'start' action, stop on 'stop')
let panelUptimeStart: number | null = null; // ms epoch when started
let panelUptimeActive = false; // whether uptime should advance

// Server-side terminal UI removed (previously used blessed).

/**
 * Create the persistent PTY session
 */
console.log('Creating persistent terminal session...');
const ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.cwd(),
  env: process.env as { [key: string]: string },
});

console.log(`Terminal session created with PID: ${ptyProcess.pid}`);

/**
 * Handle terminal output
 */
ptyProcess.onData((data: string) => {
  // Add to buffer
  outputBuffer += data;
  if (outputBuffer.length > MAX_BUFFER_SIZE) {
    outputBuffer = outputBuffer.slice(-MAX_BUFFER_SIZE);
  }
  

  
  // Broadcast to all connected clients
  const message = JSON.stringify({ type: 'output', data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
});

/**
 * Handle terminal exit
 */
ptyProcess.onExit(({ exitCode, signal }) => {
  console.log(`Terminal process exited with code ${exitCode}, signal ${signal}`);

});

/**
 * Update status bar
 */
function updateStatusBar() {
  const clientCount = clients.size;
  console.log(`Connected clients: ${clientCount}`);

}

/**
 * Handle blessed screen events (if enabled)
 */
// Handle Ctrl+C to shutdown server
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  ptyProcess.kill();
  process.exit(0);
});

/**
 * Start the server
 */
app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url!, true);

    // POST /api/exec — execute a command on the shared PTY and return output window
    if (req.method === 'POST' && parsedUrl.pathname === '/api/exec') {
      try {
        // Read JSON body
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        const bodyRaw = Buffer.concat(chunks).toString('utf8');
        const body = bodyRaw ? JSON.parse(bodyRaw) : {};

        const cmd = (body?.cmd ?? '').toString();
        const timeoutMs = Math.min(Math.max(parseInt(body?.timeoutMs) || 1500, 100), 10000);
        if (!cmd || !cmd.trim()) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'cmd is required' }));
          return;
        }

        // Capture output window
        let captured = '';
        const onData = (data: string) => { captured += data; };
        const listener = (data: string) => onData(data);
        ptyProcess.onData(listener);

        // Write command with newline
        ptyProcess.write(cmd + '\n');

        // Wait timeoutMs then respond
        await new Promise((resolve) => setTimeout(resolve, timeoutMs));

        // Stop capturing
        // node-pty doesn't support offData; reassign a wrapper using removeListener
        (ptyProcess as any).removeListener?.('data', listener);

        const cleanOutput = stripAnsi(captured || '');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ output: cleanOutput }));
        return;
      } catch (err: any) {
        console.error('exec error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'internal_error', message: err?.message || String(err) }));
        return;
      }
    }

    // Fallback to Next.js handler
    handle(req, res, parsedUrl);
  });

  // Create WebSocket server on the same HTTP server
  const wss = new WebSocketServer({ 
    server,
    path: '/api/terminal-ws'
  });

  // Uptime ticker: every 1s, send panel-driven uptime
  setInterval(() => {
    let seconds = 0;
    if (panelUptimeActive && panelUptimeStart != null) {
      seconds = Math.max(0, Math.floor((Date.now() - panelUptimeStart) / 1000));
    }
    const msg = JSON.stringify({ type: 'uptime', uptimeSeconds: seconds });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(msg);
    });
  }, 1000);

  wss.on('connection', (ws: WebSocket) => {
    console.log('New client connected');
    clients.add(ws);
    updateStatusBar();
    
    // Send terminal history to new client (only if ws is open)
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'history', data: outputBuffer }));
      }
    } catch {}

    
    /**
     * Handle incoming messages from clients
     */
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'input') {
          try {
            if (ws.readyState === WebSocket.OPEN && ptyProcess) {
              ptyProcess.write(data.data);
            }
          } catch (e: any) {
            const msg = e?.message || String(e);
            if (msg.includes('ENOTTY') || msg.includes('EBADF')) {
              if (process.env.DEBUG) console.debug('Ignoring input error:', msg);
            } else {
              if (process.env.DEBUG) console.debug('Input error:', msg);
            }
          }
        } else if (data.type === 'resize') {
          try {
            if (ws.readyState === WebSocket.OPEN && ptyProcess && typeof (ptyProcess as any).resize === 'function') {
              const cols = Math.max(1, parseInt(data.cols) || 80);
              const rows = Math.max(1, parseInt(data.rows) || 30);
              (ptyProcess as any).resize(cols, rows);
            }
          } catch (e: any) {
            const msg = e?.message || String(e);
            if (msg.includes('ENOTTY') || msg.includes('EBADF')) {
              if (process.env.DEBUG) console.debug('Ignoring resize error:', msg);
            } else {
              if (process.env.DEBUG) console.debug('Resize error:', msg);
            }
          }
        } else if (data.type === 'panel-action') {
          // Client-side UI signals start/stop for uptime
          if (data.action === 'start') {
            panelUptimeStart = Date.now();
            panelUptimeActive = true;
          } else if (data.action === 'stop') {
            panelUptimeActive = false;
            panelUptimeStart = null;
          }
        }
      } catch (error: any) {
        const msg = error?.message || String(error);
        if (msg.includes('ENOTTY') || msg.includes('EBADF')) {
          if (process.env.DEBUG) console.debug('Ignoring ws message error:', msg);
        } else {
          console.error('Error processing message:', error);
        }
      }
    });
    
    /**
     * Handle client disconnection
     */
    ws.on('close', () => {
      console.log('Client disconnected');
      clients.delete(ws);
      updateStatusBar();
    });
    
    /**
     * Handle errors
     */
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
      updateStatusBar();
    });
  });

  server.listen(port, async () => {
    console.log(`Server listening on http://${hostname}:${port}`);

    // Load configuration
    const config = await getConfig();
    console.log('[config] ENABLE_PINGGY:', config.ENABLE_PINGGY);
    console.log('[config] ENABLE_PLAYIT:', config.ENABLE_PLAYIT);

    // Pinggy tunnel management: periodically restart the tunnel without stopping Node.js
    const PINGGY_RESTART_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
    let pinggyTunnel: any | null = null;
    let restarting = false;

    const startPinggyTunnel = async () => {
      try {
        const t = pinggy.createTunnel({
          forwarding: 'localhost:3000',
          token: 'Y1hbhDl87Pi',
          autoReconnect: true,
          reconnectInterval: 5,
          maxReconnectAttempts: 20
        });
        await t.start();
        console.log('[pinggy] Tunnel started. URLs:', t.urls());
        pinggyTunnel = t;
      } catch (e: any) {
        console.error('[pinggy] failed to start:', e?.message || String(e));
      }
    };

    const restartPinggyTunnel = async () => {
      if (restarting) return;
      restarting = true;
      console.log('[pinggy] Restarting tunnel...');
      try {
        if (pinggyTunnel && typeof pinggyTunnel.stop === 'function') {
          try {
            await pinggyTunnel.stop();
          } catch (e) {
            console.warn('[pinggy] stop() error (ignored during restart):', (e as any)?.message || String(e));
          }
        }
        pinggyTunnel = null;
        await startPinggyTunnel();
        console.log('[pinggy] Tunnel restart complete');
      } catch (e: any) {
        console.error('[pinggy] Tunnel restart failed:', e?.message || String(e));
      } finally {
        restarting = false;
      }
    };

    // Start tunnel initially only if enabled
    if (config.ENABLE_PINGGY) {
      console.log('[pinggy] Enabled in config, starting tunnel...');
      await startPinggyTunnel();

      // Periodic restart without killing Node.js
      setInterval(() => {
        restartPinggyTunnel();
      }, PINGGY_RESTART_INTERVAL_MS);
    } else {
      console.log('[pinggy] Disabled in config, skipping tunnel startup');
    }



    // Start playit on server start only if enabled
    if (config.ENABLE_PLAYIT) {
      console.log('[playit] Enabled in config, starting...');
      try {
        const { spawn } = await import('child_process');
        const playit = spawn('playit', [], { env: process.env });
        // Silence playit output in terminal; do not attach stdout/stderr to console
        // You may attach to a file or buffer elsewhere if needed
        playit.on('exit', (code, signal) => console.log(`[playit] exited code=${code} signal=${signal}`));
      } catch (e: any) {
        console.error('[playit] failed to start on boot:', e?.message || String(e));
        console.error('[playit] Ensure the binary is installed and in PATH');
      }
    } else {
      console.log('[playit] Disabled in config, skipping startup');
    }

    // Tunnel management above handles start and periodic restarts
  });
});
