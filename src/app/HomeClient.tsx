'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { addUptimeListener, getOrCreateTerminalWS, panelAction } from './terminal/wsSession';
import { DashboardLayout } from '@/components/dashboard';

interface HomeClientProps {
  javaIp: string;
  bedrockIp: string;
  startCommand: string;
}

export default function HomeClient({ javaIp, bedrockIp, startCommand }: HomeClientProps) {
  const [running, setRunning] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [statusReady, setStatusReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverInfo, setServerInfo] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stoppingHoldUntilRef = useRef<number>(0);
  const stoppingTimerRef = useRef<number | null>(null);
  const [uptimeSeconds, setUptimeSeconds] = useState<number | null>(null);

  const handleStatusUpdate = useCallback((data: any) => {
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
    setStatusReady(true);
  }, []);

  // Setup a lightweight WS connection to send commands and receive uptime
  useEffect(() => {
    const ws = getOrCreateTerminalWS();
    wsRef.current = ws;
    // Listen for uptime updates
    const removeListener = addUptimeListener((seconds: number) => {
      setUptimeSeconds(seconds);
    });
    return () => {
      removeListener();
    };
  }, []);

  const sendInput = useCallback((data: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'input', data }));
      return true;
    }
    return false;
  }, []);

  const startServer = useCallback(async () => {
    setBusy(true); setError(null); setStopping(false);
    setPreparing(true);
    try {
      // Use command built from config on server side
      if (!startCommand) throw new Error('Start command not available');
      const ok = sendInput(startCommand + "\n");
      if (!ok) throw new Error('Terminal connection not ready');
      // Notify server to start uptime counter
      panelAction('start');
      // Status will be updated via SSE
    } catch (e: any) {
      setError(e?.message || 'Failed to start');
      setPreparing(false);
    } finally {
      setBusy(false);
    }
  }, [sendInput, startCommand]);

  const stopServer = useCallback(async () => {
    setBusy(true); setError(null); setPreparing(false);
    // Enter stopping state and hold it for 10 seconds regardless of status
    setStopping(true);
    const HOLD_MS = 10_000;
    stoppingHoldUntilRef.current = Date.now() + HOLD_MS;
    if (stoppingTimerRef.current) window.clearTimeout(stoppingTimerRef.current);
    stoppingTimerRef.current = window.setTimeout(() => {
      // Release hold; SSE will update status
      stoppingHoldUntilRef.current = 0;
      setStopping(false);
      stoppingTimerRef.current = null;
    }, HOLD_MS);

    try {
      const ok = sendInput('\x03'); // Ctrl+C
      if (!ok) throw new Error('Terminal connection not ready');
      // Notify server to stop uptime counter immediately
      panelAction('stop');
      // Optional mid-check for visibility; won't clear stopping due to hold
      // Status will be updated via SSE
    } catch (e: any) {
      setError(e?.message || 'Failed to stop');
    } finally {
      setBusy(false);
    }
  }, [sendInput]);

  useEffect(() => {
    // Set up Server-Sent Events for real-time status updates
    const eventSource = new EventSource('/api/server-status-stream');
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleStatusUpdate(data);
      } catch (e) {
        console.error('[SSE] Failed to parse status:', e);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[SSE] Connection error:', error);
      // EventSource will automatically reconnect
    };

    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (stoppingTimerRef.current) {
        window.clearTimeout(stoppingTimerRef.current);
      }
    };
  }, [handleStatusUpdate]);

  return (
    <DashboardLayout
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
  );
}
