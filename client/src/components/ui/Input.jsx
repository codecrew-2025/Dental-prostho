// client/src/components/ui/Input.jsx
import React from 'react';
import { ERROR_TEXT_DARK, INPUT_DARK, LABEL_DARK } from '../../styles/designTokens';

const Input = ({
  type = 'text',
  label,
  error,
  className = '',
  required = false,
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className={LABEL_DARK}>
          {label}
          {required && <span className="text-blue-400 ml-1">*</span>}
        </label>
      )}
      <input
        type={type}
        className={`${INPUT_DARK} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''} ${className}`}
        {...props}
      />
      {error && <p className={ERROR_TEXT_DARK}>{error}</p>}
    </div>
  );
};

export default Input;
