"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { BootSequence } from "@/components/ui/typewriter";
import { TerminalButton } from "@/components/ui/terminal-button";

const BOOT_LINES = [
  "initializing flamingeos intelligence...",
  "loading ai modules... [OK]",
  "connecting youtube analytics api...",
  "mounting competitor tracking engine...",
  "starting trend detection system...",
  "all systems nominal.",
  "authentication required.",
];

export function LoginTerminal() {
  const [booted, setBooted] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <div className="w-full max-w-lg">
      {/* ASCII Art header */}
      <pre className="text-[var(--fg)] text-xs font-mono text-glow mb-6 leading-tight">
{`
 ███████╗██╗      █████╗ ███╗   ███╗██╗███╗   ██╗ ██████╗ ███████╗ ██████╗ ███████╗
 ██╔════╝██║     ██╔══██╗████╗ ████║██║████╗  ██║██╔════╝ ██╔════╝██╔═══██╗██╔════╝
 █████╗  ██║     ███████║██╔████╔██║██║██╔██╗ ██║██║  ███╗█████╗  ██║   ██║███████╗
 ██╔══╝  ██║     ██╔══██║██║╚██╔╝██║██║██║╚██╗██║██║   ██║██╔══╝  ██║   ██║╚════██║
 ██║     ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║╚██████╔╝███████╗╚██████╔╝███████║
 ╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝
 ██╗███╗   ██╗████████╗███████╗██╗     ██╗     ██╗ ██████╗ ███████╗███╗   ██╗ ██████╗███████╗
 ██║████╗  ██║╚══██╔══╝██╔════╝██║     ██║     ██║██╔════╝ ██╔════╝████╗  ██║██╔════╝██╔════╝
 ██║██╔██╗ ██║   ██║   █████╗  ██║     ██║     ██║██║  ███╗█████╗  ██╔██╗ ██║██║     █████╗
 ██║██║╚██╗██║   ██║   ██╔══╝  ██║     ██║     ██║██║   ██║██╔══╝  ██║╚██╗██║██║     ██╔══╝
 ██║██║ ╚████║   ██║   ███████╗███████╗███████╗██║╚██████╔╝███████╗██║ ╚████║╚██████╗███████╗
 ╚═╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚══════╝╚══════╝╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝ ╚═════╝╚══════╝
`}
      </pre>

      {/* Terminal window */}
      <div className="terminal-window">
        <div className="terminal-window-title">
          SYSTEM AUTHENTICATION REQUIRED
        </div>
        <div className="p-6 space-y-6">
          <BootSequence
            lines={BOOT_LINES}
            className="min-h-[160px]"
          />

          <div className="border-t border-[var(--border)] pt-4 space-y-3">
            <div className="text-[var(--fg-muted)] text-xs font-mono uppercase tracking-widest">
              // auth --provider google --scope youtube
            </div>
            <TerminalButton
              variant="primary"
              size="lg"
              className="w-full justify-center"
              loading={loading}
              onClick={() => {
                setLoading(true);
                signIn("google", { callbackUrl: "/" });
              }}
            >
              Connect Google + YouTube Account
            </TerminalButton>
            <p className="text-[var(--fg-muted)] text-xs font-mono">
              // requires youtube analytics access for full functionality
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-[var(--fg-muted)] text-xs font-mono">
        flamingeos intelligence v1.0.0 — [SECURE CONNECTION]
      </div>
    </div>
  );
}
