// client/src/components/ui/Textarea.jsx
import React from 'react';
import { ERROR_TEXT_DARK, LABEL_DARK, TEXTAREA_DARK } from '../../styles/designTokens';

const Textarea = ({
  label,
  error,
  className = '',
  required = false,
  rows = 4,
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
      <textarea
        rows={rows}
        className={`${TEXTAREA_DARK} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''} ${className}`}
        {...props}
      />
      {error && <p className={ERROR_TEXT_DARK}>{error}</p>}
    </div>
  );
};

export default Textarea;
