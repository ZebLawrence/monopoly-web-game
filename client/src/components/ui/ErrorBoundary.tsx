'use client';

import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '48px 24px',
            textAlign: 'center',
            minHeight: '200px',
          }}
          role="alert"
          data-testid="error-boundary-fallback"
        >
          <div style={{ fontSize: '2rem', marginBottom: '16px' }}>&#x26A0;&#xFE0F;</div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>
            Something went wrong
          </h2>
          <p
            style={{
              fontSize: '0.875rem',
              color: '#616161',
              marginBottom: '16px',
              maxWidth: '400px',
            }}
          >
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button
            onClick={this.handleRetry}
            data-testid="error-retry-button"
            style={{
              padding: '8px 24px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#1a5e3a',
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
