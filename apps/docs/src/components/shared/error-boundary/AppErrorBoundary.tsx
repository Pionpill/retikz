import { Component, type ErrorInfo, type ReactNode } from 'react';

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
  info: ErrorInfo | null;
};

/**
 * 顶层 ErrorBoundary：抓 render 阶段未捕获异常并展示可读错误页，避免整树 unmount 后用户看到"白屏"
 * @description 仅捕获 render / lifecycle 同步抛出；事件 handler 内的异步异常仍会冒到 window.onerror。重置按钮把 state 清空让子树重新挂载；常用于交互后 React 抛 invariant 的场景
 */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    console.error('[AppErrorBoundary] caught:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ error: null, info: null });
  };

  override render(): ReactNode {
    const { error, info } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="mx-auto max-w-3xl p-8 font-mono text-sm">
        <h1 className="mb-3 text-base font-semibold text-destructive">页面渲染异常</h1>
        <p className="mb-2 text-muted-foreground">下方是错误详情，复制后反馈给维护者；点「重试」会重新挂载子树。</p>
        <pre className="mt-3 overflow-auto rounded border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
          {error.message}
          {info?.componentStack ? `\n\n${info.componentStack}` : ''}
        </pre>
        <button
          type="button"
          onClick={this.handleReset}
          className="mt-4 cursor-pointer rounded border bg-background px-3 py-1.5 text-xs hover:bg-accent"
        >
          重试 / Retry
        </button>
      </div>
    );
  }
}
