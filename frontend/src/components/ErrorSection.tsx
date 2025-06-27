import React from 'react';

interface ErrorSectionProps {
  message: string;
  onRetry: () => void;
}

export const ErrorSection: React.FC<ErrorSectionProps> = ({ message, onRetry }) => {
  return (
    <section className="error-section">
      <div className="error-card">
        <div className="error-icon">⚠️</div>
        <h3>Something went wrong</h3>
        <p>{message}</p>
        <button className="btn btn-primary" onClick={onRetry}>
          Try Again
        </button>
      </div>
    </section>
  );
};