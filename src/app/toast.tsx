"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type Toast = {
  id: number;
  message: string;
  variant?: "success" | "error" | "info";
};

type ToastContextType = {
  showToast: (message: string, variant?: Toast["variant"]) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(1);

  const showToast = useCallback((message: string, variant: Toast["variant"] = "success") => {
    const id = idRef.current++;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="pointer-events-none fixed top-4 right-4 z-[1000] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              `pointer-events-auto rounded-md px-3 py-2 text-sm shadow-lg border transition-opacity duration-300 ` +
              (t.variant === "error"
                ? "bg-red-600 text-white border-red-500/60"
                : t.variant === "info"
                ? "bg-neutral-800 text-white border-neutral-700"
                : "bg-green-600 text-white border-green-500/60")
            }
            role="status"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
