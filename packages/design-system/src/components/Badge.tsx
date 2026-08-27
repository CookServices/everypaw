import React from 'react';

export interface BadgeProps {
  variant: 'print' | 'ship' | 'memorial';
  children: React.ReactNode;
}

export function Badge({ variant, children }: BadgeProps) {
  return <span className={`ep-badge ep-badge--${variant}`}>{children}</span>;
}
