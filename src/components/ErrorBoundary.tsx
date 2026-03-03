import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
    resetKeys?: any[];
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidUpdate(prevProps: Props) {
        if (this.props.resetKeys && prevProps.resetKeys) {
            // Check if any reset key has changed
            const hasChanged = this.props.resetKeys.some((key, index) => key !== prevProps.resetKeys![index]);
            if (hasChanged && this.state.hasError) {
                this.setState({ hasError: false, error: null, errorInfo: null });
            }
        }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
        this.setState({ errorInfo });
    }

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div style={{ padding: '20px', color: 'red', backgroundColor: '#xffeae', zIndex: 9999, position: 'relative', width: '100%', height: '100%', overflow: 'auto' }}>
                    <h3 className="text-sm font-bold">Something went wrong.</h3>
                    <details style={{ whiteSpace: 'pre-wrap', fontSize: '10px' }}>
                        {this.state.error && this.state.error.toString()}
                    </details>
                    <button onClick={() => this.setState({ hasError: false, error: null })} className="mt-4 px-4 py-2 bg-red-100 text-red-800 rounded">Retry</button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
