import type { FC } from 'react';

import { Ban, BotMessageSquare, ChevronsDownUp, ChevronsUpDown, Diff, Minus, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib';

import type { ComponentSourceFile, DiffLineKind, DiffMode, SourceLang, SourceView } from '../types';

import { HighlightCode } from '../../highlight-code';
import { CopyButton, SourceViewBar, ToolbarIconButton } from './parts';

/** 已 View Code 之后默认折叠状态下的代码区高度上限（15 行代码高度，跟随 pre 的 1.5 line-height）。 */
const COLLAPSED_CODE_MAX_H = '[&_pre]:max-h-[calc(15*1.5em)] [&_pre]:overflow-y-auto';
/** 触发「展开/收起」按钮的最小行数门槛。 */
const COLLAPSE_THRESHOLD_LINES = 10;

export type SourceCodePanelProps = {
  /** 可切换的源码视图集合。 */
  views: Array<SourceView>;
  /** 当前源码视图。 */
  view: SourceView;
  /** 切换源码视图。 */
  onViewChange: (next: SourceView) => void;
  /** 当前视图下的源码文件集合。 */
  files: Array<ComponentSourceFile>;
  /** 当前源码文件下标。 */
  activeFileIndex: number;
  /** 切换当前源码文件。 */
  onFileChange: (next: number) => void;
  /** 是否展示完整源码；false 时展示 teaser 和 View Code 按钮。 */
  showFull: boolean;
  /** 是否展示 diff 模式切换。 */
  showDiffPicker: boolean;
  /** 当前 diff 展示模式。 */
  diffMode: DiffMode;
  /** 切换 diff 展示模式。 */
  onDiffModeChange: (next: DiffMode) => void;
  /** 复制按钮是否处于已复制反馈态。 */
  copied: boolean;
  /** 复制当前源码。 */
  onCopy: () => void;
  /** 是否展示 Ask AI 按钮。 */
  showAskAi: boolean;
  /** 打开 Ask AI 并填充当前 demo 上下文。 */
  onAskAi: () => void;
  /** 当前展示源码的行数。 */
  displayedLineCount: number;
  /** 源码面板是否展开。 */
  isExpanded: boolean;
  /** 切换源码面板展开状态。 */
  onExpandedChange: (next: boolean) => void;
  /** 隐藏当前卡片源码区。 */
  onHideSource: () => void;
  /** 当前展示源码的高亮语言。 */
  displayedLang: SourceLang;
  /** 当前展示源码内容。 */
  displayedCode: string;
  /** 与展示源码逐行对应的 diff 行类型。 */
  displayedLineKinds?: ReadonlyArray<DiffLineKind>;
  /** 从 teaser 状态切换到源码展示。 */
  onShowCode: () => void;
};

/** ComponentPreview 卡片底部源码面板。 */
export const SourceCodePanel: FC<SourceCodePanelProps> = props => {
  const {
    views,
    view,
    onViewChange,
    files,
    activeFileIndex,
    onFileChange,
    showFull,
    showDiffPicker,
    diffMode,
    onDiffModeChange,
    copied,
    onCopy,
    showAskAi,
    onAskAi,
    displayedLineCount,
    isExpanded,
    onExpandedChange,
    onHideSource,
    displayedLang,
    displayedCode,
    displayedLineKinds,
    onShowCode,
  } = props;

  return (
    <div className="relative overflow-hidden border-t bg-muted/50 text-sm">
      {showFull ? (
        <>
          <div className="flex items-center justify-between p-1 px-2">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <SourceViewBar
                views={views}
                view={view}
                onViewChange={onViewChange}
                files={files}
                activeFileIndex={activeFileIndex}
                onFileChange={onFileChange}
              />
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
                    // radix 单选 ToggleGroup 在点击已激活项时会回 ''（取消选择）；这里禁掉取消，保证 diffMode 始终有 mode。
                    if (value === 'off' || value === 'added' || value === 'removed' || value === 'full') {
                      onDiffModeChange(value);
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
              <CopyButton copied={copied} onCopy={onCopy} title={copied ? 'Copied' : 'Copy'} />
              {showAskAi && (
                <ToolbarIconButton label="Ask AI" title="Ask AI" onClick={onAskAi}>
                  <BotMessageSquare className="size-4" />
                </ToolbarIconButton>
              )}
              {displayedLineCount > COLLAPSE_THRESHOLD_LINES && (
                <ToolbarIconButton
                  label={isExpanded ? 'Collapse' : 'Expand'}
                  title={isExpanded ? 'Collapse' : 'Expand'}
                  onClick={() => onExpandedChange(!isExpanded)}
                >
                  {isExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
                </ToolbarIconButton>
              )}
              <ToolbarIconButton label="Hide source" title="Hide source" onClick={onHideSource}>
                <X className="size-4" />
              </ToolbarIconButton>
            </div>
          </div>
          <Separator className="opacity-40" />
        </>
      ) : null}
      <div className={cn('relative', showFull && !isExpanded && COLLAPSED_CODE_MAX_H)}>
        <HighlightCode
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
              onClick={onShowCode}
              className="relative z-10 cursor-pointer rounded-lg bg-background text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted font-medium"
            >
              View Code
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
