"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Terminal as TerminalIcon, Folder } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const isDashboard = pathname === "/";
  const isTerminal = pathname?.startsWith("/terminal");
  const isFiles = pathname?.startsWith("/files");

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-neutral-800 bg-neutral-950/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-3">
          <Link
            href="/"
            className={`relative flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
              isDashboard ? "text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span
              className={`h-1 w-16 rounded-full absolute -top-[1px] ${
                isDashboard ? "bg-white" : "bg-transparent"
              }`}
              aria-hidden
            />
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>

          <Link
            href="/terminal"
            className={`relative flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
              isTerminal ? "text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span
              className={`h-1 w-16 rounded-full absolute -top-[1px] ${
                isTerminal ? "bg-white" : "bg-transparent"
              }`}
              aria-hidden
            />
            <TerminalIcon className="h-4 w-4" />
            Terminal
          </Link>

          <Link
            href="/files"
            className={`relative flex items-center justify-center gap-2 py-3 text-sm transition-colors ${
              isFiles ? "text-white" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            <span
              className={`h-1 w-16 rounded-full absolute -top-[1px] ${
                isFiles ? "bg-white" : "bg-transparent"
              }`}
              aria-hidden
            />
            <Folder className="h-4 w-4" />
            Files
          </Link>
        </div>
      </div>
    </nav>
  );
}
