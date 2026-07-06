import type { ErrorInfo, FC, ReactNode } from 'react';

import { AlertTriangle } from 'lucide-react';
import { Component } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

/** ErrorBoundary 组件参数。 */
export type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
  info: ErrorInfo | null;
};

type ErrorFallbackProps = {
  error: Error;
  info: ErrorInfo | null;
  onReset: () => void;
};

const getErrorDetails = (error: Error, info: ErrorInfo | null): string => {
  const stack = error.stack ?? error.message;
  const componentStack = info?.componentStack?.trim();

  if (!componentStack) return stack;
  return `${stack}\n\nComponent stack:\n${componentStack}`;
};

const ErrorFallback: FC<ErrorFallbackProps> = props => {
  const { error, info, onReset } = props;

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Alert variant="destructive" className="max-w-3xl">
        <AlertTriangle />
        <AlertTitle>页面渲染异常</AlertTitle>
        <AlertDescription className="gap-4">
          <p>下方是错误详情，复制后反馈给维护者。点击重试会重新渲染页面。</p>
          <pre className="max-h-96 w-full overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-xs text-foreground whitespace-pre-wrap">
            {getErrorDetails(error, info)}
          </pre>
          <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={onReset}>
            重试
          </Button>
        </AlertDescription>
      </Alert>
    </main>
  );
};

/** 顶层错误边界。 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    console.error('[ErrorBoundary] caught:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null, info: null });
  };

  override render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return <ErrorFallback error={error} info={info} onReset={this.handleReset} />;
  }
}
