import { ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react';
import type { FC, ReactElement, ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { docPathSegments, useDocLocation } from '@/layout/doc-layout/docLocation';
import { useComponentPreviewStore } from '@/store/useComponentPreviewStore';
import type { IR } from '@retikz/core';
import { convertReactNodeToIR } from '@retikz/react';

import { HighlightedCode } from '../highlight-code';
import { ComponentDetailDialog } from './ComponentDetailDialog';
import { CopyButton, ToolbarIconButton, ViewToggle } from './_parts';
import { type AlignKey, type SizeKey, type SourceView, alignClass, formatIR, sizeClass } from './_shared';
import { PanZoomToolbar } from './PanZoomToolbar';
import { usePanZoom } from './usePanZoom';

/**
 * 收集 contents 下全部 demo 模块 + 源码字符串
 * @description 双 glob 同 key 一一对应：default 导出当渲染组件，?raw 取源码喂底部代码段。`undefined` 显式声明，让 TS 知道存在性检查不是冗余
 */
const demoModules: Record<string, { default: FC } | undefined> = import.meta.glob<{
  default: FC;
}>('../../../contents/**/*.demo.tsx', { eager: true });
const demoSources: Record<string, string | undefined> = import.meta.glob<string>('../../../contents/**/*.demo.tsx', {
  query: '?raw',
  import: 'default',
  eager: true,
});

const buildKey = (segments: Array<string>, name: string) => `../../../contents/${segments.join('/')}/${name}.demo.tsx`;
const buildLangKey = (segments: Array<string>, name: string, lang: string) =>
  `../../../contents/${segments.join('/')}/${name}.${lang}.demo.tsx`;

/**
 * 解析 demo key
 * @description 优先 `<name>.<lang>.demo.tsx`，找不到回退到 `<name>.demo.tsx`；含展示文本的 demo 配双语副本，纯几何 demo 单文件即可
 */
const resolveDemoKey = (
  segments: Array<string>,
  name: string,
  lang: string,
): string => {
  const langKey = buildLangKey(segments, name, lang);
  if (demoModules[langKey] !== undefined) return langKey;
  return buildKey(segments, name);
};

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
  /** 渲染区高度档位（xs / sm / md / lg / xl），默认 `md` 与改造前一致 */
  size?: SizeKey;
  /** 透传到 demo 渲染区父级 div 的 className，可覆盖默认高度 / p-10 / 居中等 */
  componentClassName?: string;
  /** 隐藏底部「View Code / 源码 / IR」面板，只保留 demo 渲染区——用于叙述性插图，让 retikz 画的图当配图使 */
  hideCode?: boolean;
};

/**
 * MDX 内的"渲染 + 源码"演示卡
 * @description 本文件保留 demo 数据载入 + 卡片骨架 + 下方代码面板三段；平移 / 缩放走 `usePanZoom`，工具条走 `PanZoomToolbar`，放大查看走 `ComponentDetailDialog`
 */
export const ComponentPreview: FC<ComponentPreviewProps> = props => {
  const { name, align = 'center', size = 'md', componentClassName, hideCode = false } = props;
  // 局部状态用 `boolean | undefined`：undefined 跟随全局默认；用户单卡操作过一次后本地选择胜出，不再被全局开关改写
  const [localIsCodeVisible, setLocalIsCodeVisible] = useState<boolean | undefined>(undefined);
  const [view, setView] = useState<SourceView>('react');
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  // 卡内 drag 默认关闭（桌面避免劫持滚轮 / 误拖，移动端避免 touch-none 吃掉用户从 demo 区上下滑页面的手势）；
  // local 为 undefined 时跟随全局 useComponentPreviewStore.dragEnabled（更多菜单可一次批量开启），
  // 用户单卡点过 Hand 后本地选择胜出（与 hideCode / isExpand 的覆盖规则一致）；Dialog 内单独强制开启
  const [localDragEnabled, setLocalDragEnabled] = useState<boolean | undefined>(undefined);
  // 工具条 pinned：移动端没 hover，靠 tap preview 区域 toggle；拖拽开启时强制 pin（不然 Hand 按钮自己藏起来没法再关）
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const { transform, isDragging, panBy, zoomBy, resetTransform, isTransformed, transformStyle, beginDrag } =
    usePanZoom();

  // 全局默认（仅在该卡 local 仍为 undefined 时生效）：二者同启用时 hideCode 胜出（更克制，isExpand 若想覆盖须用户单卡点开）
  const globalHideCode = useComponentPreviewStore(s => s.hideCode);
  const globalIsExpand = useComponentPreviewStore(s => s.isExpand);
  const globalDragEnabled = useComponentPreviewStore(s => s.dragEnabled);
  const isCodeVisible = localIsCodeVisible ?? globalHideCode;
  const isExpanded = localIsExpanded ?? globalIsExpand;
  const dragEnabled = localDragEnabled ?? globalDragEnabled;
  const effectiveToolbarPinned = toolbarPinned || dragEnabled;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const loc = useDocLocation();
  const { i18n } = useTranslation();
  const lang = i18n.language.startsWith('zh') ? 'zh' : 'en';

  // 允许「找不到」时为 undefined，不在这里 early return（hooks 顺序要稳）；"找不到"分支由下面的 `if (!mod || ...)` 走
  const segments = loc ? docPathSegments(loc) : null;
  const key = segments ? resolveDemoKey(segments, name, lang) : null;
  const mod = key ? demoModules[key] : undefined;
  const source = key ? demoSources[key] : undefined;
  const Component = mod?.default;

  // IR 视图：调一次 Component()（demo 是无 hooks 的纯 FC）；优先看 TikZ 的 ir prop，否则把 children 喂给 convertReactNodeToIR；失败回落到错误文本；hideCode 时跳过整次计算
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

  if (!loc) return null;

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
          'group/preview relative flex w-full justify-center overflow-hidden p-6 sm:p-10 select-none',
          sizeClass[size],
          alignClass[align],
          // 触摸设备启用拖拽时关闭浏览器原生 pan/zoom，避免和位移冲突；关闭时保持默认 touch-action 让用户能正常滚动页面经过 demo
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
          pinned={effectiveToolbarPinned}
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
