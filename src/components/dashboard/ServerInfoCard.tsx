'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Copy, Check, Server, Globe } from 'lucide-react';

interface ServerInfoCardProps {
  javaIp: string;
  bedrockIp: string;
  running: boolean;
}

export function ServerInfoCard({ javaIp, bedrockIp, running }: ServerInfoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="relative overflow-hidden rounded-2xl border border-violet-500/40 bg-gradient-to-br from-violet-950/80 to-violet-900/40 backdrop-blur-sm shadow-2xl shadow-violet-500/30"
    >
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
      
      {/* Content */}
      <div className="relative p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-black/30 text-violet-400">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-semibold text-white/90">Connection Info</h3>
        </div>

        <div className="space-y-4">
          {/* Java Edition */}
          <ConnectionItem
            label="Java Edition"
            address={javaIp || 'Not configured'}
            icon={<Server className="w-4 h-4" />}
            available={!!javaIp}
          />

          {/* Bedrock Edition */}
          <ConnectionItem
            label="Bedrock Edition"
            address={bedrockIp || 'Not configured'}
            icon={<Server className="w-4 h-4" />}
            available={!!bedrockIp}
          />
        </div>

        {/* Status indicator */}
        <div className="mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <p className="text-xs text-white/50">Server Status</p>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className={`text-xs font-medium ${running ? 'text-emerald-400' : 'text-red-400'}`}>
                {running ? 'Accepting Connections' : 'Offline'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative corner */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-white/5 to-transparent rounded-tr-full" />
    </motion.div>
  );
}

function ConnectionItem({ 
  label, 
  address, 
  icon, 
  available 
}: { 
  label: string; 
  address: string; 
  icon: React.ReactNode;
  available: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!available) return;
    
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-black/20 border border-white/10 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="text-violet-400">
              {icon}
            </div>
            <p className="text-sm font-medium text-white/70">{label}</p>
          </div>
          <p className={`font-mono text-sm break-all ${available ? 'text-white' : 'text-white/40'}`}>
            {address}
          </p>
        </div>
        
        {available && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="flex-shrink-0 p-2 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
