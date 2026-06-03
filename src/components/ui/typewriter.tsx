"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
  cursor?: boolean;
}

export function Typewriter({
  text,
  speed = 40,
  className,
  onComplete,
  cursor = true,
}: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, ++i));
      } else {
        clearInterval(interval);
        setDone(true);
        onComplete?.();
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, onComplete]);

  return (
    <span className={cn("font-mono", className)}>
      {displayed}
      {cursor && !done && (
        <span className="animate-blink text-[var(--fg)]">█</span>
      )}
      {cursor && done && (
        <span className="animate-blink text-[var(--fg)]">_</span>
      )}
    </span>
  );
}

export function BootSequence({ lines, className }: { lines: string[]; className?: string }) {
  const [currentLine, setCurrentLine] = useState(0);
  const [completedLines, setCompletedLines] = useState<string[]>([]);

  const handleLineComplete = () => {
    setCompletedLines((prev) => [...prev, lines[currentLine]]);
    setCurrentLine((prev) => prev + 1);
  };

  return (
    <div className={cn("font-mono text-sm space-y-1", className)}>
      {completedLines.map((line, i) => (
        <div key={i} className="text-[var(--fg)]">
          <span className="text-[var(--fg-muted)]">&gt;&nbsp;</span>
          {line}
          <span className="text-[var(--fg-dim)] ml-2">[OK]</span>
        </div>
      ))}
      {currentLine < lines.length && (
        <div className="text-[var(--fg)]">
          <span className="text-[var(--fg-muted)]">&gt;&nbsp;</span>
          <Typewriter
            text={lines[currentLine]}
            speed={30}
            onComplete={handleLineComplete}
          />
        </div>
      )}
    </div>
  );
}
