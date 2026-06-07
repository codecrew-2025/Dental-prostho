// client/src/components/DepartmentCard.jsx
import React from 'react';
import { BADGE_COMING_SOON, CARD_TITLE, WHITE_CARD, WHITE_CARD_HOVER } from '../styles/designTokens';

const DepartmentCard = ({ department, onClick, showStats = false, stats = null }) => {
  const isComingSoon = department.status === 'coming_soon' || !department.isActive;

  const handleClick = () => {
    if (!isComingSoon && onClick) {
      onClick(department);
    }
  };

  const borderColor = department.color || '#00B894';

  return (
    <div
      className={`relative ${isComingSoon ? WHITE_CARD + ' opacity-50 cursor-not-allowed pointer-events-none' : WHITE_CARD_HOVER}`}
      onClick={handleClick}
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      {isComingSoon && (
        <span className={BADGE_COMING_SOON}>
          Coming Soon
        </span>
      )}

      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl" aria-hidden="true">🦷</span>
        <h3 className={CARD_TITLE}>{department.displayName || department.name}</h3>
      </div>

      {department.description && (
        <div className="mb-4">
          <p className="text-sm text-gray-500 leading-relaxed m-0">{department.description}</p>
        </div>
      )}

      {showStats && stats && (
        <div className="mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">{stats.label || 'Total Cases'}</span>
            <span className="text-xl font-semibold text-gray-800">{stats.value || 0}</span>
          </div>
        </div>
      )}

      {!isComingSoon && (
        <div className="flex justify-end pt-3 border-t border-gray-200">
          <span className="text-sm font-medium text-blue-600">Select →</span>
        </div>
      )}
    </div>
  );
};

export default DepartmentCard;
