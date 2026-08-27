import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md';
}

export function Card({ children, padding = 'md' }: CardProps) {
  return (
    <div className={`ep-card ep-card--${padding}`}>
      {children}
    </div>
  );
}
