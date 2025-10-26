'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Copy, Check, Server, Globe, X } from 'lucide-react';
import { useToast } from '@/app/toast';

interface ConnectionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  javaIp: string;
  bedrockIp: string;
  running: boolean;
}

export function ConnectionDrawer({ isOpen, onClose, javaIp, bedrockIp, running }: ConnectionDrawerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-neutral-950 border-l border-neutral-800 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-neutral-950/95 backdrop-blur-sm border-b border-neutral-800 p-6 z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400">
                    <Globe className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-bold text-white">Connection Info</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Server Status */}
              <div className="p-4 rounded-xl bg-neutral-900/50 border border-neutral-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white/60">Server Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${running ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                    <span className={`text-sm font-medium ${running ? 'text-emerald-400' : 'text-red-400'}`}>
                      {running ? 'Accepting Connections' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Java Edition */}
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-3">Java Edition</h3>
                <ConnectionItem
                  address={javaIp || 'Not configured'}
                  icon={<Server className="w-4 h-4" />}
                  available={!!javaIp}
                />
              </div>

              {/* Bedrock Edition */}
              <div>
                <h3 className="text-sm font-medium text-white/70 mb-3">Bedrock Edition</h3>
                <ConnectionItem
                  address={bedrockIp || 'Not configured'}
                  icon={<Server className="w-4 h-4" />}
                  available={!!bedrockIp}
                />
              </div>

              {/* Help Text */}
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/30">
                <p className="text-xs text-blue-300/80">
                  💡 Click the copy button to copy the server address to your clipboard. Use this address in Minecraft to connect to your server.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function ConnectionItem({ 
  address, 
  icon, 
  available 
}: { 
  address: string; 
  icon: React.ReactNode;
  available: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  const handleCopy = async () => {
    if (!available) return;
    
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        showToast(`✓ Copied: ${address}`, 'success', 2000);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback to older method
        const textArea = document.createElement('textarea');
        textArea.value = address;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          if (successful) {
            setCopied(true);
            showToast(`✓ Copied: ${address}`, 'success', 2000);
            setTimeout(() => setCopied(false), 2000);
          } else {
            throw new Error('execCommand failed');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('✗ Failed to copy to clipboard', 'error');
    }
  };

  return (
    <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-colors">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 text-violet-400">
            {icon}
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
            className="flex-shrink-0 p-3 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-5 h-5" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}
