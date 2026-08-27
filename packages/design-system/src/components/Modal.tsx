import React from 'react';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export function Modal({ open, onClose, children, title }: ModalProps) {
  if (!open) return null;

  return (
    <div className="ep-modal-overlay" onClick={onClose} role="presentation">
      <div
        className="ep-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {title && <h2 className="ep-modal-title">{title}</h2>}
        {children}
      </div>
    </div>
  );
}
