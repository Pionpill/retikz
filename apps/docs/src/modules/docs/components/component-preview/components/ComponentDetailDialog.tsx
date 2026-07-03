import type { FC, ReactNode, Ref } from 'react';

import { X } from 'lucide-react';
import { Fragment, useRef } from 'react';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

import type { AlignKey, ComponentRenderSource, PreviewAction, PreviewOverlay, RendererMode } from '../types';

import { HighlightCode } from '../../highlight-code';
import { alignClass } from '../constants';
import { PreviewActionStateContext } from '../context';
import { usePanZoom, usePreviewActions, useSourceViews } from '../hooks';
import { filterDiffByMode } from '../utils';
import { DemoRenderer } from './DemoRenderer';
import { CopyButton, RendererModeButton, SourceViewBar, ToolbarIconButton } from './parts';
import { PreviewActionBar } from './PreviewActionBar';

export type ComponentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** demo 文件名（用于 header 标识） */
  name: string;
  Component: FC;
  /** 代码区视图集合；缺省 / 双字段都空时退化为单 panel 仅显示渲染区 */
  source?: ComponentRenderSource;
  align: AlignKey;
  /** 当前渲染目标 */
  rendererMode: RendererMode;
  /** 切换当前渲染目标 */
  toggleRendererMode: () => void;
  /** 交互式 demo：真渲染 `<Component/>`，隐藏 svg/canvas 切换 */
  interactive?: boolean;
  /** demo 含动画：装配内置动画工具（重播 / 播放暂停 / 停止） */
  animated?: boolean;
  /** 自定义动作按钮 */
  actions?: Array<PreviewAction>;
  /** 自定义动作栏是否常驻显示；默认 true */
  actionsAlwaysVisible?: boolean;
  /** 渲染区内常驻浮层 */
  overlays?: Array<PreviewOverlay>;
  /** 当前 React 源码文件序号，与卡片内源码面板共享 */
  sourceFileIndex: number;
  /** 切换 React 源码文件时同步回卡片层 */
  onSourceFileIndexChange: (index: number) => void;
};

const DOT_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklab, var(--foreground) 15%, transparent) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
};

type DialogDemoPaneProps = {
  align: AlignKey;
  children: ReactNode;
  /** 渲染区 DOM ref（供动画工具 getAnimations） */
  paneRef?: Ref<HTMLDivElement>;
  /** 左上角动作栏（重播 / 播放暂停 / 停止 …），渲染在 relative 容器内 */
  actionBar?: ReactNode;
};

const DialogDemoPane: FC<DialogDemoPaneProps> = props => {
  const { align, children, paneRef, actionBar } = props;
  const { isDragging, transformStyle, beginDrag } = usePanZoom();
  const dragCursor = isDragging ? 'cursor-grabbing' : 'cursor-grab';
  return (
    <div
      style={DOT_PATTERN_STYLE}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden p-10 select-none touch-none',
        alignClass[align],
        dragCursor,
      )}
      onMouseDown={beginDrag(true)}
      onTouchStart={beginDrag(true)}
    >
      {actionBar}
      <div
        ref={paneRef}
        className={cn(
          'flex items-center justify-center [&>canvas]:max-h-full [&>canvas]:max-w-full [&>svg]:max-h-full [&>svg]:max-w-full',
          !isDragging && 'transition-transform duration-150',
        )}
        style={{ transform: transformStyle }}
      >
        {children}
      </div>
    </div>
  );
};

/** 演示卡详情模态。 */
export const ComponentDetailDialog: FC<ComponentDetailDialogProps> = props => {
  const {
    open,
    onOpenChange,
    name,
    Component,
    source,
    align,
    rendererMode,
    toggleRendererMode,
    interactive,
    animated = false,
    actions,
    actionsAlwaysVisible = true,
    overlays,
    sourceFileIndex,
    onSourceFileIndexChange,
  } = props;
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

  const paneRef = useRef<HTMLDivElement>(null);
  const { replayNonce, actionCtx, allActions, previewActionState, overlayNodes } = usePreviewActions({
    animated,
    actions,
    overlays,
    rendererMode,
    renderPaneRef: paneRef,
  });
  const actionBar = (
    <PreviewActionBar
      actions={allActions}
      ctx={actionCtx}
      alwaysVisible={actionsAlwaysVisible || (actions?.length ?? 0) === 0}
    />
  );
  const demoContent = (
    <Fragment key={replayNonce}>
      <PreviewActionStateContext.Provider value={previewActionState}>
        {activeRender ? (
          activeRender(rendererMode)
        ) : (
          <DemoRenderer Component={Component} rendererMode={rendererMode} interactive={interactive} />
        )}
      </PreviewActionStateContext.Provider>
    </Fragment>
  );

  const activeCode = activeFile?.code ?? '';
  const activeLang = activeFile?.lang ?? 'tsx';
  const activeDiff = activeFile?.diff;
  const displayedDiff = activeDiff !== undefined ? filterDiffByMode(activeDiff, 'added') : null;
  const displayedCode = displayedDiff?.code ?? activeCode;
  const displayedLineKinds = displayedDiff?.lineKinds;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex h-[90vh] max-h-[900px] w-[96vw] max-w-[1500px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1500px]"
      >
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <DialogTitle className="font-mono text-sm font-normal text-muted-foreground">{name}</DialogTitle>
          <div className="flex items-center gap-1">
            <RendererModeButton rendererMode={rendererMode} onToggle={toggleRendererMode} />
            <DialogClose asChild>
              <ToolbarIconButton label="Close">
                <X className="size-4" />
              </ToolbarIconButton>
            </DialogClose>
          </div>
        </header>
        {hasCode ? (
          <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
            <ResizablePanel defaultSize={60} minSize={30} maxSize={85}>
              <DialogDemoPane
                align={align}
                paneRef={paneRef}
                actionBar={
                  <>
                    {actionBar}
                    {overlayNodes}
                  </>
                }
              >
                {demoContent}
              </DialogDemoPane>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40} minSize={15}>
              <div className="flex h-full min-w-0 flex-col bg-muted/30">
                <div className="flex shrink-0 items-center justify-between gap-2 border-b p-1 px-2">
                  <div className="flex min-w-0 flex-1 items-center gap-1">
                    <SourceViewBar
                      views={views}
                      view={view}
                      onViewChange={setView}
                      files={files}
                      activeFileIndex={activeFileIndex}
                      onFileChange={onSourceFileIndexChange}
                    />
                  </div>
                  <CopyButton copied={copied} onCopy={handleCopy} />
                </div>
                <div className="min-h-0 flex-1 overflow-auto [&_code]:!text-sm [&_pre]:!text-xs">
                  <HighlightCode
                    lang={activeLang}
                    code={displayedCode}
                    showLineNumbers
                    lineKinds={displayedLineKinds}
                  />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <div className="min-h-0 flex-1">
            <DialogDemoPane
              align={align}
              paneRef={paneRef}
              actionBar={
                <>
                  {actionBar}
                  {overlayNodes}
                </>
              }
            >
              {demoContent}
            </DialogDemoPane>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
