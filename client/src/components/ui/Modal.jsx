// client/src/components/ui/Modal.jsx
import React, { useEffect } from 'react';
import { MODAL_OVERLAY, MODAL_PANEL } from '../../styles/designTokens';

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className = '',
  size = 'md',
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <div className={MODAL_OVERLAY}>
      <div
        className={`${MODAL_PANEL} ${sizeClasses[size]} ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold">{title}</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors p-1 hover:bg-white/10 rounded-lg"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="p-6">{children}</div>

        {footer && (
          <div className="flex justify-end gap-3 p-6 border-t border-white/10">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
