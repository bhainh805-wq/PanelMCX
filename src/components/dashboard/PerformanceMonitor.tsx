'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Activity, Cpu, MemoryStick, TrendingUp } from 'lucide-react';

interface PerformanceData {
  timestamp: number;
  value: number;
}

interface PerformanceMonitorProps {
  running: boolean;
}

export function PerformanceMonitor({ running }: PerformanceMonitorProps) {
  const [ramData, setRamData] = useState<PerformanceData[]>([]);
  const [cpuData, setCpuData] = useState<PerformanceData[]>([]);
  const [currentRam, setCurrentRam] = useState(0);
  const [currentCpu, setCurrentCpu] = useState(0);

  const MAX_DATA_POINTS = 30;

  useEffect(() => {
    if (!running) {
      setRamData([]);
      setCpuData([]);
      setCurrentRam(0);
      setCurrentCpu(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      
      const newRam = Math.min(100, Math.max(20, currentRam + (Math.random() - 0.5) * 15));
      const newCpu = Math.min(100, Math.max(5, currentCpu + (Math.random() - 0.5) * 20));

      setCurrentRam(newRam);
      setCurrentCpu(newCpu);

      setRamData(prev => {
        const updated = [...prev, { timestamp: now, value: newRam }];
        return updated.slice(-MAX_DATA_POINTS);
      });

      setCpuData(prev => {
        const updated = [...prev, { timestamp: now, value: newCpu }];
        return updated.slice(-MAX_DATA_POINTS);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [running, currentRam, currentCpu]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="relative overflow-hidden"
    >
      {/* Main Panel */}
      <div className="relative bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <Activity className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Performance Monitor</h3>
              <p className="text-sm text-slate-500">Real-time resource usage</p>
            </div>
          </div>
          
          {running && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-medium text-emerald-400">Live</span>
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* RAM Usage */}
          <MetricPanel
            title="RAM Usage"
            icon={<MemoryStick className="w-5 h-5" />}
            data={ramData}
            currentValue={currentRam}
            color="cyan"
            running={running}
            unit="MB"
          />

          {/* CPU Usage */}
          <MetricPanel
            title="CPU Usage"
            icon={<Cpu className="w-5 h-5" />}
            data={cpuData}
            currentValue={currentCpu}
            color="blue"
            running={running}
            unit="%"
          />
        </div>
      </div>
    </motion.div>
  );
}

interface MetricPanelProps {
  title: string;
  icon: React.ReactNode;
  data: PerformanceData[];
  currentValue: number;
  color: 'cyan' | 'blue';
  running: boolean;
  unit: string;
}

function MetricPanel({ 
  title, 
  icon, 
  data, 
  currentValue, 
  color,
  running,
  unit 
}: MetricPanelProps) {
  const colorClasses = {
    cyan: {
      text: 'text-cyan-400',
      bg: 'bg-cyan-500',
      gradient: 'from-cyan-500/20 to-cyan-600/10',
      border: 'border-cyan-500/30',
      glow: 'shadow-cyan-500/50',
      line: 'stroke-cyan-400',
      fill: 'fill-cyan-500/20',
    },
    blue: {
      text: 'text-blue-400',
      bg: 'bg-blue-500',
      gradient: 'from-blue-500/20 to-blue-600/10',
      border: 'border-blue-500/30',
      glow: 'shadow-blue-500/50',
      line: 'stroke-blue-400',
      fill: 'fill-blue-500/20',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colors.gradient} border ${colors.border}`}>
            {icon}
          </div>
          <span className="font-semibold text-white">{title}</span>
        </div>
        {running && data.length > 0 && (
          <TrendingUp className={`w-4 h-4 ${colors.text}`} />
        )}
      </div>

      {/* Current Value */}
      <div className="flex items-baseline gap-2">
        <span className={`text-5xl font-bold ${colors.text}`}>
          {running ? currentValue.toFixed(1) : '0.0'}
        </span>
        <span className="text-xl text-slate-500">{unit}</span>
      </div>

      {/* Progress Bar */}
      <div className="relative h-3 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/50">
        <motion.div
          className={`h-full ${colors.bg} shadow-lg ${colors.glow}`}
          initial={{ width: 0 }}
          animate={{ width: running ? `${currentValue}%` : '0%' }}
          transition={{ duration: 0.5 }}
        />
      </div>

      {/* Graph */}
      <div className="h-32 bg-slate-800/30 rounded-xl border border-slate-700/50 p-2">
        {running && data.length > 1 ? (
          <MiniChart data={data} color={colors} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-slate-600">
              {running ? 'Collecting data...' : 'Server offline'}
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      {running && data.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <StatBox 
            label="Min" 
            value={Math.min(...data.map(d => d.value)).toFixed(1)} 
            unit={unit}
          />
          <StatBox 
            label="Avg" 
            value={(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)} 
            unit={unit}
          />
          <StatBox 
            label="Max" 
            value={Math.max(...data.map(d => d.value)).toFixed(1)} 
            unit={unit}
          />
        </div>
      )}
    </div>
  );
}

function MiniChart({ 
  data, 
  color 
}: { 
  data: PerformanceData[]; 
  color: any;
}) {
  const width = 100;
  const height = 100;
  const padding = 5;

  const maxValue = Math.max(...data.map(d => d.value), 100);
  const minValue = 0;

  const pathD = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.value - minValue) / (maxValue - minValue)) * (height - 2 * padding);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(' ');

  const fillPath = `${pathD} L ${width - padding} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg 
      viewBox={`0 0 ${width} ${height}`} 
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      {/* Grid */}
      {[0, 25, 50, 75, 100].map(percent => {
        const y = height - padding - (percent / 100) * (height - 2 * padding);
        return (
          <line
            key={percent}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="rgba(148, 163, 184, 0.1)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Fill */}
      <path d={fillPath} className={color.fill} />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        className={color.line}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function StatBox({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="px-3 py-2 bg-slate-800/50 rounded-lg border border-slate-700/50">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-mono font-bold text-white">
        {value}<span className="text-xs text-slate-500 ml-1">{unit}</span>
      </p>
    </div>
  );
}
