import { ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react';
import type { FC, ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useComponentPreviewStore } from '@/store/useComponentPreviewStore';
import type { IR } from '@retikz/core';
import { convertReactNodeToIR } from '@retikz/react';

import { HighlightedCode } from '../highlight-code';
import { ComponentDetailDialog } from './ComponentDetailDialog';
import { CopyButton, ToolbarIconButton, ViewToggle } from './_parts';
import { type AlignKey, type SourceView, alignClass, formatIR } from './_shared';
import { PanZoomToolbar } from './PanZoomToolbar';
import { usePanZoom } from './usePanZoom';

/**
 * 收集 contents/<...>/<name>.demo.tsx 下的所有 demo（demo 文件与 mdx 同级，靠 .demo.tsx 后缀甄别）：
 * - demoModules：模块本体，用 default 导出当作渲染组件
 * - demoSources：?raw 取源码字符串，作为 ComponentPreview 底部代码段展示
 * 双 glob 同 key 一一对应，build 时由 vite 处理，零自定义脚本。
 */
// import.meta.glob 默认类型 Record<string, T>，但运行时未匹配的 key 是 undefined，
// 显式声明为 `T | undefined` 让 TS 知道下面的存在性检查不是冗余。
const demoModules: Record<string, { default: FC } | undefined> = import.meta.glob<{
  default: FC;
}>('../../../contents/**/*.demo.tsx', { eager: true });
const demoSources: Record<string, string | undefined> = import.meta.glob<string>('../../../contents/**/*.demo.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const buildKey = (segments: Array<string>, name: string) => `../../../contents/${segments.join('/')}/${name}.demo.tsx`;

/** 折叠态显示前几行 */
const PREVIEW_MAX_LINES = 3;
/** 已 View Code 之后默认折叠状态下的代码区高度上限（按 ~15 行 × 1.5em line-height + 一点点 padding 算）*/
const COLLAPSED_CODE_MAX_H = '[&_pre]:max-h-[15rem] [&_pre]:overflow-y-auto';
/** 触发「展开/收起」按钮的最小行数门槛 */
const COLLAPSE_THRESHOLD_LINES = 10;

export type ComponentPreviewProps = {
  /** demo 文件名（不含 `.demo.tsx` 后缀），相对当前 mdx 同级目录解析 */
  name: string;
  /** 渲染区垂直对齐，默认 center */
  align?: AlignKey;
  /** 透传到 demo 渲染区父级 div 的 className，可覆盖默认的 h-72 / p-10 / 居中等 */
  componentClassName?: string;
  /** 隐藏底部「View Code / 源码 / IR」面板，只保留 demo 渲染区——用于叙述性插图，让 retikz 画的图当配图使 */
  hideCode?: boolean;
};

/**
 * MDX 内的"渲染 + 源码"演示卡。下半段对齐 shadcn v4 的 View Code 一次性切换。
 * 拆分：
 * - 平移 / 缩放状态走 `usePanZoom`，与 Dialog 共享上下文
 * - hover 工具条在 `PanZoomToolbar`
 * - 放大查看 + 编辑在 `MaximizedDialog`
 * 本文件保留 demo 数据载入 + 卡片骨架 + 下方代码面板（View Code / 折叠 / 复制）三段。
 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const { name, align = 'center', componentClassName, hideCode = false } = props;
  // ALL hooks 必须无条件先于 early return 调用。
  // 局部状态用 `boolean | undefined`：undefined 表示「用户尚未对此卡单独操作过」，跟随全局默认；
  // 一旦点过 View Code / X / 展开，本地选择就胜过全局，后续切换全局开关不会再改写它。
  const [localIsCodeVisible, setLocalIsCodeVisible] = useState<boolean | undefined>(undefined);
  const [view, setView] = useState<SourceView>('react');
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  // 卡内 drag 默认关闭，靠工具条 Hand 按钮开启；Dialog 内强制开启
  const [dragEnabled, setDragEnabled] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag } =
    usePanZoom();

  // 全局默认（仅在该卡 local 仍为 undefined 时生效）：
  // - isExpand 启用 → 默认揭示并展开
  // - hideCode 启用 → 默认收回到 View Code 占位（与卡的初始默认一致）
  // - 二者同启用时让 hideCode 胜出（更克制；isExpand 若想覆盖须用户单卡点开）
  const globalHideCode = useComponentPreviewStore(s => s.hideCode);
  const globalIsExpand = useComponentPreviewStore(s => s.isExpand);
  const isCodeVisible = localIsCodeVisible ?? globalHideCode;
  const isExpanded = localIsExpanded ?? globalIsExpand;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const { moduleId, sectionId, pageId, subPageId } = useParams<'moduleId' | 'sectionId' | 'pageId' | 'subPageId'>();

  // demo 解析需要在 useMemo 之前算出 Component 引用，所以这里允许「找不到」时为 undefined，
  // 不在这里 early return（hooks 顺序要稳）；最终的"找不到"分支由下面的 if (!mod || ...) 走
  const segments =
    moduleId && sectionId && pageId
      ? subPageId
        ? [moduleId, sectionId, pageId, subPageId]
        : [moduleId, sectionId, pageId]
      : null;
  const key = segments ? buildKey(segments, name) : null;
  const mod = key ? demoModules[key] : undefined;
  const source = key ? demoSources[key] : undefined;
  const Component = mod?.default;

  // IR 视图：调一次 Component()（demo 是一个直接返回 <Tikz>...</Tikz> 的纯 FC，无 hooks 不会出问题），
  // 优先看 Tikz 的 ir prop（demo 可能是 <Tikz ir={...}/> 直接喂 IR），否则把 children 喂给 convertReactNodeToIR；
  // 失败回落给一段错误文本而不是抛出。hideCode 时 IR 区根本不渲染——跳过整次 IR 计算
  const irJson = useMemo(() => {
    if (!Component || hideCode) return '';
    try {
      const tikzElement = Component({}) as ReactElement<{ children?: ReactNode; ir?: IR }> | null;
      const irFromProp = tikzElement?.props.ir;
      const ir = irFromProp ?? convertReactNodeToIR(tikzElement?.props.children);
      return formatIR(ir);
    } catch (err) {
      return `// Failed to compute IR: ${err instanceof Error ? err.message : String(err)}`;
    }
  }, [Component, hideCode]);

  if (!moduleId || !sectionId || !pageId) return null;

  if (!mod || source == null || !key || !Component) {
    return (
      <div className="my-6 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
        Demo <code className="rounded bg-muted px-1">{name}</code> not found at{' '}
        <code className="rounded bg-muted px-1">{key ?? '(unknown)'}</code>
      </div>
    );
  }

  // 行数足够（> PREVIEW_MAX_LINES）才进入「截断 + View Code 揭开」流；不够就直接全开
  const trimmedSource = source.replace(/\n$/, '');
  const lineCount = trimmedSource.split('\n').length;
  const hasMoreLines = lineCount > PREVIEW_MAX_LINES;
  const sourcePreview = trimmedSource.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n');
  const showFull = isCodeVisible || !hasMoreLines;

  const fullCode = view === 'ir' ? irJson : trimmedSource;
  const fullLang = view === 'ir' ? 'json' : 'tsx';
  const displayedCode = showFull ? fullCode : sourcePreview;
  const displayedLang = showFull ? fullLang : 'tsx';
  const displayedLineCount = displayedCode.split('\n').length;

  // 复制逻辑沿用 CodeBlock：useRef 持有 timer，点击重置 + unmount 清；3s 后回到 Copy。
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

  return (
    <div className="my-6 overflow-hidden rounded-xl border">
      <div
        className={cn(
          'group/preview relative flex h-72 w-full justify-center overflow-hidden p-10 select-none',
          alignClass[align],
          cardDragCursor,
          componentClassName,
        )}
        onMouseDown={beginDrag(dragEnabled)}
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
          toggleDrag={() => setDragEnabled(prev => !prev)}
          onMaximize={() => setIsMaximized(true)}
        />
      </div>
      {hideCode ? null : (
        <div className="relative overflow-hidden border-t bg-muted/50 text-sm">
          {showFull ? (
            <>
              <div className="flex items-center justify-between p-1 px-2">
                <div className="flex items-center gap-1">
                  <ViewToggle view={view} onChange={setView} />
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
      )}
      <ComponentDetailDialog
        open={isMaximized}
        onOpenChange={setIsMaximized}
        name={name}
        Component={Component}
        trimmedSource={trimmedSource}
        irJson={irJson}
        align={align}
      />
    </div>
  );
};
