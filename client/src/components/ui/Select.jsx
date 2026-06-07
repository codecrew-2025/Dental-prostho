// client/src/components/ui/Select.jsx
import React from 'react';
import { ERROR_TEXT_DARK, LABEL_DARK, SELECT_DARK } from '../../styles/designTokens';

const Select = ({
  label,
  error,
  children,
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
      <div className="relative">
        <select
          className={`${SELECT_DARK} ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-600">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
      {error && <p className={ERROR_TEXT_DARK}>{error}</p>}
    </div>
  );
};

export default Select;
