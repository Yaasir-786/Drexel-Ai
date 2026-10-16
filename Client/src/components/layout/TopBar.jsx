// TopBar component with responsive hamburger, credits pill, theme toggle, and avatar
import React from 'react';
import { Menu, Coins } from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import { useAuth } from '../../context/AuthContext';

export default function TopBar({ onOpenMobileMenu }) {
  const { user } = useAuth();

  return (
    <header className="h-16 border-b border-line bg-card/80 px-4 md:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: Hamburger button on screens below 1024px (hidden on lg and up) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open mobile menu"
          className="lg:hidden p-2 rounded-xl text-muted hover:text-ink hover:bg-surface border border-line cursor-pointer outline-none focus:ring-2 focus:ring-[#0099FF]"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* Right side: credits pill (ONE line), theme toggle, and avatar */}
      <div className="flex items-center gap-3">
        {/* Credits pill (strictly ONE line) */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-medium text-ink whitespace-nowrap">
          <Coins size={14} className="text-[#0099FF] shrink-0" />
          <span>{user?.credits || '178.6'} credits</span>
        </div>

        {/* 40x40 Theme toggle */}
        <ThemeToggle />

        {/* User Avatar */}
        <div
          className="w-10 h-10 rounded-xl bg-primary-gradient flex items-center justify-center text-white text-sm font-semibold select-none shadow-sm shrink-0"
          title={user?.name || 'User'}
        >
          {user?.initials || 'JD'}
        </div>
      </div>
    </header>
  );
}
