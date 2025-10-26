"use client";

let ws: WebSocket | null = null;
let listeners = new Set<(type: "output" | "history", data: string) => void>();
let uptimeListeners = new Set<(seconds: number) => void>();
let openCallbacks = new Set<() => void>();
let buffer = "";
const MAX_BUFFER = 50000;

function appendToBuffer(chunk: string) {
  buffer += chunk;
  if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
}

export function panelAction(action: 'start' | 'stop') {
  try {
    const s = getOrCreateTerminalWS();
    if (s.readyState === WebSocket.OPEN) {
      s.send(JSON.stringify({ type: 'panel-action', action }));
    } else {
      onTerminalOpen(() => {
        try { s.send(JSON.stringify({ type: 'panel-action', action })); } catch {}
      });
    }
  } catch {}
}

export function addUptimeListener(fn: (seconds: number) => void) {
  uptimeListeners.add(fn);
  return () => uptimeListeners.delete(fn);
}

export function getTerminalBuffer() {
  return buffer;
}

export function clearTerminalBuffer() {
  buffer = "";
}

export function getOrCreateTerminalWS(): WebSocket {
  if (typeof window === "undefined") throw new Error("WS only in browser");
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    return ws;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}/api/terminal-ws`);

  ws.onopen = () => {
    openCallbacks.forEach((cb) => {
      try { cb(); } catch {}
    });
  };
  ws.onmessage = (event: MessageEvent) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg?.type === 'output') {
        appendToBuffer(msg.data || "");
        listeners.forEach((fn) => {
          try { fn('output', msg.data || ""); } catch {}
        });
      } else if (msg?.type === 'history') {
        buffer = msg.data || "";
        if (buffer.length > MAX_BUFFER) buffer = buffer.slice(-MAX_BUFFER);
        listeners.forEach((fn) => {
          try { fn('history', buffer); } catch {}
        });
      } else if (msg?.type === 'uptime') {
        const s = typeof msg.uptimeSeconds === 'number' ? msg.uptimeSeconds : null;
        if (s != null) uptimeListeners.forEach((fn) => { try { fn(s); } catch {} });
      }
    } catch {}
  };
  ws.onclose = () => {
    // keep ws variable, but it's closed; callers can recreate if needed later
  };
  ws.onerror = () => {};
  return ws;
}

export function addTerminalListener(fn: (type: "output" | "history", data: string) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function onTerminalOpen(fn: () => void) {
  openCallbacks.add(fn);
  return () => openCallbacks.delete(fn);
}

export function terminalSendInput(data: string): boolean {
  const s = getOrCreateTerminalWS();
  if (s.readyState === WebSocket.OPEN) {
    s.send(JSON.stringify({ type: 'input', data }));
    return true;
  }
  return false;
}

export function terminalSendResize(cols: number, rows: number): boolean {
  const s = getOrCreateTerminalWS();
  if (s.readyState === WebSocket.OPEN) {
    s.send(JSON.stringify({ type: 'resize', cols, rows }));
    return true;
  }
  // queue on open
  onTerminalOpen(() => {
    try {
      s.send(JSON.stringify({ type: 'resize', cols, rows }));
    } catch {}
  });
  return false;
}
