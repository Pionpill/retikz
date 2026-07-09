import type { FC } from 'react';

import { Fragment, useRef, useState } from 'react';

import { cn } from '@/lib';
import { useAiChatStore } from '@/modules/docs/ai-chat';
import { useComponentPreviewStore } from '@/modules/docs/store';

import type {
  AlignKey,
  ComponentRenderSource,
  DiffMode,
  PreviewControlSlot,
  RendererMode,
  SizeKey,
  UnifiedDiff,
} from './types';

import { ComponentDetailDialog, DemoRenderer, PreviewControlSlotLayer, SourceCodePanel } from './components';
import { alignClass, sizeClass } from './constants';
import { PreviewControlStateContext } from './context';
import { ANIMATION_PAUSED_CONTROL_ID, buildAnimationControlSlots, buildPreviewToolSlots } from './controls';
import { usePanZoom, useSourceViews } from './hooks';
import { usePreviewControlRuntime } from './runtime';
import { buildAskAiPrompt, filterDiffByMode, findPrecedingHeading } from './utils';

export type { ComponentRenderSource } from './types';

/** 折叠态显示前几行。 */
const PREVIEW_MAX_LINES = 3;

export type ComponentRenderProps = {
  /** demo 标识，仅用于 Dialog header 显示。 */
  name: string;
  Component: FC;
  /** 代码区视图集合；缺省时整段代码面板与 Dialog 右栏都不渲染。 */
  source?: ComponentRenderSource;
  /** 渲染区垂直对齐，默认 center。 */
  align?: AlignKey;
  /** 渲染区高度档位，默认 `md`。 */
  size?: SizeKey;
  /** 透传给 demo 渲染区父级 div 的 className。 */
  componentClassName?: string;
  /** 是否显示右侧工具栏的 Ask AI 按钮。 */
  showAskAi?: boolean;
  /** 交互型 demo：真渲染 `<Component />`。 */
  interactive?: boolean;
  /** demo 含动画：自动装配内置动画工具。 */
  animated?: boolean;
  /** 自定义预览控制插槽。 */
  controlSlots?: Array<PreviewControlSlot>;
  /** 自定义预览控件层是否常驻显示，默认 `true`。 */
  controlsAlwaysVisible?: boolean;
};

/** 演示卡核心。 */
export const ComponentRender: FC<ComponentRenderProps> = props => {
  const {
    name,
    Component,
    source,
    align = 'center',
    size = 'md',
    componentClassName,
    showAskAi = true,
    interactive,
    animated = false,
    controlSlots,
    controlsAlwaysVisible = true,
  } = props;
  const [localIsCodeVisible, setLocalIsCodeVisible] = useState<boolean | undefined>(undefined);
  const [sourceFileIndex, setSourceFileIndex] = useState(0);
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | undefined>(undefined);
  const [localDiffMode, setLocalDiffMode] = useState<DiffMode | undefined>(undefined);
  const {
    views,
    view,
    setView,
    files,
    activeFileIndex,
    activeFile,
    render: activeRender,
    copied,
    handleCopy,
  } = useSourceViews(source, sourceFileIndex);
  const hasCode = views.length > 0;
  const [localDragEnabled, setLocalDragEnabled] = useState<boolean | undefined>(undefined);
  const [localRendererMode, setLocalRendererMode] = useState<RendererMode | undefined>(undefined);
  const [localSize, setLocalSize] = useState<SizeKey | undefined>(undefined);
  const effectiveSize = localSize ?? size;
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag } =
    usePanZoom();
  const containerRef = useRef<HTMLDivElement>(null);
  const renderPaneRef = useRef<HTMLDivElement>(null);
  const setAiOpen = useAiChatStore(s => s.setOpen);
  const fillAiDraft = useAiChatStore(s => s.fillDraftAndFocus);
  const aiCurrentPage = useAiChatStore(s => s.currentPage);

  const globalHideCode = useComponentPreviewStore(s => s.hideCode);
  const globalIsExpand = useComponentPreviewStore(s => s.isExpand);
  const globalDragEnabled = useComponentPreviewStore(s => s.dragEnabled);
  const globalRendererMode = useComponentPreviewStore(s => s.rendererMode);
  const isCodeVisible = localIsCodeVisible ?? globalHideCode;
  const isExpanded = localIsExpanded ?? globalIsExpand;
  const dragEnabled = localDragEnabled ?? globalDragEnabled;
  const rendererMode = localRendererMode ?? globalRendererMode;
  const toggleRendererMode = () => setLocalRendererMode(rendererMode === 'svg' ? 'canvas' : 'svg');

  const activeCode = activeFile?.code ?? '';
  const activeLang = activeFile?.lang ?? 'tsx';
  const activeDiff = activeFile?.diff;

  const codeLineCount = activeCode.split('\n').length;
  const codeHasMoreLines = codeLineCount > PREVIEW_MAX_LINES;
  const codePreview = activeCode.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n');
  const usesTeaser = hasCode && codeHasMoreLines;
  const showFull = !usesTeaser || isCodeVisible;

  const hasActiveDiff = activeDiff !== undefined;
  const diffMode: DiffMode = localDiffMode ?? (hasActiveDiff ? 'added' : 'off');
  const displayedDiff: UnifiedDiff | null =
    showFull && activeDiff !== undefined && diffMode !== 'off' ? filterDiffByMode(activeDiff, diffMode) : null;
  const displayedCode = showFull ? (displayedDiff?.code ?? activeCode) : codePreview;
  const displayedLang = activeLang;
  const displayedLineCount = displayedCode.split('\n').length;
  const displayedLineKinds = displayedDiff?.lineKinds;
  const showDiffPicker = hasActiveDiff && showFull;

  const handleHideAll = () => {
    setLocalIsCodeVisible(false);
    setLocalIsExpanded(false);
    setView('react');
  };

  const handleAskAi = () => {
    const heading = findPrecedingHeading(containerRef.current);
    const lang = aiCurrentPage?.lang ?? 'zh';
    const pageTitle = aiCurrentPage?.title ?? '';
    const headingText = (heading?.textContent ?? '').trim();
    const prompt = buildAskAiPrompt(lang, pageTitle, headingText, name);
    setAiOpen(true);
    fillAiDraft(prompt);
  };

  const cardDragCursor = dragEnabled ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : '';
  const { remountKey, runtime, controlState } = usePreviewControlRuntime({
    rendererMode,
    renderPaneRef,
    hovered: isPreviewHovered,
    pinned: toolbarPinned,
    expanded: isMaximized,
  });
  const animationControlSlots = animated ? buildAnimationControlSlots(runtime.active(ANIMATION_PAUSED_CONTROL_ID)) : [];
  const previewToolSlots = buildPreviewToolSlots({
    transform,
    isTransformed,
    panBy,
    zoomBy,
    resetTransform,
    dragEnabled,
    toggleDrag: () => setLocalDragEnabled(!dragEnabled),
    onMaximize: () => setIsMaximized(true),
    size: effectiveSize,
    onSizeChange: setLocalSize,
    name,
    rendererMode,
    toggleRendererMode,
  });

  return (
    <div ref={containerRef} className="my-6 overflow-hidden rounded-xl border">
      <div
        className={cn(
          'group/preview relative flex w-full justify-center overflow-hidden p-6 select-none sm:p-10',
          sizeClass[effectiveSize],
          alignClass[align],
          dragEnabled && 'touch-none',
          cardDragCursor,
          componentClassName,
        )}
        onMouseDown={beginDrag(dragEnabled)}
        onMouseEnter={() => setIsPreviewHovered(true)}
        onMouseLeave={() => setIsPreviewHovered(false)}
        onTouchStart={beginDrag(dragEnabled)}
        onClick={() => setToolbarPinned(prev => !prev)}
      >
        <div
          ref={renderPaneRef}
          className={cn(
            'flex max-h-full max-w-full items-center justify-center [&>canvas]:max-h-full [&>canvas]:max-w-full [&>svg]:max-h-full [&>svg]:max-w-full',
            !isDragging && 'transition-transform duration-150',
          )}
          style={{ transform: transformStyle }}
        >
          <Fragment key={remountKey}>
            <PreviewControlStateContext.Provider value={controlState}>
              {activeRender ? (
                activeRender(rendererMode)
              ) : (
                <DemoRenderer Component={Component} rendererMode={rendererMode} interactive={interactive} />
              )}
            </PreviewControlStateContext.Provider>
          </Fragment>
        </div>
        <PreviewControlSlotLayer
          slots={[...animationControlSlots, ...(controlSlots ?? []), ...previewToolSlots]}
          runtime={runtime}
          pinned={toolbarPinned}
          alwaysVisible={controlsAlwaysVisible && (controlSlots?.length ?? 0) > 0}
        />
      </div>
      {hasCode ? (
        <SourceCodePanel
          views={views}
          view={view}
          onViewChange={setView}
          files={files}
          activeFileIndex={activeFileIndex}
          onFileChange={setSourceFileIndex}
          showFull={showFull}
          showDiffPicker={showDiffPicker}
          diffMode={diffMode}
          onDiffModeChange={setLocalDiffMode}
          copied={copied}
          onCopy={handleCopy}
          showAskAi={showAskAi}
          onAskAi={handleAskAi}
          displayedLineCount={displayedLineCount}
          isExpanded={isExpanded}
          onExpandedChange={setLocalIsExpanded}
          onHideSource={handleHideAll}
          displayedLang={displayedLang}
          displayedCode={displayedCode}
          displayedLineKinds={displayedLineKinds}
          onShowCode={() => setLocalIsCodeVisible(true)}
        />
      ) : null}
      <ComponentDetailDialog
        open={isMaximized}
        onOpenChange={setIsMaximized}
        name={name}
        Component={Component}
        source={source}
        align={align}
        rendererMode={rendererMode}
        toggleRendererMode={toggleRendererMode}
        interactive={interactive}
        animated={animated}
        controlSlots={controlSlots}
        controlsAlwaysVisible={controlsAlwaysVisible}
        sourceFileIndex={activeFileIndex}
        onSourceFileIndexChange={setSourceFileIndex}
      />
    </div>
  );
};
