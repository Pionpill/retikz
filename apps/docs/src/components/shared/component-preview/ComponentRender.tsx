import { Ban, BotMessageSquare, ChevronsDownUp, ChevronsUpDown, Diff, Minus, Plus, X } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { useAiChatStore } from '@/store/useAiChatStore';
import { useComponentPreviewStore } from '@/store/useComponentPreviewStore';

import { HighlightedCode } from '../highlight-code';
import { CopyButton, SourceFileMenu, ToolbarIconButton, ViewToggle } from './_parts';
import {
  type AlignKey,
  type ComponentSourceFile,
  type DiffMode,
  type RendererMode,
  SOURCE_VIEW_ORDER,
  type SizeKey,
  type SourceView,
  type UnifiedDiff,
  alignClass,
  filterDiffByMode,
  sizeClass,
} from './_shared';
import { ComponentDetailDialog } from './ComponentDetailDialog';
import { DemoRenderer } from './DemoRenderer';
import { PanZoomToolbar } from './PanZoomToolbar';
import { usePanZoom } from './usePanZoom';

/**
 * 反查最近的前置 heading：从当前节点出发往左找兄弟，找不到就上一层继续
 * @description MDX 渲染产物里 ComponentPreview 卡和 h2/h3 标题是同级兄弟节点（被 article 容器包裹），常规一两轮回溯就能命中；找不到（页面首部无标题）返回 null
 */
const findPrecedingHeading = (el: HTMLElement | null): HTMLElement | null => {
  if (!el) return null;
  let sib: Element | null = el.previousElementSibling;
  while (sib) {
    if (/^H[1-6]$/.test(sib.tagName)) return sib as HTMLElement;
    sib = sib.previousElementSibling;
  }
  return el.parentElement ? findPrecedingHeading(el.parentElement) : null;
};

const buildAskAiPrompt = (lang: 'zh' | 'en', pageTitle: string, heading: string, demoName: string): string => {
  if (lang === 'en') {
    const ref = heading ? `the "${heading}" section of ${pageTitle}` : pageTitle;
    return `Based on ${ref}, walk me through the \`${demoName}\` example:

- Implementation rationale + key retikz APIs used
- How could I modify or extend it`;
  }
  const ref = heading ? `${pageTitle}「${heading}」小节` : pageTitle;
  return `请基于${ref}里的 \`${demoName}\` 示例：

- 解释它的实现思路 + 关键 retikz API 用法
- 可以怎么改 / 怎么扩展`;
};

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
  reactFiles?: Array<ComponentSourceFile>;
  ir?: string;
  /** Vanilla builder 代码（从 IR codegen 或同级 `<name>.vanilla.ts` 手写覆盖）；非空则出 Vanilla 视图 */
  vanilla?: string;
  /**
   * 相比 baseline 的 unified diff（current 与 baseline 删除行交织后的展示代码 + 每行 kind）
   * @description 仅在 React 视图 + 展开态下喂给 HighlightedCode：替换展示代码为 unified 版本、按 kind 给行加 `+`/`-` 字符与背景；teaser 折叠态 / IR 视图 / hideCode 跳过。Copy 始终复制真实 React 源码，不带 diff 装饰
   */
  reactDiff?: UnifiedDiff;
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
  /** 是否显示右侧工具条的 Ask AI 按钮，默认 true；在 AI 面板内（如 RetikzPreview）渲染时关掉避免自指 */
  showAskAi?: boolean;
};

/**
 * 演示卡核心：接已解析好的 Component + 源码视图，渲染卡片骨架 / pan&zoom 工具条 / 代码面板 / 放大对话框
 * @description 不接触 demo 文件加载、AST 解析或 IR 派生——那些由调用方（`ComponentPreview` 走 glob、`RetikzPreview` 走 source string）准备好后喂进来
 */
export const ComponentRender: FC<ComponentRenderProps> = props => {
  const { name, Component, source, align = 'center', size = 'md', componentClassName, showAskAi = true } = props;
  const reactFiles =
    source?.reactFiles !== undefined && source.reactFiles.length > 0
      ? source.reactFiles
      : (source?.react ?? '').length > 0
        ? [{ filename: `${name}.demo.tsx`, code: source?.react ?? '', diff: source?.reactDiff }]
        : [];
  const hasReact = reactFiles.length > 0;
  const hasIr = (source?.ir ?? '').length > 0;
  const hasVanilla = (source?.vanilla ?? '').length > 0;
  const hasCode = hasReact || hasIr || hasVanilla;
  // 可用视图（按固定顺序），≥ 2 个才出 toggle
  const availableViews = SOURCE_VIEW_ORDER.filter(
    v => (v === 'react' && hasReact) || (v === 'ir' && hasIr) || (v === 'vanilla' && hasVanilla),
  );

  // 局部状态用 `boolean | undefined`：undefined 跟随全局默认；用户单卡操作过一次后本地选择胜出
  const [localIsCodeVisible, setLocalIsCodeVisible] = useState<boolean | undefined>(undefined);
  // view 仅在双视图时由用户控制；单视图情境下 effectiveView 派生兜底，避免在 effect 里同步 setState
  const [view, setView] = useState<SourceView>('react');
  const [sourceFileIndex, setSourceFileIndex] = useState(0);
  const [localIsExpanded, setLocalIsExpanded] = useState<boolean | undefined>(undefined);
  // diff 模式默认 'added'（有 reactDiff 数据时）；用户选过一次后 localDiffMode 胜出。
  // 偏好 added/removed 优先于 full：full unified（current + 删除行交织）阅读噪声大，教学场景只看新增 / 只看删除更直观
  const [localDiffMode, setLocalDiffMode] = useState<DiffMode | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
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

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, []);

  const activeSourceFileIndex = Math.min(sourceFileIndex, Math.max(reactFiles.length - 1, 0));
  const activeSourceFile = reactFiles.at(activeSourceFileIndex);
  const reactSource = activeSourceFile?.code ?? '';
  const activeDiff = activeSourceFile?.diff;
  const irSource = source?.ir ?? '';
  const vanillaSource = source?.vanilla ?? '';

  // 当前 view 若不在可用集合里（单视图 / 用户上次选的视图已不存在）→ 兜底到第一个可用视图
  const effectiveView: SourceView = availableViews.includes(view) ? view : (availableViews[0] ?? 'react');

  // teaser 判定基于 react 源码行数（IR 通常更长但不是用户期望的"概览"内容）
  const reactLineCount = reactSource.split('\n').length;
  const reactHasMoreLines = reactLineCount > PREVIEW_MAX_LINES;
  const reactPreview = reactSource.split('\n').slice(0, PREVIEW_MAX_LINES).join('\n');
  const usesTeaser = hasReact && reactHasMoreLines;
  const showFull = !usesTeaser || isCodeVisible;

  // Copy 用的源码：按当前视图取真实源码，与 diff 视觉装饰解耦
  const copyCode = effectiveView === 'ir' ? irSource : effectiveView === 'vanilla' ? vanillaSource : reactSource;
  // 默认 'added'：有 diff 数据 → 默认只看新增；用户在下拉里改过 mode 后 local 胜出
  const hasReactDiff = activeDiff !== undefined;
  const diffMode: DiffMode = localDiffMode ?? (hasReactDiff ? 'added' : 'off');
  // 展示代码：React 视图 + 展开态 + 有数据 + mode != off → 按 mode 过滤 unified diff；其余情况维持原行为
  const displayedDiff: UnifiedDiff | null =
    effectiveView === 'react' && showFull && activeDiff !== undefined && diffMode !== 'off'
      ? filterDiffByMode(activeDiff, diffMode)
      : null;
  const fullCode =
    effectiveView === 'ir' ? irSource : effectiveView === 'vanilla' ? vanillaSource : (displayedDiff?.code ?? reactSource);
  const fullLang = effectiveView === 'ir' ? 'json' : effectiveView === 'vanilla' ? 'ts' : 'tsx';
  const displayedCode = showFull ? fullCode : reactPreview;
  const displayedLang = showFull ? fullLang : 'tsx';
  const displayedLineCount = displayedCode.split('\n').length;
  const displayedLineKinds = displayedDiff?.lineKinds;
  // 右侧工具条 diff 下拉仅在 React 视图 + 展开态 + 有数据时出
  const showDiffPicker = hasReactDiff && effectiveView === 'react' && showFull;

  // 复制内容跟随当前视图（IR 模式复制 IR JSON，React 模式复制真实源码——即便当下显示的是 unified diff）
  const handleCopy = () => {
    void navigator.clipboard.writeText(copyCode);
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 3000);
  };

  const handleHideAll = () => {
    setLocalIsCodeVisible(false);
    setLocalIsExpanded(false);
    setView('react');
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadDataUrl = (dataUrl: string, fileName: string) => {
    const [header = '', payload = ''] = dataUrl.split(',');
    const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? 'application/octet-stream';
    const binary = window.atob(payload);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    downloadBlob(new Blob([bytes], { type: mimeType }), fileName);
  };

  const downloadSvg = () => {
    const svg = renderPaneRef.current?.querySelector('svg');
    if (!svg) return;
    let svgSource = new XMLSerializer().serializeToString(svg);
    // 序列化 React 渲染出的 svg 不一定带 xmlns；离线打开 / 嵌别处时缺它会被当 HTML 解析
    if (!/\sxmlns=/.test(svgSource)) {
      svgSource = svgSource.replace(/<svg\b/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    downloadBlob(
      new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${svgSource}`], {
        type: 'image/svg+xml;charset=utf-8',
      }),
      `${name || 'retikz'}.svg`,
    );
  };

  const downloadCanvas = () => {
    const canvas = renderPaneRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      const fileName = `${name || 'retikz'}.png`;
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(blob => {
          if (!blob) return;
          downloadBlob(blob, fileName);
        }, 'image/png');
        return;
      }
      downloadDataUrl(canvas.toDataURL('image/png'), fileName);
    } catch {
      // canvas 可能因跨域图片被标记为 tainted，此时浏览器会阻止导出
    }
  };

  /** 下载当前渲染图：SVG 模式导出 `.svg`，Canvas 模式导出 `.png`。 */
  const handleDownload = () => {
    if (rendererMode === 'canvas') {
      downloadCanvas();
      return;
    }
    downloadSvg();
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
  const showViewToggle = availableViews.length >= 2;

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
          <DemoRenderer Component={Component} rendererMode={rendererMode} />
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
          size={effectiveSize}
          onSizeChange={setLocalSize}
          onDownload={handleDownload}
          rendererMode={rendererMode}
          toggleRendererMode={toggleRendererMode}
          pinned={toolbarPinned}
        />
      </div>
      {hasCode ? (
        <div className="relative overflow-hidden border-t bg-muted/50 text-sm">
          {showFull ? (
            <>
              <div className="flex items-center justify-between p-1 px-2">
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  {effectiveView === 'react' ? (
                    <SourceFileMenu
                      files={reactFiles}
                      activeIndex={activeSourceFileIndex}
                      onChange={setSourceFileIndex}
                    />
                  ) : null}
                  {showViewToggle ? (
                    <ViewToggle views={availableViews} view={effectiveView} onChange={setView} />
                  ) : null}
                </div>
                {/* 工具条上每个按钮用 native title 而非 radix Tooltip + asChild：
                   项目 React 18.2 下 shadcn Button / DropdownMenuTrigger / TooltipTrigger 都是 FC 不 forwardRef，
                   `<TooltipTrigger asChild>` 透传 ref 给 FC 会触发 React warning + 偶发未捕获错误把整树 unmount。
                   原生 title 没 portal / ref 链路，最稳。视觉上 toolbar 已经 icon-only + aria-label，可达性不丢 */}
                <div className="flex items-center gap-1">
                  {showDiffPicker && (
                    <ToggleGroup
                      type="single"
                      variant="outline"
                      value={diffMode}
                      onValueChange={value => {
                        // radix 单选 ToggleGroup 在点击已激活项时会回 ''（取消选择）；这里禁掉取消，保证 diffMode 始终有 mode
                        if (value === 'off' || value === 'added' || value === 'removed' || value === 'full') {
                          setLocalDiffMode(value);
                        }
                      }}
                      className="mr-1"
                    >
                      <ToggleGroupItem
                        value="off"
                        aria-label="Diff off"
                        title="Off"
                        className="h-7 min-w-7 cursor-pointer px-1.5"
                      >
                        <Ban className="size-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="added"
                        aria-label="Added only"
                        title="Added only"
                        className="h-7 min-w-7 cursor-pointer px-1.5"
                      >
                        <Plus className="size-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="removed"
                        aria-label="Removed only"
                        title="Removed only"
                        className="h-7 min-w-7 cursor-pointer px-1.5"
                      >
                        <Minus className="size-3.5" />
                      </ToggleGroupItem>
                      <ToggleGroupItem
                        value="full"
                        aria-label="Full diff"
                        title="Full diff"
                        className="h-7 min-w-7 cursor-pointer px-1.5"
                      >
                        <Diff className="size-3.5" />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                  <CopyButton copied={copied} onCopy={handleCopy} title={copied ? 'Copied' : 'Copy'} />
                  {showAskAi && (
                    <ToolbarIconButton label="Ask AI" title="Ask AI" onClick={handleAskAi}>
                      <BotMessageSquare className="size-4" />
                    </ToolbarIconButton>
                  )}
                  {displayedLineCount > COLLAPSE_THRESHOLD_LINES && (
                    <ToolbarIconButton
                      label={isExpanded ? 'Collapse' : 'Expand'}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                      onClick={() => setLocalIsExpanded(!isExpanded)}
                    >
                      {isExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
                    </ToolbarIconButton>
                  )}
                  <ToolbarIconButton label="Hide source" title="Hide source" onClick={handleHideAll}>
                    <X className="size-4" />
                  </ToolbarIconButton>
                </div>
              </div>
              <Separator className="opacity-40" />
            </>
          ) : null}
          <div className={cn('relative', showFull && !isExpanded && COLLAPSED_CODE_MAX_H)}>
            <HighlightedCode
              lang={displayedLang}
              code={displayedCode}
              showLineNumbers={displayedLineCount >= 10}
              lineKinds={displayedLineKinds}
            />
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
        rendererMode={rendererMode}
        toggleRendererMode={toggleRendererMode}
        sourceFileIndex={activeSourceFileIndex}
        onSourceFileIndexChange={setSourceFileIndex}
      />
    </div>
  );
};
