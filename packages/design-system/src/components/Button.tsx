import React from 'react';

export interface ButtonProps {
  variant: 'primary' | 'outline';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ variant, children, onClick, disabled }: ButtonProps) {
  return (
    <button
      type="button"
      className={`ep-btn ep-btn--${variant}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
