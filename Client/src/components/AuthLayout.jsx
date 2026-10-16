// AuthLayout wrapper with centered 440px card, 40px padding, and pastel background blur circles
import React from 'react';
import ThemeToggle from './ThemeToggle';

export default function AuthLayout({ children }) {
  return (
    <main className="min-h-screen bg-page text-ink flex items-center justify-center p-4 relative overflow-hidden">
      {/* Soft pastel blurred gradient background circles */}
      <div
        className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Theme toggle fixed top-right */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle />
      </div>

      {/* Centered Auth Card: 440px max width, 40px (p-10) padding */}
      <div className="w-full max-w-[440px] bg-card border border-line rounded-2xl p-10 shadow-sm relative z-10">
        {children}
      </div>
    </main>
  );
}
