// client/src/components/ui/Card.jsx
import React from 'react';
import { GLASS_CARD, WHITE_CARD } from '../../styles/designTokens';

const Card = ({
  variant = 'glass',
  children,
  className = '',
  hover = false,
  ...props
}) => {
  const variantClasses = {
    glass: GLASS_CARD,
    white: WHITE_CARD,
    outlined: 'bg-transparent border-2 border-white/20 rounded-xl p-6',
  };

  const hoverClasses = hover
    ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
    : '';

  return (
    <div
      className={`transition-all ${variantClasses[variant]} ${hoverClasses} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
