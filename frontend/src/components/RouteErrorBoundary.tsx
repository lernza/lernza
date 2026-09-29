import React from 'react';
import { Button } from '@/components/ui/button';

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
        <div role="alert" className="border-border bg-card m-4 border p-6 shadow-md rounded-lg">
          <h2 className="font-bold mb-2">Something went wrong in {this.props.routeName || 'this view'}</h2>
          <p className="text-muted-foreground text-sm mb-3">Error ID: {this.state.errorId} — you can retry or navigate away. Your wallet remains connected.</p>
          {this.state.error && <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-30 mb-4">{this.state.error.message}</pre>}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={this.handleRetry} variant="default">Retry</Button>
            <Button onClick={() => window.location.href = '/'} variant="outline">Go Home</Button>
            <Button onClick={() => window.location.reload()} variant="outline">Reload Page</Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
