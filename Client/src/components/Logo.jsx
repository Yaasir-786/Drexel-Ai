// Logo component with the Drexel-Ai icon and wordmark
import React from "react";

export default function Logo({ size = "default" }) {
  const isSmall = size === "small";

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Logo icon with soft blue glow */}
      <img
        src="/drexel-logo.svg"
        alt="Drexel-Ai"
        draggable={false}
        className={isSmall ? "w-9 h-9" : "w-9 h-9"}
        style={{
          filter:
            "drop-shadow(0 0 8px rgba(59,140,255,0.55)) drop-shadow(0 0 20px rgba(59,140,255,0.35))",
        }}
      />

      {/* Wordmark */}
      <span
        className={`tracking-tight font-bold ${isSmall ? "text-lg" : "text-xl"}`}>
        <span className="text-ink">Drexel</span>
        <span className="text-gradient font-bold">-Ai</span>
      </span>
    </div>
  );
}
