import { ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useComponentPreviewStore } from '@/store/useComponentPreviewStore';

import { HighlightedCode } from '../highlight-code';
import { ComponentDetailDialog } from './ComponentDetailDialog';
import { CopyButton, ToolbarIconButton, ViewToggle } from './_parts';
import { type AlignKey, type SizeKey, type SourceView, alignClass, sizeClass } from './_shared';
import { PanZoomToolbar } from './PanZoomToolbar';
import { usePanZoom } from './usePanZoom';

/** 折叠态显示前几行 */
const PREVIEW_MAX_LINES = 3;
/** 已 View Code 之后默认折叠状态下的代码区高度上限（按 ~15 行 × 1.5em line-height + 一点点 padding 算） */
const COLLAPSED_CODE_MAX_H = '[&_pre]:max-h-[15rem] [&_pre]:overflow-y-auto';
/** 触发「展开/收起」按钮的最小行数门槛 */
const COLLAPSE_THRESHOLD_LINES = 10;

/**
 * 已解析好的代码视图集合
 * @description react / ir 任一字段非空则该视图可见；两者都空（或 source 缺省）时整段代码面板不渲染。
 *   仅有一个视图时不出 React/IR toggle；teaser「View Code」流仅在 react 视图存在且行数超阈值时触发
 */
export type ComponentRenderSource = {
  react?: string;
  ir?: string;
};

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
};

/**
 * 演示卡核心：接已解析好的 Component + 源码视图，渲染卡片骨架 / pan&zoom 工具条 / 代码面板 / 放大对话框
 * @description 不接触 demo 文件加载、AST 解析或 IR 派生——那些由调用方（`ComponentPreview` 走 glob、`RetikzPreview` 走 source string）准备好后喂进来
 */
export const ComponentRender: FC<ComponentRenderProps> = props => {
  const { name, Component, source, align = 'center', size = 'md', componentClassName } = props;
  const hasReact = (source?.react ?? '').length > 0;
  const hasIr = (source?.ir ?? '').length > 0;
  const hasCode = hasReact || hasIr;

  // 局部状态用 `boolean | undefined`：undefined 跟随全局默认；用户单卡操作过一次后本地选择胜出
  const [localIsCodeVisible, setLocalIsCodeVisible] = useState<boolean | undefined>(undefined);
  // view 仅在双视图时由用户控制；单视图情境下 effectiveView 派生兜底，避免在 effect 里同步 setState
  const [view, setView] = useState<SourceView>('react');
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  // 卡内 drag 默认关闭：local 为 undefined 时跟随全局；单卡点过 Hand 后本地胜出
  const [localDragEnabled, setLocalDragEnabled] = useState<boolean | undefined>(undefined);
  // 工具条 pinned：移动端没 hover，靠 tap preview 区域 toggle
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag } =
    usePanZoom();

  const globalHideCode = useComponentPreviewStore(s => s.hideCode);
  const globalIsExpand = useComponentPreviewStore(s => s.isExpand);
  const globalDragEnabled = useComponentPreviewStore(s => s.dragEnabled);
  const isCodeVisible = localIsCodeVisible ?? globalHideCode;
  const isExpanded = localIsExpanded ?? globalIsExpand;
  const dragEnabled = localDragEnabled ?? globalDragEnabled;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const reactSource = source?.react ?? '';
  const irSource = source?.ir ?? '';

  // 单视图情境派生兜底：仅 ir 时 view 当前值无意义，effectiveView 强制返回 ir；React/IR toggle 只在双视图时渲染，所以 setView 也只能在双视图时被触发
  const effectiveView: SourceView = hasReact && hasIr ? view : hasReact ? 'react' : 'ir';

  // teaser 判定基于 react 源码行数（IR 通常更长但不是用户期望的"概览"内容）
  const reactLineCount = reactSource.split('\n').length;
  const reactHasMoreLines = reactLineCount > PREVIEW_MAX_LINES;
  const reactPreview = reactSource.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n');
  const usesTeaser = hasReact && reactHasMoreLines;
  const showFull = !usesTeaser || isCodeVisible;

  const fullCode = effectiveView === 'ir' ? irSource : reactSource;
  const fullLang = effectiveView === 'ir' ? 'json' : 'tsx';
  const displayedCode = showFull ? fullCode : reactPreview;
  const displayedLang = showFull ? fullLang : 'tsx';
  const displayedLineCount = displayedCode.split('\n').length;

  // 复制内容跟随当前视图（IR 模式复制 IR JSON，React 模式复制源码）
  const handleCopy = () => {
    void navigator.clipboard.writeText(fullCode);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  };

  const handleHideAll = () => {
    setLocalIsCodeVisible(false);
    setLocalIsExpanded(false);
    setView('react');
  };

  const cardDragCursor = dragEnabled ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : '';
  const showViewToggle = hasReact && hasIr;

  return (
    <div className="my-6 overflow-hidden rounded-xl border">
      <div
        className={cn(
          'group/preview relative flex w-full justify-center overflow-hidden p-6 sm:p-10 select-none',
          sizeClass[size],
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
          className={cn('flex items-center justify-center', !isDragging && 'transition-transform duration-150')}
          style={{ transform: transformStyle }}
        >
          <Component />
        </div>
        <PanZoomToolbar
          transform={transform}
          isTransformed={isTransformed}
          panBy={panBy}
          zoomBy={zoomBy}
          resetTransform={resetTransform}
          dragEnabled={dragEnabled}
          toggleDrag={() => setLocalDragEnabled(!dragEnabled)}
          onMaximize={() => setIsMaximized(true)}
          pinned={toolbarPinned}
        />
      </div>
      {hasCode ? (
        <div className="relative overflow-hidden border-t bg-muted/50 text-sm">
          {showFull ? (
            <>
              <div className="flex items-center justify-between p-1 px-2">
                <div className="flex items-center gap-1">
                  {showViewToggle ? <ViewToggle view={view} onChange={setView} /> : null}
                </div>
                <div className="flex items-center gap-1">
                  <CopyButton copied={copied} onCopy={handleCopy} />
                  {displayedLineCount > COLLAPSE_THRESHOLD_LINES && (
                    <ToolbarIconButton
                      label={isExpanded ? 'Collapse' : 'Expand'}
                      onClick={() => setLocalIsExpanded(!isExpanded)}
                    >
                      {isExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
                    </ToolbarIconButton>
                  )}
                  <ToolbarIconButton label="Hide source" onClick={handleHideAll}>
                    <X className="size-4" />
                  </ToolbarIconButton>
                </div>
              </div>
              <Separator className="opacity-40" />
            </>
          ) : null}
          <div className={cn('relative', showFull && !isExpanded && COLLAPSED_CODE_MAX_H)}>
            <HighlightedCode lang={displayedLang} code={displayedCode} showLineNumbers={displayedLineCount >= 10} />
            {!showFull && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'linear-gradient(to top, var(--muted), color-mix(in oklab, var(--muted) 60%, transparent), transparent)',
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setLocalIsCodeVisible(true)}
                  className="relative z-10 cursor-pointer rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted font-medium"
                >
                  View Code
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      <ComponentDetailDialog
        open={isMaximized}
        onOpenChange={setIsMaximized}
        name={name}
        Component={Component}
        source={source}
        align={align}
      />
    </div>
  );
};
