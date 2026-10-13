import type { ReactNode } from 'react';
import { Component } from 'react';

/** 单个预览的错误隔离边界 */
export type PreviewErrorBoundaryProps = {
  /** 预览子树 */
  children: ReactNode;
};

/** 保留失败详情，避免一个 demo 阻止后续示例加载 */
export class PreviewErrorBoundary extends Component<PreviewErrorBoundaryProps, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <pre role="alert" data-demo-error className="my-6 overflow-auto rounded-md border border-destructive p-4 text-sm">
        {error.stack ?? error.message}
      </pre>
    );
  }
}
