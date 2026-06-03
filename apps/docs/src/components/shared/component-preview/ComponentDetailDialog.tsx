import { X } from 'lucide-react';
import { type FC, type ReactNode } from 'react';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

import { HighlightedCode } from '../highlight-code';
import type { ComponentRenderSource } from './ComponentRender';
import { CopyButton, RendererModeButton, SourceViewBar, ToolbarIconButton } from './_parts';
import { type AlignKey, type RendererMode, alignClass, filterDiffByMode } from './_shared';
import { DemoRenderer } from './DemoRenderer';
import { useSourceViews } from './useSourceViews';
import { usePanZoom } from './usePanZoom';

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
  /** 当前 React 源码文件序号，与卡片内源码面板共享 */
  sourceFileIndex: number;
  /** 切换 React 源码文件时同步回卡片层 */
  onSourceFileIndexChange: (index: number) => void;
};

/** Dialog 左侧渲染区的「透明」点状底纹（仿 PS/Figma 棋盘的 dot 版本，用 color-mix 同步主题） */
const DOT_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklab, var(--foreground) 15%, transparent) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
};

/**
 * 把 transform / drag 状态封装在自己内部
 * @description 拖拽期间 setState 只让本组件重渲染，不带动右侧 HighlightedCode 重跑 syntax highlight（之前 transform 提到 Dialog 顶层 → 整树重渲染 → 卡）
 */
type DialogDemoPaneProps = {
  align: AlignKey;
  children: ReactNode;
};

const DialogDemoPane: FC<DialogDemoPaneProps> = props => {
  const { align, children } = props;
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
      <div
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

/**
 * 演示卡详情模态
 * @description 顶部 header（demo 名 + 关闭 X） + 左右 split-pane（左渲染 + 拖拽 transform，右代码 + React/IR 切换 + Copy）。
 *   仅一个视图存在时不出 React/IR toggle；两视图都缺（如 hideCode demo）时退化为单 panel 仅渲染区
 */
export const ComponentDetailDialog: FC<ComponentDetailDialogProps> = props => {
  const { open, onOpenChange, name, Component, source, align, rendererMode, toggleRendererMode, interactive, sourceFileIndex, onSourceFileIndexChange } = props;
  // 视图 / 文件 / 复制走共享 hook（与卡片同源推导）；view 状态本 Dialog 独立、fileIndex 经 prop 与卡片共享
  const { views, view, setView, files, activeFileIndex, activeFile, render: activeRender, copied, handleCopy } =
    useSourceViews(source, sourceFileIndex);
  const hasCode = views.length > 0;

  const activeCode = activeFile?.code ?? '';
  const activeLang = activeFile?.lang ?? 'tsx';
  const activeDiff = activeFile?.diff;
  // Dialog 暂不出 diff mode 切换，固定 'added'（与卡片默认一致——教学场景优先看新增）；任意视图均可带 diff
  const displayedDiff = activeDiff !== undefined ? filterDiffByMode(activeDiff, 'added') : null;
  const displayedCode = displayedDiff?.code ?? activeCode;
  const displayedLineKinds = displayedDiff?.lineKinds;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // 大屏放大 + 自定义 header + split-pane；showCloseButton=false：自带的右上 X 与 Copy 重合，关闭挪到 header
        showCloseButton={false}
        className="flex h-[90vh] max-h-[900px] w-[96vw] max-w-[1500px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1500px]"
      >
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <DialogTitle className="font-mono text-sm font-normal text-muted-foreground">{name}</DialogTitle>
          <div className="flex items-center gap-1">
            {!interactive && <RendererModeButton rendererMode={rendererMode} onToggle={toggleRendererMode} />}
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
              <DialogDemoPane align={align}>
                {activeRender ? (
                  activeRender(rendererMode)
                ) : (
                  <DemoRenderer Component={Component} rendererMode={rendererMode} interactive={interactive} />
                )}
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
                {/* `[&_pre]:!text-xs` 用 ! 覆盖 react-syntax-highlighter 主题注入的 inline font-size */}
                <div className="min-h-0 flex-1 overflow-auto [&_code]:!text-sm [&_pre]:!text-xs">
                  <HighlightedCode
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
            <DialogDemoPane align={align}>
              <DemoRenderer Component={Component} rendererMode={rendererMode} />
            </DialogDemoPane>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
