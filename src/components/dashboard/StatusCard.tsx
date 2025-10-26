'use client';

import { motion } from 'framer-motion';
import { Play, Square } from 'lucide-react';

interface StatusCardProps {
  running: boolean;
  preparing: boolean;
  stopping: boolean;
  statusReady: boolean;
  uptimeSeconds: number | null;
  busy: boolean;
  startServer: () => void;
  stopServer: () => void;
}

export function StatusCard({ 
  running, 
  preparing, 
  stopping, 
  statusReady,
  uptimeSeconds,
  busy,
  startServer,
  stopServer
}: StatusCardProps) {
  const startDisabled = busy || running || preparing || stopping || !statusReady;
  const stopDisabled = busy || !running || preparing || stopping || !statusReady;
  const formatHMS = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  // Determine status
  let statusText = '';
  let statusColor = '';
  let bgGradient = '';
  let borderColor = '';
  let glowColor = '';
  let animate = false;

  if (!statusReady) {
    statusText = 'Checking Status...';
    statusColor = 'text-neutral-300';
    bgGradient = 'from-neutral-900/80 to-neutral-800/60';
    borderColor = 'border-neutral-700';
    glowColor = 'shadow-neutral-500/20';
    animate = true;
  } else if (running) {
    statusText = 'Online';
    statusColor = 'text-emerald-400';
    bgGradient = 'from-emerald-950/80 to-emerald-900/40';
    borderColor = 'border-emerald-500/40';
    glowColor = 'shadow-emerald-500/30';
  } else if (preparing) {
    statusText = 'Starting...';
    statusColor = 'text-amber-400';
    bgGradient = 'from-amber-950/80 to-amber-900/40';
    borderColor = 'border-amber-500/40';
    glowColor = 'shadow-amber-500/30';
    animate = true;
  } else if (stopping) {
    statusText = 'Stopping...';
    statusColor = 'text-orange-400';
    bgGradient = 'from-orange-950/80 to-orange-900/40';
    borderColor = 'border-orange-500/40';
    glowColor = 'shadow-orange-500/30';
    animate = true;
  } else {
    statusText = 'Offline';
    statusColor = 'text-red-400';
    bgGradient = 'from-red-950/80 to-red-900/40';
    borderColor = 'border-red-500/40';
    glowColor = 'shadow-red-500/30';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-br ${bgGradient} backdrop-blur-sm shadow-2xl ${glowColor}`}
    >
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white/90">Server Status</h3>
          <div className={`flex items-center gap-2 ${animate ? 'animate-pulse' : ''}`}>
            <div className={`w-3 h-3 rounded-full ${
              running ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' :
              preparing ? 'bg-amber-500 shadow-lg shadow-amber-500/50' :
              stopping ? 'bg-orange-500 shadow-lg shadow-orange-500/50' :
              !statusReady ? 'bg-neutral-500 shadow-lg shadow-neutral-500/50' :
              'bg-red-500 shadow-lg shadow-red-500/50'
            }`} />
          </div>
        </div>

        <div className="space-y-4">
          {/* Status Text */}
          <div>
            <p className="text-sm text-white/60 mb-1">Current Status</p>
            <p className={`text-3xl font-bold ${statusColor} tracking-tight`}>
              {statusText}
            </p>
          </div>

          {/* Uptime Display */}
          {running && typeof uptimeSeconds === 'number' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 border-t border-white/10"
            >
              <p className="text-sm text-white/60 mb-1">Uptime</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-mono font-bold text-cyan-400">
                  {formatHMS(uptimeSeconds)}
                </p>
                <p className="text-sm text-white/40">HH:MM:SS</p>
              </div>
            </motion.div>
          )}

          {/* Control Buttons */}
          <div className="pt-4 border-t border-white/10">
            <div className="grid grid-cols-2 gap-3">
              {/* Start Button */}
              <motion.button
                whileHover={!startDisabled ? { scale: 1.02 } : {}}
                whileTap={!startDisabled ? { scale: 0.98 } : {}}
                onClick={startServer}
                disabled={startDisabled}
                className={`
                  rounded-lg px-4 py-3
                  font-semibold text-sm transition-all duration-300
                  ${startDisabled
                    ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                    : 'bg-green-600 hover:bg-green-500 text-white border border-green-700'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  {busy && !running ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" fill="currentColor" />
                      <span>Start</span>
                    </>
                  )}
                </div>
              </motion.button>

              {/* Stop Button */}
              <motion.button
                whileHover={!stopDisabled ? { scale: 1.02 } : {}}
                whileTap={!stopDisabled ? { scale: 0.98 } : {}}
                onClick={stopServer}
                disabled={stopDisabled}
                className={`
                  rounded-lg px-4 py-3
                  font-semibold text-sm transition-all duration-300
                  ${stopDisabled
                    ? 'bg-neutral-900 text-neutral-600 cursor-not-allowed border border-neutral-800'
                    : 'bg-red-600 hover:bg-red-500 text-white border border-red-700'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2">
                  {busy && (running || stopping) ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Stopping...</span>
                    </>
                  ) : (
                    <>
                      <Square className="w-4 h-4" fill="currentColor" />
                      <span>Stop</span>
                    </>
                  )}
                </div>
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative corner accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-white/5 to-transparent rounded-bl-full" />
    </motion.div>
  );
}
