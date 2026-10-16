// Reusable Button component with primary, secondary, danger, and ghost variants
import React from 'react';

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  onClick,
  disabled = false,
  className = '',
  icon: Icon,
  fullWidth = false,
  ...props
}) {
  // Base classes: 44px height, 12px radius, focus ring, no animations
  const baseClasses =
    'h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium cursor-pointer outline-none focus:ring-2 focus:ring-[#0099FF] select-none';

  // Variant classes
  let variantClasses = '';
  if (variant === 'primary') {
    variantClasses =
      'bg-primary-gradient text-white hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed';
  } else if (variant === 'secondary') {
    variantClasses =
      'bg-card border border-line text-ink hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed';
  } else if (variant === 'danger') {
    variantClasses =
      'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed';
  } else if (variant === 'ghost') {
    variantClasses =
      'bg-transparent text-muted hover:text-ink hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed';
  }

  const widthClass = fullWidth ? 'w-full' : '';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${widthClass} ${className}`}
      {...props}
    >
      {Icon && <Icon size={20} />}
      {children}
    </button>
  );
}
