import React, { useId } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  label?: string;
  errorMessage?: string;
}

export function Input({ error, label, errorMessage, id, ...rest }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = errorMessage ? `${inputId}-error` : undefined;

  return (
    <div className="ep-input-wrapper">
      {label && (
        <label className="ep-input-label" htmlFor={inputId}>
          {label}
        </label>
      )}
      <input
        {...rest}
        id={inputId}
        aria-invalid={error || undefined}
        aria-describedby={errorId}
        className={`ep-input${error ? ' ep-input--error' : ''}${rest.className ? ` ${rest.className}` : ''}`}
      />
      {errorMessage && (
        <p id={errorId} className="ep-input-error-message">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
