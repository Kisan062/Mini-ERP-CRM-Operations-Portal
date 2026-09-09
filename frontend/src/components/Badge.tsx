import React from 'react';

interface BadgeProps {
  status: string;
}

export const Badge: React.FC<BadgeProps> = ({ status }) => {
  const normalized = status.toLowerCase();

  let className = 'badge';
  if (normalized === 'draft') className += ' badge-draft';
  else if (normalized === 'confirmed') className += ' badge-confirmed';
  else if (normalized === 'cancelled') className += ' badge-cancelled';
  else if (normalized === 'lead') className += ' badge-lead';
  else if (normalized === 'active') className += ' badge-active';
  else if (normalized === 'inactive') className += ' badge-inactive';
  else if (normalized === 'retail') className += ' badge-retail';
  else if (normalized === 'wholesale') className += ' badge-wholesale';
  else if (normalized === 'distributor') className += ' badge-distributor';
  else className += ' badge-inactive';

  return <span className={className}>{status}</span>;
};
