// ThemeToggle button (40x40) to switch between Light and Dark mode
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={`w-10 h-10 flex items-center justify-center rounded-xl border border-line bg-card hover:bg-surface text-ink cursor-pointer outline-none focus:ring-2 focus:ring-[#0099FF] ${className}`}
    >
      {theme === 'dark' ? (
        <Sun size={20} className="text-amber-400" />
      ) : (
        <Moon size={20} className="text-muted" />
      )}
    </button>
  );
}
