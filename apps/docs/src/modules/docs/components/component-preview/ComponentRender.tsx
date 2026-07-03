import type { FC } from 'react';

import { Fragment, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/modules/docs/ai-chat/use-ai-chat-store';
import { useComponentPreviewStore } from '@/modules/docs/store/use-component-preview-store';

import type {
  AlignKey,
  ComponentRenderSource,
  DiffMode,
  PreviewAction,
  PreviewOverlay,
  RendererMode,
  SizeKey,
  UnifiedDiff,
} from './types';

import { downloadPreviewImage } from './commands';
import { ComponentDetailDialog, DemoRenderer, PanZoomToolbar, PreviewActionBar, SourceCodePanel } from './components';
import { alignClass, sizeClass } from './constants';
import { PreviewActionStateContext } from './context';
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
  /** 自定义动作栏是否常驻显示；默认 true */
  actionsAlwaysVisible?: boolean;
  /** 渲染区内常驻浮层（如未来的 FPS 监视器面板） */
  overlays?: Array<PreviewOverlay>;
};

/**
 * 演示卡核心：接已解析好的 Component + 源码视图，渲染卡片骨架 / pan&zoom 工具条 / 代码面板 / 放大对话框
 * @description 不接触 demo 文件加载、AST 解析或 IR 派生——那些由调用方（`ComponentPreview` 走 glob、`RetikzPreview` 走 source string）准备好后喂进来
 */
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
    actionsAlwaysVisible = true,
    overlays,
  } = props;
  // 局部状态用 `boolean | undefined`：undefined 跟随全局默认；用户单卡操作过一次后本地选择胜出
  const [localIsCodeVisible, setLocalIsCodeVisible] = useState<boolean | undefined>(undefined);
  const [sourceFileIndex, setSourceFileIndex] = useState(0);
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | undefined>(undefined);
  // diff 模式默认 'added'（有 diff 数据时）；用户选过一次后 localDiffMode 胜出。
  // 偏好 added/removed 优先于 full：full unified（current + 删除行交织）阅读噪声大，教学场景只看新增 / 只看删除更直观
  const [localDiffMode, setLocalDiffMode] = useState<DiffMode | undefined>(undefined);
  // 视图选择 + 当前视图文件 + 复制：统一走 useSourceViews（与 Dialog 共用同一份推导，任意视图都能多文件 + diff）
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
  // 卡内 drag 默认关闭：local 为 undefined 时跟随全局；单卡点过 Hand 后本地胜出
  const [localDragEnabled, setLocalDragEnabled] = useState<boolean | undefined>(undefined);
  // 卡内 svg/canvas 切换只作用于本卡：local 为 undefined 时跟随全局默认（Header 菜单设），单卡切过一次后本地胜出
  const [localRendererMode, setLocalRendererMode] = useState<RendererMode | undefined>(undefined);
  // 用户在 PanZoomToolbar 切了 size 之后本地胜出；未切时跟随 prop 的 size
  const [localSize, setLocalSize] = useState<SizeKey | undefined>(undefined);
  const effectiveSize = localSize ?? size;
  // 工具条 pinned：移动端没 hover，靠 tap preview 区域 toggle
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag } =
    usePanZoom();
  // outer card ref：Ask AI 时反查最近前置 heading 拼 prompt 用
  const containerRef = useRef<HTMLDivElement>(null);
  // 渲染区内 transform 容器的 ref：下载时从里头 querySelector('svg') 拿到当前展示的 SVG 节点
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
  // 单卡 svg/canvas 切换写本地 override，不动全局 store → 只影响当前卡
  const toggleRendererMode = () => setLocalRendererMode(rendererMode === 'svg' ? 'canvas' : 'svg');

  // 当前文件的真实源码 / 语言 / diff（任意视图均可带 diff，不再限 React）
  const activeCode = activeFile?.code ?? '';
  const activeLang = activeFile?.lang ?? 'tsx';
  const activeDiff = activeFile?.diff;

  // teaser 判定基于当前文件行数（初始 view=react，展示首几行 + View Code）
  const codeLineCount = activeCode.split('\n').length;
  const codeHasMoreLines = codeLineCount > PREVIEW_MAX_LINES;
  const codePreview = activeCode.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n');
  const usesTeaser = hasCode && codeHasMoreLines;
  const showFull = !usesTeaser || isCodeVisible;

  // 默认 'added'：有 diff 数据 → 默认只看新增；用户在下拉里改过 mode 后 local 胜出
  const hasActiveDiff = activeDiff !== undefined;
  const diffMode: DiffMode = localDiffMode ?? (hasActiveDiff ? 'added' : 'off');
  // 展开态 + 有 diff + mode≠off → 按 mode 过滤 unified diff（任意视图）
  const displayedDiff: UnifiedDiff | null =
    showFull && activeDiff !== undefined && diffMode !== 'off' ? filterDiffByMode(activeDiff, diffMode) : null;
  const displayedCode = showFull ? (displayedDiff?.code ?? activeCode) : codePreview;
  const displayedLang = activeLang;
  const displayedLineCount = displayedCode.split('\n').length;
  const displayedLineKinds = displayedDiff?.lineKinds;
  // 右侧工具条 diff 下拉：展开态 + 有 diff 数据时出（任意视图）
  const showDiffPicker = hasActiveDiff && showFull;

  const handleHideAll = () => {
    setLocalIsCodeVisible(false);
    setLocalIsExpanded(false);
    setView('react');
  };

  const handleDownload = () => downloadPreviewImage(renderPaneRef.current, name, rendererMode);

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

  const { replayNonce, actionCtx, allActions, previewActionState, overlayNodes } = usePreviewActions({
    animated,
    actions,
    overlays,
    rendererMode,
    renderPaneRef,
  });

  return (
    <div ref={containerRef} className="my-6 overflow-hidden rounded-xl border">
      <div
        className={cn(
          'group/preview relative flex w-full justify-center overflow-hidden p-6 sm:p-10 select-none',
          sizeClass[effectiveSize],
          alignClass[align],
          // 触摸设备启用拖拽时关闭浏览器原生 pan/zoom；关闭时保持默认 touch-action 让用户能正常滚动页面经过 demo
          dragEnabled && 'touch-none',
          cardDragCursor,
          componentClassName,
        )}
        onMouseDown={beginDrag(dragEnabled)}
        onTouchStart={beginDrag(dragEnabled)}
        onClick={() => setToolbarPinned(prev => !prev)}
      >
        <div
          ref={renderPaneRef}
          className={cn(
            // SVG / Canvas 都按父框收紧，不超出宽 / 高；TikZ 自身 width/height 只是 intrinsic 上限
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
        <PreviewActionBar
          actions={allActions}
          ctx={actionCtx}
          pinned={toolbarPinned}
          alwaysVisible={actionsAlwaysVisible && (actions?.length ?? 0) > 0}
        />
        {overlayNodes}
        <PanZoomToolbar
          transform={transform}
          isTransformed={isTransformed}
          panBy={panBy}
          zoomBy={zoomBy}
          resetTransform={resetTransform}
          dragEnabled={dragEnabled}
          toggleDrag={() => setLocalDragEnabled(!dragEnabled)}
          onMaximize={() => setIsMaximized(true)}
          size={effectiveSize}
          onSizeChange={setLocalSize}
          onDownload={handleDownload}
          rendererMode={rendererMode}
          toggleRendererMode={toggleRendererMode}
          pinned={toolbarPinned}
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
        actions={actions}
        actionsAlwaysVisible={actionsAlwaysVisible}
        overlays={overlays}
        sourceFileIndex={activeFileIndex}
        onSourceFileIndexChange={setSourceFileIndex}
      />
    </div>
  );
};
