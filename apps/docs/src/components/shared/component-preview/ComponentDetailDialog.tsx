import { X } from 'lucide-react';
import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';

import { Dialog, DialogClose, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { cn } from '@/lib/utils';

import { HighlightedCode } from '../highlight-code';
import { CopyButton, ToolbarIconButton, ViewToggle } from './_parts';
import { type AlignKey, type SourceView, alignClass } from './_shared';
import { usePanZoom } from './usePanZoom';

export type ComponentDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** demo 文件名（用于 header 标识） */
  name: string;
  Component: FC;
  trimmedSource: string;
  irJson: string;
  align: AlignKey;
};

/** Dialog 左侧渲染区的「透明」点状底纹（仿 PS/Figma 棋盘的 dot 版本，用 color-mix 同步主题） */
const DOT_PATTERN_STYLE: React.CSSProperties = {
  backgroundImage:
    'radial-gradient(circle, color-mix(in oklab, var(--foreground) 15%, transparent) 1px, transparent 1px)',
  backgroundSize: '14px 14px',
};

/**
 * 把 transform / drag 状态封装在自己内部——拖拽期间 setState 只让本组件重渲染，
 * 不会带动右侧 HighlightedCode 重跑 syntax highlight（之前 transform 在 Dialog 顶层 → 整树重渲染 → 卡）。
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
        'relative flex h-full w-full items-center justify-center overflow-hidden p-10 select-none',
        alignClass[align],
        dragCursor,
      )}
      onMouseDown={beginDrag(true)}
    >
      <div
        className={cn('flex items-center justify-center', !isDragging && 'transition-transform duration-150')}
        style={{ transform: transformStyle }}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * 演示卡详情模态：
 * - 顶部 header：demo 名 + 关闭 X
 * - 左右 split-pane：左渲染（透明底纹 + 拖拽 + transform）、右代码
 * - 右上工具栏：React / IR 切换、Copy
 */
export const ComponentDetailDialog: FC<ComponentDetailDialogProps> = props => {
  const { open, onOpenChange, name, Component, trimmedSource, irJson, align } = props;

  // Dialog 自己的视图 / copied 状态——和外部卡完全独立，切 React/IR、点 Copy 都不会影响卡
  const [view, setView] = useState<SourceView>('react');
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    };
  }, []);

  const fullCode = view === 'ir' ? irJson : trimmedSource;

  const handleCopy = () => {
    void navigator.clipboard.writeText(fullCode);
    setCopied(true);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 3000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        // 大屏放大 + 自定义 header + split-pane；override 默认 max-w-lg / p-6 / gap-4。
        // showCloseButton=false：自带的右上 X 与代码栏 Copy 重合，关闭按钮挪到 header 里。
        showCloseButton={false}
        className="flex h-[90vh] max-h-[900px] w-[96vw] max-w-[1500px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[1500px]"
      >
        <header className="flex shrink-0 items-center justify-between border-b px-4 py-2">
          <DialogTitle className="font-mono text-sm font-normal text-muted-foreground">{name}</DialogTitle>
          <DialogClose asChild>
            <ToolbarIconButton label="Close">
              <X className="size-4" />
            </ToolbarIconButton>
          </DialogClose>
        </header>
        <ResizablePanelGroup direction="horizontal" className="min-h-0 flex-1">
          <ResizablePanel defaultSize={60} minSize={30} maxSize={85}>
            <DialogDemoPane align={align}>
              <Component />
            </DialogDemoPane>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={40} minSize={15}>
            <div className="flex h-full min-w-0 flex-col bg-muted/30">
              <div className="flex shrink-0 items-center gap-1 border-b p-1 px-2">
                <ViewToggle view={view} onChange={setView} />
                <CopyButton copied={copied} onCopy={handleCopy} className="ml-auto" />
              </div>
              {/* `[&_pre]:!text-xs` 用 ! 覆盖 react-syntax-highlighter 主题注入的 inline font-size */}
              <div className="min-h-0 flex-1 overflow-auto [&_code]:!text-sm [&_pre]:!text-xs">
                <HighlightedCode lang={view === 'ir' ? 'json' : 'tsx'} code={fullCode} showLineNumbers />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </DialogContent>
    </Dialog>
  );
};
