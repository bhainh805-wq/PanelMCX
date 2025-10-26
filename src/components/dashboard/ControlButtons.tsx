'use client';

import { motion } from 'framer-motion';
import { Play, Square } from 'lucide-react';

interface ControlButtonsProps {
  running: boolean;
  preparing: boolean;
  stopping: boolean;
  busy: boolean;
  statusReady: boolean;
  startServer: () => void;
  stopServer: () => void;
}

export function ControlButtons({
  running,
  preparing,
  stopping,
  busy,
  statusReady,
  startServer,
  stopServer,
}: ControlButtonsProps) {
  const startDisabled = busy || running || preparing || stopping || !statusReady;
  const stopDisabled = busy || !running || preparing || stopping || !statusReady;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-br from-neutral-950/80 to-neutral-900/60 backdrop-blur-sm shadow-2xl shadow-black/40"
    >
      {/* Content */}
      <div className="relative p-6">
        <h3 className="text-lg font-semibold text-white/90 mb-6">Server Controls</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Start Button */}
          <motion.button
            whileHover={!startDisabled ? { scale: 1.02 } : {}}
            whileTap={!startDisabled ? { scale: 0.98 } : {}}
            onClick={startServer}
            disabled={startDisabled}
            className={`
              group relative overflow-hidden rounded-xl px-8 py-6
              font-semibold text-lg transition-all duration-300
              ${startDisabled
                ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                : 'bg-gradient-to-br from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-emerald-400/30'
              }
            `}
          >
            {/* Animated background gradient */}
            {!startDisabled && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}

            <div className="relative flex items-center justify-center gap-3">
              {busy && !running ? (
                <>
                  <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <Play className="w-6 h-6" fill="currentColor" />
                  <span>Start Server</span>
                </>
              )}
            </div>

            {/* Glow effect */}
            {!startDisabled && (
              <div className="absolute inset-0 rounded-xl bg-emerald-400/20 blur-xl group-hover:bg-emerald-400/30 transition-all" />
            )}
          </motion.button>

          {/* Stop Button */}
          <motion.button
            whileHover={!stopDisabled ? { scale: 1.02 } : {}}
            whileTap={!stopDisabled ? { scale: 0.98 } : {}}
            onClick={stopServer}
            disabled={stopDisabled}
            className={`
              group relative overflow-hidden rounded-xl px-8 py-6
              font-semibold text-lg transition-all duration-300
              ${stopDisabled
                ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                : 'bg-gradient-to-br from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-xl shadow-red-500/30 hover:shadow-red-500/50 border border-red-400/30'
              }
            `}
          >
            {/* Animated background gradient */}
            {!stopDisabled && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}

            <div className="relative flex items-center justify-center gap-3">
              {busy && (running || stopping) ? (
                <>
                  <svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Stopping...</span>
                </>
              ) : (
                <>
                  <Square className="w-6 h-6" fill="currentColor" />
                  <span>Stop Server</span>
                </>
              )}
            </div>

            {/* Glow effect */}
            {!stopDisabled && (
              <div className="absolute inset-0 rounded-xl bg-red-400/20 blur-xl group-hover:bg-red-400/30 transition-all" />
            )}
          </motion.button>
        </div>

        {/* Info text */}
        <div className="mt-6 p-4 rounded-lg bg-neutral-900/50 border border-neutral-800">
          <p className="text-xs text-white/50 text-center">
            Use these controls to manage your Minecraft server. Start will initialize the server, Stop will gracefully shut it down.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
