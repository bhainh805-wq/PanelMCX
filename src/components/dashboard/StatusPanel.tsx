'use client';

import { motion } from 'framer-motion';
import { Play, Square, Zap, Pencil, ChevronDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/app/toast';

interface StatusPanelProps {
  running: boolean;
  preparing: boolean;
  stopping: boolean;
  statusReady: boolean;
  uptimeSeconds: number | null;
  busy: boolean;
  startServer: () => void;
  stopServer: () => void;
}

const DIFFICULTY_OPTIONS = [
  { value: 'peaceful', label: 'Peaceful' },
  { value: 'easy', label: 'Easy' },
  { value: 'normal', label: 'Normal' },
  { value: 'hard', label: 'Hard' },
];

export function StatusPanel({ 
  running, 
  preparing, 
  stopping, 
  statusReady,
  uptimeSeconds,
  busy,
  startServer,
  stopServer
}: StatusPanelProps) {
  const { showToast } = useToast();
  const [difficulty, setDifficulty] = useState<string>('normal');
  const [isUpdatingDifficulty, setIsUpdatingDifficulty] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState<string>('20');
  const [isUpdatingMaxPlayers, setIsUpdatingMaxPlayers] = useState(false);
  
  const startDisabled = busy || running || preparing || stopping || !statusReady;
  const stopDisabled = busy || !running || preparing || stopping || !statusReady;
  
  // Fetch server properties on mount
  useEffect(() => {
    fetchServerProperties();
  }, []);
  
  const fetchServerProperties = async () => {
    try {
      const response = await fetch('/api/server-properties');
      const data = await response.json();
      if (data.success && data.properties) {
        if (data.properties.difficulty) {
          setDifficulty(data.properties.difficulty);
        }
        if (data.properties['max-players']) {
          setMaxPlayers(data.properties['max-players']);
        }
      }
    } catch (error) {
      console.error('Failed to fetch server properties:', error);
    }
  };
  
  const handleDifficultyChange = async (newDifficulty: string) => {
    if (running || preparing) {
      showToast('Cannot change difficulty while server is running', 'error', 3000);
      return;
    }
    
    setIsUpdatingDifficulty(true);
    try {
      const response = await fetch('/api/server-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'difficulty', value: newDifficulty }),
      });
      
      const data = await response.json();
      if (data.success) {
        setDifficulty(newDifficulty);
        showToast('Difficulty updated successfully', 'success', 2000);
      } else {
        console.error('Failed to update difficulty:', data.error);
        showToast(data.error || 'Failed to update difficulty', 'error', 3000);
      }
    } catch (error) {
      console.error('Failed to update difficulty:', error);
      showToast('Failed to update difficulty', 'error', 3000);
    } finally {
      setIsUpdatingDifficulty(false);
    }
  };
  
  const handleMaxPlayersChange = async (value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) {
      showToast('Only numbers are allowed', 'error', 2000);
      return;
    }
    
    setMaxPlayers(value);
  };
  
  const handleMaxPlayersBlur = async () => {
    if (running || preparing) {
      showToast('Cannot change max players while server is running', 'error', 3000);
      // Reset to previous value
      fetchServerProperties();
      return;
    }
    
    if (!maxPlayers || maxPlayers === '0') {
      showToast('Max players must be at least 1', 'error', 3000);
      fetchServerProperties();
      return;
    }
    
    setIsUpdatingMaxPlayers(true);
    try {
      const response = await fetch('/api/server-properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'max-players', value: maxPlayers }),
      });
      
      const data = await response.json();
      if (data.success) {
        showToast('Max players updated successfully', 'success', 2000);
      } else {
        console.error('Failed to update max players:', data.error);
        showToast(data.error || 'Failed to update max players', 'error', 3000);
        fetchServerProperties();
      }
    } catch (error) {
      console.error('Failed to update max players:', error);
      showToast('Failed to update max players', 'error', 3000);
      fetchServerProperties();
    } finally {
      setIsUpdatingMaxPlayers(false);
    }
  };
  
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

  if (!statusReady) {
    statusText = 'Checking...';
    statusColor = 'bg-gray-600';
  } else if (running) {
    statusText = 'Online';
    statusColor = 'bg-green-600';
  } else if (preparing) {
    statusText = 'Starting';
    statusColor = 'bg-yellow-600';
  } else if (stopping) {
    statusText = 'Stopping';
    statusColor = 'bg-orange-600';
  } else {
    statusText = 'Offline';
    statusColor = 'bg-red-600';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-3"
    >
      {/* Status Indicator */}
      <div className={`border-2 border-white/30 p-4 ${statusColor} relative overflow-hidden`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)' }} />
        </div>
        
        {/* Content */}
        <div className="relative flex items-center justify-center gap-3">
          {/* Lightning Icon */}
          <Zap className="w-6 h-6 text-white" fill="currentColor" />
          
          {/* Status Text */}
          <p className="text-lg font-bold text-white tracking-wide">{statusText}</p>
          
          {/* Loading Spinner */}
          {(preparing || stopping) && (
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* Start Button */}
        <motion.button
          whileHover={!startDisabled ? { scale: 1.01 } : {}}
          whileTap={!startDisabled ? { scale: 0.99 } : {}}
          onClick={startServer}
          disabled={startDisabled}
          className={`
            px-3 py-2 font-medium text-xs transition-all duration-200 rounded
            ${startDisabled
              ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
              : 'bg-green-600 hover:bg-green-500 text-white border border-green-500/50'
            }
          `}
        >
          <div className="flex items-center justify-center gap-1.5">
            {preparing ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Starting...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" fill="currentColor" />
                <span>Start</span>
              </>
            )}
          </div>
        </motion.button>

        {/* Stop Button */}
        <motion.button
          whileHover={!stopDisabled ? { scale: 1.01 } : {}}
          whileTap={!stopDisabled ? { scale: 0.99 } : {}}
          onClick={stopServer}
          disabled={stopDisabled}
          className={`
            px-3 py-2 font-medium text-xs transition-all duration-200 rounded
            ${stopDisabled
              ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/10'
              : 'bg-red-600 hover:bg-red-500 text-white border border-red-500/50'
            }
          `}
        >
          <div className="flex items-center justify-center gap-1.5">
            {stopping ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Stopping...</span>
              </>
            ) : (
              <>
                <Square className="w-3.5 h-3.5" fill="currentColor" />
                <span>Stop</span>
              </>
            )}
          </div>
        </motion.button>
      </div>

      {/* Server Information - One Field Per Line */}
      <div className="space-y-3">

        {/* Uptime */}
        <div className="relative pt-2">
          <div className="absolute top-0 left-2 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 border border-cyan-400/50 text-[10px] text-white uppercase tracking-wider font-bold shadow-lg shadow-cyan-500/30">
            Uptime
          </div>
          <div className="bg-white/5 border border-white/20 p-3 pt-4">
            <p className="text-sm font-bold text-white text-center font-mono">
              {running && typeof uptimeSeconds === 'number' ? formatHMS(uptimeSeconds) : '00:00:00'}
            </p>
          </div>
        </div>

        {/* Players */}
        <div className="relative pt-2">
          <div className="absolute top-0 left-2 px-2 py-0.5 bg-gradient-to-r from-emerald-500 to-green-500 border border-emerald-400/50 text-[10px] text-white uppercase tracking-wider font-bold shadow-lg shadow-emerald-500/30">
            Max Players
          </div>
          <div className="bg-white/5 border border-white/20 p-3 pt-4">
            <div className="relative flex items-center justify-center">
              <input
                type="text"
                value={maxPlayers}
                onChange={(e) => handleMaxPlayersChange(e.target.value)}
                onBlur={handleMaxPlayersBlur}
                disabled={running || preparing || isUpdatingMaxPlayers}
                className="w-full bg-transparent text-sm font-bold text-white text-center border-none outline-none disabled:cursor-not-allowed disabled:opacity-50 pr-6"
                placeholder="20"
                maxLength={4}
              />
              <Pencil className={`absolute right-0 w-3 h-3 ${running || preparing ? 'text-white/30' : 'text-emerald-400'}`} />
            </div>
          </div>
        </div>

        {/* Version */}
        <div className="relative pt-2">
          <div className="absolute top-0 left-2 px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-500 border border-violet-400/50 text-[10px] text-white uppercase tracking-wider font-bold shadow-lg shadow-violet-500/30">
            Version
          </div>
          <div className="bg-white/5 border border-white/20 p-3 pt-4">
            <p className="text-sm font-bold text-white text-center">1.21.1</p>
          </div>
        </div>

        {/* Software */}
        <div className="relative pt-2">
          <div className="absolute top-0 left-2 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 border border-orange-400/50 text-[10px] text-white uppercase tracking-wider font-bold shadow-lg shadow-orange-500/30">
            Software
          </div>
          <div className="bg-white/5 border border-white/20 p-3 pt-4">
            <p className="text-sm font-bold text-white text-center">Paper</p>
          </div>
        </div>

        {/* Gamemode */}
        <div className="relative pt-2">
          <div className="absolute top-0 left-2 px-2 py-0.5 bg-gradient-to-r from-pink-500 to-rose-500 border border-pink-400/50 text-[10px] text-white uppercase tracking-wider font-bold shadow-lg shadow-pink-500/30">
            Gamemode
          </div>
          <div className="bg-white/5 border border-white/20 p-3 pt-4">
            <p className="text-sm font-bold text-white text-center">Survival</p>
          </div>
        </div>

        {/* Difficulty */}
        <div className="relative pt-2">
          <div className="absolute top-0 left-2 px-2 py-0.5 bg-gradient-to-r from-red-500 to-rose-600 border border-red-400/50 text-[10px] text-white uppercase tracking-wider font-bold shadow-lg shadow-red-500/30">
            Difficulty
          </div>
          <div className="bg-white/5 border border-white/20 p-3 pt-4">
            <div className="relative flex items-center justify-center">
              <select
                value={difficulty}
                onChange={(e) => handleDifficultyChange(e.target.value)}
                disabled={running || preparing || isUpdatingDifficulty}
                className="w-full bg-transparent text-sm font-bold text-white text-center border-none outline-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 pr-6"
                style={{ 
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              >
                {DIFFICULTY_OPTIONS.map(option => (
                  <option key={option.value} value={option.value} className="bg-black text-white">
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className={`absolute right-0 w-3 h-3 pointer-events-none ${running || preparing ? 'text-white/30' : 'text-red-400'}`} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
