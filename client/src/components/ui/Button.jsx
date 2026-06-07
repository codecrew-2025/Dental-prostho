// client/src/components/ui/Button.jsx
import React from 'react';
import {
  BTN_DANGER,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SUCCESS,
} from '../../styles/designTokens';

const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: '',
    lg: 'px-6 py-3 text-base rounded-xl',
  };

  const variantClasses = {
    primary: BTN_PRIMARY,
    secondary: BTN_SECONDARY,
    success: BTN_SUCCESS,
    danger: BTN_DANGER,
    outline:
      'px-4 py-2 rounded-lg bg-transparent border-2 border-blue-500 text-blue-500 text-sm font-semibold hover:bg-blue-500 hover:text-white transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-blue-500/15 disabled:opacity-60 disabled:cursor-not-allowed',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
