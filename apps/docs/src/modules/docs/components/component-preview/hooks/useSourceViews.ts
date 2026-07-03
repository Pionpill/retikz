import type { ReactNode } from 'react';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { ComponentRenderSource, ComponentSourceFile, RendererMode, SourceView } from '../types';

import { availableSourceViews } from '../utils';

/** useSourceViews 返回值。 */
export type SourceViewsState = {
  /** 可用视图（固定顺序，按是否有文件过滤） */
  views: Array<SourceView>;
  /** ≥ 2 个视图才出视图切换 */
  showViewToggle: boolean;
  /** 生效视图（用户选的若已不可用则兜底到第一个可用） */
  view: SourceView;
  setView: (next: SourceView) => void;
  /** 生效视图的源码文件 */
  files: Array<ComponentSourceFile>;
  /** 夹取到合法范围的文件下标 */
  activeFileIndex: number;
  /** 当前文件 */
  activeFile: ComponentSourceFile | undefined;
  /** 当前视图的「对应 runtime 渲染」实现。 */
  render?: (mode: RendererMode) => ReactNode;
  copied: boolean;
  /** 复制当前文件的真实源码（与 diff 视觉装饰无关） */
  handleCopy: () => void;
};

/** 演示卡源码视图的共享状态。 */
export const useSourceViews = (source: ComponentRenderSource | undefined, fileIndex: number): SourceViewsState => {
  const views = useMemo(() => (source ? availableSourceViews(source) : []), [source]);
  const [view, setView] = useState<SourceView>('react');
  const effectiveView: SourceView = views.includes(view) ? view : (views[0] ?? 'react');
  const viewData = source?.[effectiveView];
  const files = viewData?.files ?? [];
  const activeFileIndex = Math.min(fileIndex, Math.max(files.length - 1, 0));
  const activeFile = files.at(activeFileIndex);

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);
  const handleCopy = () => {
    void navigator.clipboard.writeText(activeFile?.code ?? '');
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  };

  return {
    views,
    showViewToggle: views.length >= 2,
    view: effectiveView,
    setView,
    files,
    activeFileIndex,
    activeFile,
    render: viewData?.render,
    copied,
    handleCopy,
  };
};
