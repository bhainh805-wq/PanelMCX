'use client';

import { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import '@xterm/xterm/css/xterm.css';
import { Terminal as TerminalIcon } from 'lucide-react';
import { addTerminalListener, getOrCreateTerminalWS, getTerminalBuffer, onTerminalOpen, terminalSendInput, terminalSendResize, clearTerminalBuffer } from './wsSession';

export default function TerminalPage() {
  const [connected, setConnected] = useState(false);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<any | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafFitRef = useRef<number | null>(null);
  const hasAnyOutputRef = useRef<boolean>(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let disposeKey: { dispose: () => void } | null = null;
    let closed = false;

    const setup = async () => {
      // Dynamic import FitAddon to avoid SSR issues
      const { FitAddon } = await import('@xterm/addon-fit');

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: 'Menlo, Monaco, "Courier New", monospace',
        fontSize: 12,
        scrollback: 1000,
        convertEol: true,
        theme: { background: '#000000' },
      });
      const fit = new FitAddon();
      termRef.current = term;
      fitRef.current = fit;
      term.loadAddon(fit);

      // Mount terminal
      if (containerRef.current) {
        term.open(containerRef.current);
        try { fit.fit(); } catch {}
      }

      // Connect WebSocket
      const ws = getOrCreateTerminalWS();
      onTerminalOpen(() => {
        if (closed) return;
        setConnected(true);
        try {
          fit.fit();
          terminalSendResize(term.cols, term.rows);
        } catch {}
      });
      if (ws.readyState === WebSocket.OPEN) {
        setConnected(true);
        try { fit.fit(); terminalSendResize(term.cols, term.rows); } catch {}
      }

      // Seed history buffer into terminal immediately
      const existing = getTerminalBuffer();
      if (existing) {
        hasAnyOutputRef.current = true;
        try { term.clear(); term.write(existing); term.scrollToBottom(); } catch {}
      } else {
        // No output yet: ensure at least 50% viewport height for typing space
        if (containerRef.current) {
          try { (containerRef.current as HTMLElement).style.minHeight = '50vh'; } catch {}
        }
      }
      const removeListener = addTerminalListener((type, data) => {
        try {
          if (type === 'history') {
            term.clear();
          }
          // On first output, remove the temporary minHeight
          if (!hasAnyOutputRef.current) {
            hasAnyOutputRef.current = true;
            if (containerRef.current) {
              try { (containerRef.current as HTMLElement).style.minHeight = ''; } catch {}
            }
          }
          term.write(data);
          term.scrollToBottom();
        } catch {}
      });

      // Pipe keyboard input from xterm to server
      disposeKey = term.onData((data) => {
        terminalSendInput(data);
      });

      // Fit to viewport on resize
      const scheduleFit = () => {
        if (rafFitRef.current != null) return;
        rafFitRef.current = window.requestAnimationFrame(() => {
          rafFitRef.current = null;
          try {
            fit.fit();
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
            }
          } catch {}
        });
      };
      const onResize = () => scheduleFit();
      window.addEventListener('resize', onResize);

      // Also use ResizeObserver on the container for better accuracy
      const ro = new ResizeObserver(() => scheduleFit());
      if (containerRef.current) ro.observe(containerRef.current);

      return () => {
        ro.disconnect();
        window.removeEventListener('resize', onResize);
      };
    };

    const cleanupListeners: Array<() => void> = [];

    setup().then((unmount) => {
      if (unmount) cleanupListeners.push(unmount);
    });

    return () => {
      closed = true;
      // Clear visible terminal content immediately to allow fast route transition
      try { if (containerRef.current) containerRef.current.innerHTML = ''; } catch {}

      const heavyCleanup = () => {
        try { cleanupListeners.forEach((fn) => fn()); } catch {}
        if (disposeKey) try { disposeKey.dispose(); } catch {}
        if (termRef.current) try { termRef.current.dispose(); } catch {}
        if (rafFitRef.current != null) cancelAnimationFrame(rafFitRef.current);
        // Do not close WS here to keep it alive across navigation
      };

      // Defer heavy cleanup to idle time or next tick to avoid blocking navigation
      try {
        const anyWindow: any = window as any;
        if (typeof anyWindow.requestIdleCallback === 'function') {
          anyWindow.requestIdleCallback(heavyCleanup, { timeout: 120 });
        } else {
          setTimeout(heavyCleanup, 0);
        }
      } catch {
        setTimeout(heavyCleanup, 0);
      }
    };
  }, []);

  return (
    <div className="min-h-screen h-screen w-screen bg-black text-white m-0 p-0 overflow-hidden flex flex-col">
      {/* Header / Tab menu */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2 sticky top-0 z-20 bg-black">
        <TerminalIcon className="h-5 w-5" />
        <h1 className="text-lg font-semibold">Terminal</h1>
      </div>
      {/* Terminal area: height fills the rest below header */}
      <div className="flex-1 w-full relative">
        <div
          ref={containerRef}
          className="terminal-container absolute inset-0 overflow-auto"
          style={{ height: '100%' }}
        />
      </div>
    </div>
  );
}
