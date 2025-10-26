'use client';

import { StatusCard } from './StatusCard';
import { ControlButtons } from './ControlButtons';
import { PerformanceGraphs } from './PerformanceGraphs';
import { ServerInfoCard } from './ServerInfoCard';
import { motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';

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
  return (
    <div className="min-h-screen bg-black">
      {/* Background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-4 md:p-8 lg:p-12 max-w-[1800px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4 2.5c-1.103 0-2 .897-2 2v15c0 1.103.897 2 2 2h16c1.103 0 2-.897 2-2v-15c0-1.103-.897-2-2-2H4zm16 2v15H4v-15h16z"/>
                <path d="M6 7h4v4H6zm5 0h4v4h-4zm5 0h2v4h-2zM6 12h4v4H6zm5 0h4v4h-4zm5 0h2v4h-2z"/>
              </svg>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                Minecraft Server Dashboard
              </h1>
              <p className="text-white/50 text-sm mt-1">
                Monitor and control your server in real-time
              </p>
            </div>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-sm"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-300/80 mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError(null)}
                className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Left Column - Status & Controls */}
          <div className="lg:col-span-1 space-y-6">
            <StatusCard
              running={running}
              preparing={preparing}
              stopping={stopping}
              statusReady={statusReady}
              uptimeSeconds={uptimeSeconds}
            />
            
            <ServerInfoCard
              javaIp={javaIp}
              bedrockIp={bedrockIp}
              running={running}
            />
          </div>

          {/* Right Column - Controls & Performance */}
          <div className="lg:col-span-2 space-y-6">
            <ControlButtons
              running={running}
              preparing={preparing}
              stopping={stopping}
              busy={busy}
              statusReady={statusReady}
              startServer={startServer}
              stopServer={stopServer}
            />

            <PerformanceGraphs running={running} />
          </div>
        </div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-8 p-4 rounded-xl bg-neutral-900/50 border border-neutral-800 backdrop-blur-sm"
        >
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/40">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Dashboard Active</span>
            </div>
            <div className="flex items-center gap-6">
              <span>Auto-refresh: 3s</span>
              <span>•</span>
              <span>PanelMCX v1.0</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
