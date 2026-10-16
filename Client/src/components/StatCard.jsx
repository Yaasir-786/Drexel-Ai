// StatCard component for dashboard metrics and admin overview
import React from 'react';

export default function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  iconBg = 'bg-surface',
  iconColor = 'text-ink',
  children,
  className = '',
}) {
  return (
    <div
      className={`bg-card border border-line rounded-2xl p-5 flex flex-col justify-between ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm font-medium text-muted block mb-1">
            {label}
          </span>
          <div className="text-2xl font-bold tracking-tight text-ink">
            {value}
          </div>
        </div>

        {Icon && (
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-line ${iconBg} ${iconColor}`}
          >
            <Icon size={20} />
          </div>
        )}
      </div>

      {subtext && (
        <div className="text-xs text-muted mt-3 pt-2 border-t border-line/60">
          {subtext}
        </div>
      )}

      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}
