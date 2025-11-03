'use client';

import { StatusPanel } from './StatusPanel';
import { ConnectionDrawer } from './ConnectionDrawer';
import { motion } from 'framer-motion';
import { AlertCircle, X, Plug2 } from 'lucide-react';
import { useState } from 'react';

interface DashboardLayoutProps {
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
}

export function DashboardLayout({
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
}: DashboardLayoutProps) {
  const [isConnectionDrawerOpen, setIsConnectionDrawerOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Minecraft Server</h1>
          <button
            onClick={() => setIsConnectionDrawerOpen(true)}
            className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            title="Connection Info"
          >
            <Plug2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 pb-24">
        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-8 p-5 bg-red-500/10 border border-red-500/30 flex items-start gap-3"
          >
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-base font-medium text-red-400">Error</p>
              <p className="text-sm text-red-300/80 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-red-500/20 text-red-400 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Status Panel */}
        <StatusPanel
          running={running}
          preparing={preparing}
          stopping={stopping}
          statusReady={statusReady}
          uptimeSeconds={uptimeSeconds}
          busy={busy}
          startServer={startServer}
          stopServer={stopServer}
        />
      </main>

      {/* Connection Drawer */}
      <ConnectionDrawer
        isOpen={isConnectionDrawerOpen}
        onClose={() => setIsConnectionDrawerOpen(false)}
        javaIp={javaIp}
        bedrockIp={bedrockIp}
        running={running}
      />
    </div>
  );
}
