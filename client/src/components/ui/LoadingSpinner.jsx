// client/src/components/ui/LoadingSpinner.jsx
import React from 'react';
import { LOADING_BOX } from '../../styles/designTokens';

const LoadingSpinner = ({ message = 'Loading...', className = '' }) => {
  return (
    <div className={`${LOADING_BOX} ${className}`}>
      <div className="flex justify-center mb-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
      </div>
      <p className="text-white font-semibold mb-2">{message}</p>
      <p className="text-white/90 text-sm">Please wait while we process your request.</p>
    </div>
  );
};

export default LoadingSpinner;
