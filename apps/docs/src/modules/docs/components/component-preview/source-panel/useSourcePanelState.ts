import type { ReactNode } from 'react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  ComponentRenderSource,
  ComponentSourceFile,
  DiffLineKind,
  DiffMode,
  RendererMode,
  SourceLang,
  SourceView,
} from '../types';

import { availableSourceViews, filterDiffByMode } from './utils';

const EMPTY_SOURCE_FILES: Array<ComponentSourceFile> = [];

/** 源码面板当前应展示的代码。 */
export type SourcePanelDisplay = {
  /** 语法高亮语言。 */
  lang: SourceLang;
  /** 展示代码。 */
  code: string;
  /** 与展示代码逐行对应的 diff 类型。 */
  lineKinds?: ReadonlyArray<DiffLineKind>;
  /** 展示代码行数。 */
  lineCount: number;
  /** 是否显示 diff 模式选择器。 */
  showDiffPicker: boolean;
};

/** 源码面板的独立运行时状态。 */
export type SourcePanelState = {
  /** 可用源码视图。 */
  views: Array<SourceView>;
  /** 当前源码视图。 */
  view: SourceView;
  /** 切换源码视图。 */
  setView: (view: SourceView) => void;
  /** 当前视图下的源码文件。 */
  files: Array<ComponentSourceFile>;
  /** 已夹取到当前文件范围的下标。 */
  activeFileIndex: number;
  /** 切换当前源码文件。 */
  setActiveFileIndex: (index: number) => void;
  /** 当前源码文件。 */
  activeFile?: ComponentSourceFile;
  /** 当前源码视图对应的预览渲染器。 */
  activeRender?: (mode: RendererMode) => ReactNode;
  /** 当前源码视图固定使用的渲染目标；缺省时由预览面板自行选择。 */
  activeRendererMode?: RendererMode;
  /** 当前 diff 模式。 */
  diffMode: DiffMode;
  /** 切换 diff 模式。 */
  setDiffMode: (mode: DiffMode) => void;
  /** 复制按钮是否处于反馈态。 */
  copied: boolean;
  /** 复制当前文件的原始源码。 */
  copyActiveFile: () => void;
  /** 计算 teaser 或完整源码的展示数据。 */
  display: (showFull: boolean) => SourcePanelDisplay;
};

/** 创建与卡片或弹窗实例隔离的源码面板状态。 */
export const useSourcePanelState = (source: ComponentRenderSource | undefined): SourcePanelState => {
  const views = useMemo(() => (source ? availableSourceViews(source) : []), [source]);
  const [view, setView] = useState<SourceView>('react');
  const effectiveView: SourceView = views.includes(view) ? view : (views[0] ?? 'react');
  const viewData = source?.[effectiveView];
  const files = viewData?.files ?? EMPTY_SOURCE_FILES;
  const [fileIndex, setFileIndex] = useState(0);
  const activeFileIndex = Math.min(Math.max(fileIndex, 0), Math.max(files.length - 1, 0));
  const activeFile = files.at(activeFileIndex);
  const [selectedDiffMode, setDiffMode] = useState<DiffMode | undefined>(undefined);
  const diffMode: DiffMode = selectedDiffMode ?? (activeFile?.diff ? 'added' : 'off');

  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const copyActiveFile = useCallback(() => {
    void navigator.clipboard.writeText(activeFile?.code ?? '');
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  }, [activeFile?.code]);

  const display = useCallback(
    (showFull: boolean): SourcePanelDisplay => {
      const code = activeFile?.code ?? '';
      const lang = activeFile?.lang ?? 'tsx';
      if (!showFull) {
        const teaser = code.split('\n').slice(0, 3).join('\n');
        return {
          lang,
          code: teaser,
          lineCount: teaser.split('\n').length,
          showDiffPicker: false,
        };
      }

      const diff = activeFile?.diff;
      const displayedDiff = diff !== undefined && diffMode !== 'off' ? filterDiffByMode(diff, diffMode) : undefined;
      const displayedCode = displayedDiff?.code ?? code;
      return {
        lang,
        code: displayedCode,
        lineKinds: displayedDiff?.lineKinds,
        lineCount: displayedCode.split('\n').length,
        showDiffPicker: diff !== undefined,
      };
    },
    [activeFile, diffMode],
  );

  return useMemo(
    () => ({
      views,
      view: effectiveView,
      setView,
      files,
      activeFileIndex,
      setActiveFileIndex: setFileIndex,
      activeFile,
      activeRender: viewData?.render,
      activeRendererMode: viewData?.rendererMode,
      diffMode,
      setDiffMode,
      copied,
      copyActiveFile,
      display,
    }),
    [
      activeFile,
      activeFileIndex,
      copied,
      copyActiveFile,
      diffMode,
      display,
      effectiveView,
      files,
      viewData?.render,
      viewData?.rendererMode,
      views,
    ],
  );
};
