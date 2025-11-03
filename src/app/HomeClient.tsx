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
  const [uptimeSeconds, setUptimeSeconds] = useState<number | null>(null);

  const handleStatusUpdate = useCallback((data: any) => {
    const status = data?.status;
    
    console.log('[HomeClient] Status update received:', status);
    
    // Map status to UI states
    // Status can be: 'online', 'offline', 'starting', 'stopping'
    const isOnline = status === 'online';
    const isStarting = status === 'starting';
    const isStopping = status === 'stopping';
    const isOffline = status === 'offline';
    
    setRunning(isOnline);
    setPreparing(isStarting);
    setStopping(isStopping);
    setServerInfo(data);
    setStatusReady(true);
    
    // Clear busy state when we reach a stable state
    if (isOnline || isOffline) {
      setBusy(false);
    }
  }, []);

  // Setup WebSocket connection for terminal and uptime
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
    setBusy(true);
    setError(null);
    setStopping(false);
    setPreparing(true);
    
    try {
      if (!startCommand) throw new Error('Start command not available');
      
      // Notify server to start uptime counter and set status to 'starting'
      panelAction('start');
      
      // Send clear command first
      const clearOk = sendInput('clear\n');
      if (!clearOk) throw new Error('Terminal connection not ready');
      
      // Wait 1 second before sending the Java start command
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Send the start command
      const ok = sendInput(startCommand + "\n");
      if (!ok) throw new Error('Terminal connection not ready');
      
      // Status will be updated via SSE (which gets it from WebSocket)
    } catch (e: any) {
      setError(e?.message || 'Failed to start');
      setPreparing(false);
      setBusy(false);
    }
  }, [sendInput, startCommand]);

  const stopServer = useCallback(async () => {
    setBusy(true);
    setError(null);
    setPreparing(false);
    setStopping(true);
    
    try {
      // Notify server to stop uptime counter and set status to 'stopping'
      panelAction('stop');
      
      // Send Ctrl+C
      const ok = sendInput('\x03');
      if (!ok) throw new Error('Terminal connection not ready');
      
      // Status will be updated via SSE (which gets it from WebSocket)
    } catch (e: any) {
      setError(e?.message || 'Failed to stop');
      setStopping(false);
      setBusy(false);
    }
  }, [sendInput]);

  useEffect(() => {
    // Set up Server-Sent Events for real-time status updates
    // SSE endpoint connects to WebSocket server-side to get status
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
