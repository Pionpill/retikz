import type { FC } from 'react';

import { BotMessageSquare, ChevronsDownUp, ChevronsUpDown, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib';

import type { SourcePanelState } from './useSourcePanelState';

import { HighlightCode } from '../../highlight-code';
import { ToolbarIconButton } from '../components';
import { SourcePanel } from './SourcePanel';

/** 已查看源码后的折叠高度上限，等于 15 行代码。 */
const COLLAPSED_CODE_MAX_H = '[&_pre]:max-h-[calc(15*1.5em)] [&_pre]:overflow-y-auto';
/** 显示展开或收起动作的最小行数。 */
const COLLAPSE_THRESHOLD_LINES = 10;

/** 卡片内源码面板属性。 */
export type InlineSourcePanelProps = {
  /** 源码面板状态。 */
  state: SourcePanelState;
  /** 当前卡片是否允许显示完整源码。 */
  isCodeVisible: boolean;
  /** 是否展示 Ask AI 动作。 */
  showAskAi: boolean;
  /** 打开 Ask AI 并填入当前演示上下文。 */
  onAskAi: () => void;
  /** 源码区是否完全展开。 */
  isExpanded: boolean;
  /** 切换源码区展开状态。 */
  onExpandedChange: (expanded: boolean) => void;
  /** 隐藏当前卡片源码区。 */
  onHideSource: () => void;
  /** 从 teaser 切换为完整源码。 */
  onShowCode: () => void;
};

/** 带 teaser、折叠与卡片动作的内联源码面板。 */
export const InlineSourcePanel: FC<InlineSourcePanelProps> = props => {
  const { state, isCodeVisible, showAskAi, onAskAi, isExpanded, onExpandedChange, onHideSource, onShowCode } = props;
  const teaser = state.display(false);
  const full = state.display(true);
  const usesTeaser = (state.activeFile?.code.split('\n').length ?? 0) > 3;
  const showFull = !usesTeaser || isCodeVisible;
  const headerActions = (
    <>
      {showAskAi ? (
        <ToolbarIconButton label="Ask AI" title="Ask AI" onClick={onAskAi}>
          <BotMessageSquare className="size-4" />
        </ToolbarIconButton>
      ) : null}
      {full.lineCount > COLLAPSE_THRESHOLD_LINES ? (
        <ToolbarIconButton
          label={isExpanded ? 'Collapse' : 'Expand'}
          title={isExpanded ? 'Collapse' : 'Expand'}
          onClick={() => onExpandedChange(!isExpanded)}
        >
          {isExpanded ? <ChevronsDownUp className="size-4" /> : <ChevronsUpDown className="size-4" />}
        </ToolbarIconButton>
      ) : null}
      <ToolbarIconButton label="Hide source" title="Hide source" onClick={onHideSource}>
        <X className="size-4" />
      </ToolbarIconButton>
    </>
  );

  return (
    <div className="relative overflow-hidden border-t bg-muted/50 text-sm">
      {showFull ? (
        <SourcePanel
          state={state}
          headerActions={headerActions}
          codeClassName={cn(!isExpanded && COLLAPSED_CODE_MAX_H)}
        />
      ) : (
        <div className="relative">
          <HighlightCode lang={teaser.lang} code={teaser.code} showLineNumbers={false} />
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
              className="relative z-10 cursor-pointer rounded-lg bg-background font-medium text-foreground shadow-none hover:bg-muted dark:bg-background dark:text-foreground dark:hover:bg-muted"
            >
              View Code
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
