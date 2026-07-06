import type { FC } from 'react';

import { Fragment, useRef, useState } from 'react';

import { cn } from '@/lib';
import { useAiChatStore } from '@/modules/docs/ai-chat';
import { useComponentPreviewStore } from '@/modules/docs/store';

import type {
  AlignKey,
  ComponentRenderSource,
  DiffMode,
  PreviewAction,
  RendererMode,
  SizeKey,
  UnifiedDiff,
} from './types';

import { ComponentDetailDialog, DemoRenderer, PreviewControlSlotLayer, SourceCodePanel } from './components';
import { alignClass, sizeClass } from './constants';
import { PreviewActionStateContext } from './context';
import { buildPreviewToolSlots } from './control-slots';
import { usePanZoom, usePreviewActions, useSourceViews } from './hooks';
import { buildAskAiPrompt, filterDiffByMode, findPrecedingHeading } from './utils';

export type { ComponentRenderSource } from './types';

/** 折叠态显示前几行。 */
const PREVIEW_MAX_LINES = 3;

export type ComponentRenderProps = {
  /** demo 标识（仅用于 Dialog header 显示） */
  name: string;
  Component: FC;
  /** 代码区视图集合；缺省时整段代码面板与 Dialog 右栏都不渲染 */
  source?: ComponentRenderSource;
  /** 渲染区垂直对齐，默认 center */
  align?: AlignKey;
  /** 渲染区高度档位（xs / sm / md / lg / xl），默认 `md` */
  size?: SizeKey;
  /** 透传到 demo 渲染区父级 div 的 className，可覆盖默认高度 / p-10 / 居中等 */
  componentClassName?: string;
  /** 是否显示右侧工具条的 Ask AI 按钮，默认 true；在 AI 面板内（如 RetikzPreview）渲染时关掉避免自指 */
  showAskAi?: boolean;
  /** 交互式 demo（含 hooks / 异步）：真渲染 `<Component/>`，隐藏 svg/canvas 切换；IR / Vanilla 视图由调用方置空后自动消失 */
  interactive?: boolean;
  /** demo 含动画：自动装配内置动画工具（重播 / 播放暂停 / 停止）到左上角动作栏 */
  animated?: boolean;
  /** 自定义动作按钮（追加在内置工具之后，渲染在左上角动作栏） */
  actions?: Array<PreviewAction>;
  /** 自定义预览控制插槽，优先于兼容用的 actions。 */
  controlSlots?: Array<PreviewAction>;
  /** 自定义动作栏是否常驻显示；默认 true */
  actionsAlwaysVisible?: boolean;
  /** 渲染区内常驻浮层（如未来的 FPS 监视器面板） */
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
    actions,
    controlSlots,
    actionsAlwaysVisible = true,
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
  const resolvedControlSlots = controlSlots ?? actions;

  const { replayNonce, controlCtx, slots, previewActionState } = usePreviewActions({
    animated,
    actions: resolvedControlSlots,
    rendererMode,
    renderPaneRef,
    hovered: isPreviewHovered,
    pinned: toolbarPinned,
    expanded: isMaximized,
  });
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
          'group/preview relative flex w-full justify-center overflow-hidden p-6 sm:p-10 select-none',
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
            'flex items-center justify-center max-w-full max-h-full [&>canvas]:max-w-full [&>canvas]:max-h-full [&>svg]:max-w-full [&>svg]:max-h-full',
            !isDragging && 'transition-transform duration-150',
          )}
          style={{ transform: transformStyle }}
        >
          <Fragment key={replayNonce}>
            <PreviewActionStateContext.Provider value={previewActionState}>
              {activeRender ? (
                activeRender(rendererMode)
              ) : (
                <DemoRenderer Component={Component} rendererMode={rendererMode} interactive={interactive} />
              )}
            </PreviewActionStateContext.Provider>
          </Fragment>
        </div>
        <PreviewControlSlotLayer
          slots={[...slots, ...previewToolSlots]}
          ctx={controlCtx}
          pinned={toolbarPinned}
          alwaysVisible={actionsAlwaysVisible && (resolvedControlSlots?.length ?? 0) > 0}
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
        controlSlots={resolvedControlSlots}
        actionsAlwaysVisible={actionsAlwaysVisible}
        sourceFileIndex={activeFileIndex}
        onSourceFileIndexChange={setSourceFileIndex}
      />
    </div>
  );
};
