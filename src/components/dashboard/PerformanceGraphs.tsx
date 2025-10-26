'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Activity, Cpu, MemoryStick } from 'lucide-react';

interface PerformanceData {
  timestamp: number;
  value: number;
}

interface PerformanceGraphsProps {
  running: boolean;
}

export function PerformanceGraphs({ running }: PerformanceGraphsProps) {
  const [ramData, setRamData] = useState<PerformanceData[]>([]);
  const [cpuData, setCpuData] = useState<PerformanceData[]>([]);
  const [currentRam, setCurrentRam] = useState(0);
  const [currentCpu, setCurrentCpu] = useState(0);

  const MAX_DATA_POINTS = 30;

  useEffect(() => {
    if (!running) {
      // Reset data when server is offline
      setRamData([]);
      setCpuData([]);
      setCurrentRam(0);
      setCurrentCpu(0);
      return;
    }

    // Simulate performance data (in a real app, fetch from API)
    const interval = setInterval(() => {
      const now = Date.now();
      
      // Generate realistic-looking data
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* RAM Usage Graph */}
      <PerformanceCard
        title="RAM Usage"
        icon={<MemoryStick className="w-5 h-5" />}
        data={ramData}
        currentValue={currentRam}
        color="cyan"
        running={running}
        unit="MB"
      />

      {/* CPU Usage Graph */}
      <PerformanceCard
        title="CPU Usage"
        icon={<Cpu className="w-5 h-5" />}
        data={cpuData}
        currentValue={currentCpu}
        color="blue"
        running={running}
        unit="%"
      />
    </div>
  );
}

interface PerformanceCardProps {
  title: string;
  icon: React.ReactNode;
  data: PerformanceData[];
  currentValue: number;
  color: 'cyan' | 'blue';
  running: boolean;
  unit: string;
}

function PerformanceCard({ 
  title, 
  icon, 
  data, 
  currentValue, 
  color,
  running,
  unit 
}: PerformanceCardProps) {
  const colorClasses = {
    cyan: {
      gradient: 'from-cyan-950/80 to-cyan-900/40',
      border: 'border-cyan-500/40',
      glow: 'shadow-cyan-500/30',
      text: 'text-cyan-400',
      bar: 'bg-cyan-500',
      barGlow: 'shadow-cyan-500/50',
      line: 'stroke-cyan-400',
      fill: 'fill-cyan-500/20',
    },
    blue: {
      gradient: 'from-blue-950/80 to-blue-900/40',
      border: 'border-blue-500/40',
      glow: 'shadow-blue-500/30',
      text: 'text-blue-400',
      bar: 'bg-blue-500',
      barGlow: 'shadow-blue-500/50',
      line: 'stroke-blue-400',
      fill: 'fill-blue-500/20',
    },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className={`relative overflow-hidden rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.gradient} backdrop-blur-sm shadow-2xl ${colors.glow}`}
    >
      {/* Content */}
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-black/30 ${colors.text}`}>
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-white/90">{title}</h3>
          </div>
          {running && (
            <Activity className={`w-5 h-5 ${colors.text} animate-pulse`} />
          )}
        </div>

        {/* Current Value */}
        <div className="mb-6">
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-4xl font-bold ${colors.text}`}>
              {running ? currentValue.toFixed(1) : '0.0'}
            </span>
            <span className="text-lg text-white/40">{unit}</span>
          </div>
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-black/30 rounded-full overflow-hidden">
            <motion.div
              className={`h-full ${colors.bar} shadow-lg ${colors.barGlow}`}
              initial={{ width: 0 }}
              animate={{ width: running ? `${currentValue}%` : '0%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Graph */}
        <div className="h-32 relative">
          {running && data.length > 1 ? (
            <LineChart data={data} color={colors} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-white/30">
                {running ? 'Collecting data...' : 'Server offline'}
              </p>
            </div>
          )}
        </div>

        {/* Stats */}
        {running && data.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-4">
            <StatItem 
              label="Min" 
              value={Math.min(...data.map(d => d.value)).toFixed(1)} 
              unit={unit}
            />
            <StatItem 
              label="Avg" 
              value={(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(1)} 
              unit={unit}
            />
            <StatItem 
              label="Max" 
              value={Math.max(...data.map(d => d.value)).toFixed(1)} 
              unit={unit}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

function LineChart({ 
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

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((d.value - minValue) / (maxValue - minValue)) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

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
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(percent => {
        const y = height - padding - (percent / 100) * (height - 2 * padding);
        return (
          <line
            key={percent}
            x1={padding}
            y1={y}
            x2={width - padding}
            y2={y}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="0.5"
          />
        );
      })}

      {/* Fill area */}
      <path
        d={fillPath}
        className={color.fill}
      />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        className={color.line}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Points */}
      {data.map((d, i) => {
        const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((d.value - minValue) / (maxValue - minValue)) * (height - 2 * padding);
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r="1.5"
            className={color.line}
            fill="currentColor"
          />
        );
      })}
    </svg>
  );
}

function StatItem({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-sm font-mono font-semibold text-white/80">
        {value}<span className="text-xs text-white/40 ml-1">{unit}</span>
      </p>
    </div>
  );
}
