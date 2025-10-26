'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import Link from "next/link";
import { LayoutDashboard, Terminal as TerminalIcon } from "lucide-react";
import { addUptimeListener, getOrCreateTerminalWS, panelAction } from './terminal/wsSession';

function Portal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const elRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);
  if (!mounted || typeof window === 'undefined') return null;
  return ReactDOM.createPortal(children as any, document.body);
}

export default function Home() {
  const [running, setRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const pollRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stoppingHoldUntilRef = useRef<number>(0);
  const stoppingTimerRef = useRef<number | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number | null>(null);
  const [javaIp, setJavaIp] = useState<string>('');
  const [bedrockIp, setBedrockIp] = useState<string>('');

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/check-server');
      const data = await res.json();
      const isOnline = data?.status === 'online';
      const isStarting = data?.status === 'starting' || data?.status === 'preparing';
      const isStopping = data?.status === 'stopping';
      setRunning(isOnline);
      setServerInfo(data);
      // reflect remote status in local flags
      setPreparing(isStarting);
      if (isStopping) setStopping(true);
      if (isOnline) {
        // Only clear 'stopping' if hold window has elapsed
        if (Date.now() > stoppingHoldUntilRef.current) setStopping(false);
      } else {
        if (Date.now() > stoppingHoldUntilRef.current && !isStopping) setStopping(false);
      }
    } catch (e) {
      // ignore errors; keep prior state
    } finally {
      setStatusReady(true);
    }
  }, []);

  // Setup a lightweight WS connection to send commands and receive uptime
  useEffect(() => {
    const ws = getOrCreateTerminalWS();
    wsRef.current = ws;
    const removeUptime = addUptimeListener((s) => setUptimeSeconds(s));
    return () => {
      removeUptime();
      // keep WS alive across pages
    };
  }, []);

  const sendInput = (data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
      return true;
    }
    return false;
  };

  const startServer = useCallback(async () => {
    setBusy(true); setError(null); setPreparing(true);
    try {
      // Clear terminal: screen + scrollback + cursor home, with fallback clear command
      sendInput('\x1b[2J');
      sendInput('\x1b[3J');
      sendInput('\x1b[H');
      sendInput('clear\n');

      // Fetch unified command from API built from config.panel
      const cmdRes = await fetch('/api/config-panel?mode=command', { cache: 'no-store' });
      if (!cmdRes.ok) throw new Error('Failed to build command from config');
      const cmdData = await cmdRes.json();
      const command = cmdData?.command as string;
      if (!command) throw new Error('Command not available');
      const ok = sendInput(command + "\n");
      if (!ok) throw new Error('Terminal connection not ready');
      // Notify server to start uptime counter
      panelAction('start');
      setTimeout(checkStatus, 4000);
    } catch (e: any) {
      setError(e?.message || 'Failed to start');
      setPreparing(false);
    } finally {
      setBusy(false);
    }
  }, [checkStatus]);

  const stopServer = useCallback(async () => {
    setBusy(true); setError(null); setPreparing(false);
    // Enter stopping state and hold it for 10 seconds regardless of status
    setStopping(true);
    const HOLD_MS = 10_000;
    stoppingHoldUntilRef.current = Date.now() + HOLD_MS;
    if (stoppingTimerRef.current) window.clearTimeout(stoppingTimerRef.current);
    stoppingTimerRef.current = window.setTimeout(() => {
      // Release hold; allow checkStatus to update 'stopping'
      stoppingHoldUntilRef.current = 0;
      setStopping(false);
      // Re-check status after hold ends to reflect API
      checkStatus();
      stoppingTimerRef.current = null;
    }, HOLD_MS);

    try {
      const ok = sendInput('\x03'); // Ctrl+C
      if (!ok) throw new Error('Terminal connection not ready');
      // Notify server to stop uptime counter immediately
      panelAction('stop');
      // Optional mid-check for visibility; won't clear stopping due to hold
      setTimeout(checkStatus, 2000);
    } catch (e: any) {
      setError(e?.message || 'Failed to stop');
    } finally {
      setBusy(false);
    }
  }, [checkStatus]);

  useEffect(() => {
    checkStatus();
    pollRef.current = window.setInterval(checkStatus, 3000);

    // Load IPs from config.panel
    (async () => {
      try {
        const r = await fetch('/api/config-panel', { cache: 'no-store' });
        const d = await r.json();
        if (d?.JAVA_IP) setJavaIp(d.JAVA_IP);
        if (d?.BEDROCK_IP) setBedrockIp(d.BEDROCK_IP);
      } catch {}
    })();

    // WS-driven uptime is handled in the Terminal WS layer; no HTTP polling needed
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (stoppingTimerRef.current) window.clearTimeout(stoppingTimerRef.current);
    };
  }, [checkStatus]);


  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-black">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden pb-16">
        <Dashboard 
          running={running}
          preparing={preparing}
          stopping={stopping}
          busy={busy}
          error={error}
          statusReady={statusReady}
          startServer={startServer}
          stopServer={stopServer}
          setError={setError}
          uptimeSeconds={uptimeSeconds}
          javaIp={javaIp}
          bedrockIp={bedrockIp}
        />
      </div>

    </div>
  );
}

const Dashboard = ({ 
  running, 
  preparing, 
  stopping,
  busy, 
  error, 
  statusReady,
  startServer, 
  stopServer,
  setError, 
  uptimeSeconds,
  javaIp,
  bedrockIp,
}: {
  running: boolean;
  preparing: boolean;
  stopping: boolean;
  busy: boolean;
  error: string | null;
  statusReady: boolean;
  startServer: () => void;
  stopServer: () => void;
  setError: (error: string | null) => void;
  uptimeSeconds: number | null;
  javaIp: string;
  bedrockIp: string;
}) => {
  const startDisabled = busy || running || preparing || stopping || !statusReady;
  const stopDisabled = busy || !running || preparing || stopping || !statusReady;
  const [showConnect, setShowConnect] = useState(false);


  const formatHMS = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-10 h-full">
        {/* Centered heading and connect (focused) */}
        <div className="mb-8">
          <div className="w-full max-w-3xl mx-auto rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-950/80 to-neutral-950/60 shadow-xl shadow-black/40 backdrop-blur-sm ring-1 ring-black/30 hover:ring-neutral-800 transition-colors">
            <div className="px-6 py-5 flex flex-col items-center justify-center text-center gap-3">
              <h2 className="text-2xl font-extrabold text-white tracking-tight select-all break-all drop-shadow-[0_1px_1px_rgba(0,0,0,0.6)]">
                {bedrockIp || 'Bedrock IP not set'}
              </h2>
              <button
                onClick={() => setShowConnect(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700/80 shadow-md shadow-black/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                aria-expanded={showConnect}
                aria-controls="connect-drawer"
                aria-haspopup="dialog"
                title="View connection info"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
                Connect
              </button>

              {(() => {
                let statusText = '';
                let statusClass = '';
                let animate = '';
                if (!statusReady) {
                  statusText = '⏳ Checking…';
                  statusClass = 'bg-neutral-900/60 border-neutral-800 text-neutral-300';
                  animate = 'animate-pulse';
                } else if (running) {
                  statusText = '🟢 Online' + (typeof uptimeSeconds === 'number' ? ` • Uptime: ${formatHMS(uptimeSeconds)}` : '');
                  statusClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
                } else if (preparing) {
                  statusText = '🟡 Starting...';
                  statusClass = 'bg-amber-500/10 border-amber-500/30 text-amber-300';
                  animate = 'animate-pulse';
                } else if (stopping) {
                  statusText = '🟠 Stopping...';
                  statusClass = 'bg-orange-500/10 border-orange-500/30 text-orange-300';
                  animate = 'animate-pulse';
                } else {
                  statusText = '🔴 Offline';
                  statusClass = 'bg-red-500/10 border-red-500/30 text-red-300';
                }
                return (
                  <div className={`mt-2 w-full rounded-full border px-4 py-2 text-center text-sm ${statusClass} ${animate}`}>
                    {statusText}
                  </div>
                );
              })()}

              <Portal>
                {/* Drawer Backdrop */}
                <div
                  className={`fixed inset-0 z-[1000] bg-black/60 transition-opacity ${showConnect ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  onClick={() => setShowConnect(false)}
                  aria-hidden={!showConnect}
                />

                {/* Drawer Panel */}
                <div
                  id="connect-drawer"
                  role="dialog"
                  aria-modal="true"
                  className={`fixed left-1/2 -translate-x-1/2 top-16 z-[1001] w-full max-w-2xl rounded-xl border border-neutral-800 bg-neutral-950 shadow-2xl shadow-black/50 transition-all ${showConnect ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}`}
                >
                  <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
                    <h3 className="text-white font-semibold">Connect Info</h3>
                    <button
                      onClick={() => setShowConnect(false)}
                      className="px-3 py-1.5 rounded-md bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700"
                      aria-label="Close"
                    >
                      Close
                    </button>
                  </div>
                  <div className="p-4 grid gap-3 sm:grid-cols-2">
                    <AddressCard label="Java" value={javaIp || 'Not set'} />
                    <AddressCard label="Bedrock" value={bedrockIp || 'Not set'} />
                  </div>
                </div>
              </Portal>
            </div>
          </div>
        </div>


        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Title (status moved below connect button) */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div>
                </div>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={startServer}
                disabled={startDisabled}
                className={`
                  group relative px-6 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 transform
                  ${startDisabled
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed pointer-events-none' 
                    : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 active:scale-95'
                  }
                `}
                aria-disabled={startDisabled}
              >
                <span className="flex items-center gap-2">
                  {busy && !running ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Starting...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Start Server
                    </>
                  )}
                </span>
              </button>

              <button
                onClick={stopServer}
                disabled={stopDisabled}
                className={`
                  group relative px-6 py-2.5 rounded-lg font-medium text-sm
                  transition-all duration-200 transform
                  ${stopDisabled
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed pointer-events-none'
                    : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 active:scale-95'
                  }
                `}
                aria-disabled={stopDisabled}
              >
                <span className="flex items-center gap-2">
                  {busy && (running || stopping) ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Stopping...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      Stop Server
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3 animate-in slide-in-from-top">
              <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

function AddressCard({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="border border-neutral-800 bg-neutral-900/50 rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-neutral-400">{label} IP</p>
        <p className="text-sm md:text-base font-mono text-white select-all break-all">{value}</p>
      </div>
      <button
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
          } catch {}
        }}
        className="ml-3 px-3 py-1.5 text-xs md:text-sm rounded-md bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700"
        title="Copy to clipboard"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  );
}
