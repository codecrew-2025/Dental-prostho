// client/src/components/ui/StatusBadge.jsx
import React from 'react';
import {
  BADGE_CANCELLED,
  BADGE_COMING_SOON,
  BADGE_CONFIRMED,
  BADGE_COMPLETED,
  BADGE_PENDING,
  BADGE_RESCHEDULED,
} from '../../styles/designTokens';

const StatusBadge = ({ status, children, className = '' }) => {
  const normalizeStatus = (value) => {
    const normalized = String(value || '').toLowerCase().trim().replace(/\s+/g, '_');

    if (['pending', 'waiting', 'in_progress', 'reschedule_requested'].includes(normalized)) {
      return 'pending';
    }
    if (['approved', 'confirmed', 'active'].includes(normalized)) {
      return 'confirmed';
    }
    if (['completed', 'done'].includes(normalized)) {
      return 'completed';
    }
    if (['rescheduled'].includes(normalized)) {
      return 'rescheduled';
    }
    if (['rejected', 'cancelled', 'redo'].includes(normalized)) {
      return 'cancelled';
    }
    if (['coming_soon', 'disabled', 'inactive'].includes(normalized)) {
      return 'coming_soon';
    }

    return 'pending';
  };

  const badgeType = status ? normalizeStatus(status) : 'pending';

  const variantClasses = {
    pending: BADGE_PENDING,
    confirmed: BADGE_CONFIRMED,
    completed: BADGE_COMPLETED,
    rescheduled: BADGE_RESCHEDULED,
    cancelled: BADGE_CANCELLED,
    coming_soon: BADGE_COMING_SOON.replace('absolute top-2 right-2 ', ''),
  };

  return (
    <span className={`${variantClasses[badgeType]} ${className}`}>
      {children || status}
    </span>
  );
};

export default StatusBadge;
