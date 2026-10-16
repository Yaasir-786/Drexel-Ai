// Reusable Badge component for tags, roles, and status indicators
import React from 'react';

export default function Badge({
  children,
  variant = 'neutral',
  dot = false,
  className = '',
}) {
  let variantStyles = 'bg-surface text-muted border border-line';

  if (variant === 'success') {
    variantStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800';
  } else if (variant === 'warning') {
    variantStyles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800';
  } else if (variant === 'danger') {
    variantStyles = 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800';
  } else if (variant === 'primary') {
    variantStyles = 'bg-blue-50 text-[#0099FF] border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900';
  } else if (variant === 'purple') {
    variantStyles = 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success'
              ? 'bg-emerald-500'
              : variant === 'warning'
              ? 'bg-amber-500'
              : variant === 'danger'
              ? 'bg-red-500'
              : 'bg-[#0099FF]'
          }`}
        />
      )}
      {children}
    </span>
  );
}
