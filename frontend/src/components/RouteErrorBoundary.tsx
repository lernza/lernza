import React from 'react';

interface Props {
  children: React.ReactNode;
  routeName?: string;
}

interface State {
  hasError: boolean;
  errorId: string;
  error?: Error;
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorId: '' };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, errorId: Math.random().toString(36).slice(2, 10) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Exclude secrets: only log message and stack without wallet context
    console.error(`[RouteErrorBoundary:${this.props.routeName}]`, { message: error.message, stack: error.stack, componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorId: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: 24, border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', margin: 16 }}>
          <h2 style={{ fontWeight: 700, marginBottom: 8 }}>Something went wrong in {this.props.routeName || 'this view'}</h2>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>Error ID: {this.state.errorId} — you can retry or navigate away. Your wallet remains connected.</p>
          {this.state.error && <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: 120 }}>{this.state.error.message}</pre>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button onClick={this.handleRetry} style={{ padding: '8px 12px', borderRadius: 8, background: '#0057FF', color: 'white' }}>Retry</button>
            <a href="/" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', textDecoration: 'none' }}>Go Home</a>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}>Reload Page</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
