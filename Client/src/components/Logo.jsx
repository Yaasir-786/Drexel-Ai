// Logo component with gradient icon tile and Drexel-Ai wordmark
import React from 'react';
import { Sparkles } from 'lucide-react';

export default function Logo({ size = 'default' }) {
  const isSmall = size === 'small';

  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Gradient icon tile */}
      <div className={`bg-primary-gradient rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${isSmall ? 'w-8 h-8' : 'w-9 h-9'}`}>
        <Sparkles size={isSmall ? 16 : 20} className="text-white" />
      </div>

      {/* Wordmark */}
      <span className={`tracking-tight font-bold ${isSmall ? 'text-lg' : 'text-xl'}`}>
        <span className="text-ink">Drexel</span>
        <span className="text-gradient font-bold">-Ai</span>
      </span>
    </div>
  );
}
