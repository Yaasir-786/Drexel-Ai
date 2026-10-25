import React, { useState, useEffect } from "react";
import { Terminal } from "lucide-react";

export default function RunStatus({ label }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs text-muted">
      <Terminal size={14} />
      <span className="font-medium text-ink">{label}</span>
      <span>{seconds}s</span>
    </div>
  );
}