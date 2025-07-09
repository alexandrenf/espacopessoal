import React, { Component, ReactNode, useCallback, useEffect, useState } from 'react';
import { Button } from './ui/button';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  retryAttempts?: number;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  retryCount: number;
}

// Type guard functions for better null/undefined checking
export const isNotNull = <T,>(value: T | null): value is T => value !== null;
export const isNotUndefined = <T,>(value: T | undefined): value is T => value !== undefined;
export const isDefined = <T,>(value: T | null | undefined): value is T => value != null;

// Safe async operation hook
export const useSafeAsync = <T,>(
  asyncFn: () => Promise<T>,
  deps: React.DependencyList,
  onError?: (error: Error) => void
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await asyncFn();
      setData(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void execute();
  }, [execute]);

  return { data, loading, error, retry: execute };
};

export class ErrorBoundary extends Component<Props, State> {
  private maxRetries: number;

  constructor(props: Props) {
    super(props);
    this.maxRetries = props.retryAttempts ?? 3;
    this.state = { 
      hasError: false, 
      error: null, 
      errorId: null, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return { 
      hasError: true, 
      error, 
      errorId 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // Report to error tracking service in production
    if (process.env.NODE_ENV === 'production') {
      // You can integrate with services like Sentry here
      console.error('Production error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId
      });
    }
  }

  handleReset = () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      // Max retries reached, reload page
      toast.error('Maximum retry attempts reached. Reloading page...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      return;
    }
    
    this.setState({ 
      hasError: false, 
      error: null, 
      errorId: null, 
      retryCount: retryCount + 1 
    });
    
    toast.info(`Retrying... (${retryCount + 1}/${this.maxRetries})`);
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorId, retryCount } = this.state;
      const canRetry = retryCount < this.maxRetries;

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="max-w-lg w-full p-6 bg-white rounded-lg shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-8 w-8 text-red-500 flex-shrink-0" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Something went wrong</h1>
                {errorId && (
                  <p className="text-xs text-gray-500 mt-1">Error ID: {errorId}</p>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                An unexpected error occurred while loading this document. This might be a temporary issue.
              </p>
              
              {retryCount > 0 && (
                <p className="text-sm text-orange-600 mb-2">
                  Retry attempt {retryCount} of {this.maxRetries}
                </p>
              )}
            </div>
            
            {error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded border">
                  <div className="text-xs text-gray-600 mb-2">
                    <strong>Error:</strong> {error.name}
                  </div>
                  <pre className="text-xs text-gray-800 overflow-auto whitespace-pre-wrap">
                    {error.message}
                  </pre>
                  {process.env.NODE_ENV === 'development' && error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs text-gray-500">
                        Stack trace (development only)
                      </summary>
                      <pre className="mt-1 text-xs text-gray-600 overflow-auto">
                        {error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3">
              {canRetry ? (
                <Button 
                  onClick={this.handleReset} 
                  variant="default" 
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              ) : (
                <Button 
                  onClick={this.handleReload} 
                  variant="default" 
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reload Page
                </Button>
              )}
              
              <Button 
                onClick={this.handleGoHome} 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
            
            <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> If this error persists, try refreshing the page or clearing your browser cache.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundary for document operations
export class DocumentErrorBoundary extends Component<Props & { documentId?: string }, State> {
  constructor(props: Props & { documentId?: string }) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorId: null, 
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `doc_error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    return { 
      hasError: true, 
      error, 
      errorId 
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Document error caught:', error, errorInfo);
    
    // Log document-specific error information
    console.error('Document context:', {
      documentId: this.props.documentId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    });
    
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorId: null, 
      retryCount: this.state.retryCount + 1 
    });
    
    // For document errors, also clear any cached document state
    if (this.props.documentId) {
      // Clear IndexedDB cache for this document
      try {
        const request = indexedDB.deleteDatabase(`y-indexeddb-${this.props.documentId}`);
        request.onsuccess = () => {
          console.log('Cleared document cache for retry');
        };
      } catch (err) {
        console.warn('Could not clear document cache:', err);
      }
    }
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId } = this.state;
      
      return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
          <div className="max-w-md w-full p-6 bg-white rounded-lg border border-red-200 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="h-6 w-6 text-red-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Document Error</h2>
                {errorId && (
                  <p className="text-xs text-gray-500">ID: {errorId}</p>
                )}
              </div>
            </div>
            
            <p className="text-gray-600 mb-4">
              There was an error loading this document. This could be due to a network issue or document corruption.
            </p>
            
            {this.props.documentId && (
              <p className="text-sm text-gray-500 mb-4">
                Document: {this.props.documentId}
              </p>
            )}
            
            {error && (
              <details className="mb-4">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Error details
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                  {error.message}
                </pre>
              </details>
            )}
            
            <div className="flex gap-3">
              <Button onClick={this.handleReset} variant="default" size="sm">
                Retry
              </Button>
              <Button 
                onClick={() => window.location.href = '/documents'} 
                variant="outline" 
                size="sm"
              >
                Back to Documents
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}