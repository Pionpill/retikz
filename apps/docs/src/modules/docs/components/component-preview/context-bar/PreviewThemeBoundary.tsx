import type { FC, ReactNode } from 'react';

import { cn } from '@/lib';

import type { PreviewThemeMode } from '../types';

export type PreviewThemeBoundaryProps = {
  /** 当前预览使用的局部主题 */
  themeMode: PreviewThemeMode;
  /** 主题边界内的预览内容 */
  children: ReactNode;
  /** 边界容器附加样式 */
  className?: string;
};

/** 覆盖整个预览工作区 token 的局部主题边界 */
export const PreviewThemeBoundary: FC<PreviewThemeBoundaryProps> = props => {
  const { themeMode, children, className } = props;

  return (
    <div
      data-slot="preview-theme-boundary"
      data-theme-mode={themeMode}
      className={cn(
        'min-h-0 flex-1 bg-background text-foreground',
        themeMode === 'light' && 'preview-theme-light',
        themeMode === 'dark' && 'dark',
        className,
      )}
    >
      {children}
    </div>
  );
};
