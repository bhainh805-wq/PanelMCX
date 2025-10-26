"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

type Toast = {
  id: number;
  message: string;
  variant?: "success" | "error" | "info";
  duration?: number;
};

type ToastContextType = {
  showToast: (message: string, variant?: Toast["variant"], duration?: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [progress, setProgress] = useState(100);
  const duration = toast.duration || 3000;

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 16); // ~60fps

    return () => clearInterval(interval);
  }, [toast.id, duration, onDismiss]);

  const getIcon = () => {
    switch (toast.variant) {
      case "success":
        return <CheckCircle2 className="w-5 h-5 flex-shrink-0" />;
      case "error":
        return <XCircle className="w-5 h-5 flex-shrink-0" />;
      case "info":
        return <Info className="w-5 h-5 flex-shrink-0" />;
      default:
        return <CheckCircle2 className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getColors = () => {
    switch (toast.variant) {
      case "success":
        return {
          bg: "bg-emerald-600",
          border: "border-emerald-500",
          text: "text-white",
          progress: "bg-emerald-400",
        };
      case "error":
        return {
          bg: "bg-red-600",
          border: "border-red-500",
          text: "text-white",
          progress: "bg-red-400",
        };
      case "info":
        return {
          bg: "bg-blue-600",
          border: "border-blue-500",
          text: "text-white",
          progress: "bg-blue-400",
        };
      default:
        return {
          bg: "bg-emerald-600",
          border: "border-emerald-500",
          text: "text-white",
          progress: "bg-emerald-400",
        };
    }
  };

  const colors = getColors();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 30,
        mass: 0.8
      }}
      className={`
        relative overflow-hidden rounded-lg border ${colors.border} ${colors.bg} 
        shadow-xl backdrop-blur-sm min-w-[300px] max-w-md
      `}
    >
      {/* Content */}
      <div className="relative z-10 p-4">
        <div className="flex items-start gap-3">
          <div className={colors.text}>
            {getIcon()}
          </div>
          <p className={`flex-1 text-sm font-medium ${colors.text} leading-relaxed`}>
            {toast.message}
          </p>
          <button
            onClick={() => onDismiss(toast.id)}
            className={`${colors.text} hover:opacity-70 transition-opacity`}
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
        <motion.div
          className={`h-full ${colors.progress}`}
          initial={{ width: "100%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.016, ease: "linear" }}
        />
      </div>

      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-shimmer pointer-events-none" />
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const showToast = useCallback((message: string, variant: Toast["variant"] = "success", duration: number = 3000) => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismissToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
