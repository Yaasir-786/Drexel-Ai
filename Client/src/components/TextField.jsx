// Reusable TextField component with label, helper, error, and password show/hide
import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function TextField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  helperText,
  errorText,
  disabled = false,
  readOnly = false,
  showPasswordToggle = false,
  leftIcon: LeftIcon,
  className = '',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  const inputType = showPasswordToggle
    ? showPassword
      ? 'text'
      : 'password'
    : type;

  return (
    <div className={`flex flex-col gap-1.5 w-full ${className}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
      )}

      <div className="relative flex items-center w-full">
        {LeftIcon && (
          <div className="absolute left-3.5 text-muted pointer-events-none">
            <LeftIcon size={20} />
          </div>
        )}

        <input
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          className={`w-full h-11 px-3.5 rounded-xl border text-sm text-ink bg-card outline-none focus:ring-2 focus:ring-[#0099FF] ${
            errorText ? 'border-red-500' : 'border-line'
          } ${LeftIcon ? 'pl-10' : ''} ${
            showPasswordToggle || readOnly ? 'pr-11' : ''
          } ${
            readOnly || disabled
              ? 'opacity-80 cursor-not-allowed bg-surface'
              : ''
          }`}
          {...props}
        />

        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 text-muted hover:text-ink cursor-pointer outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        )}

        {readOnly && !showPasswordToggle && (
          <div className="absolute right-3.5 text-muted pointer-events-none">
            <Lock size={18} />
          </div>
        )}
      </div>

      {errorText ? (
        <span className="text-xs text-red-500 font-medium">{errorText}</span>
      ) : helperText ? (
        <span className="text-xs text-muted">{helperText}</span>
      ) : null}
    </div>
  );
}
