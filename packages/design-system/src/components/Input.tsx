import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
}

export function Input({ error, label, id, ...rest }: InputProps) {
  return (
    <div className="ep-input-wrapper">
      {label && (
        <label className="ep-input-label" htmlFor={id}>
          {label}
        </label>
      )}
      <input
        id={id}
        {...rest}
        className={`ep-input${error ? ' ep-input--error' : ''}${rest.className ? ` ${rest.className}` : ''}`}
      />
    </div>
  );
}
