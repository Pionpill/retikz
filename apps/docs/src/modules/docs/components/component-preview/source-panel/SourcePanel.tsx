import type { FC, ReactNode } from 'react';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib';

import type { SourcePanelState } from './useSourcePanelState';

import { HighlightCode } from '../../highlight-code';
import { SourcePanelHeader } from './SourcePanelHeader';

/** 完整源码面板属性。 */
export type SourcePanelProps = {
  /** 源码面板状态。 */
  state: SourcePanelState;
  /** 头部复制按钮后的场景动作。 */
  headerActions?: ReactNode;
  /** 面板附加样式。 */
  className?: string;
  /** 代码滚动区附加样式。 */
  codeClassName?: string;
  /** 是否强制显示行号；缺省时按行数决定。 */
  showLineNumbers?: boolean;
};

/** 可复用的完整源码面板。 */
export const SourcePanel: FC<SourcePanelProps> = props => {
  const { state, headerActions, className, codeClassName, showLineNumbers } = props;
  const display = state.display(true);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <SourcePanelHeader state={state} actions={headerActions} />
      <Separator className="shrink-0 opacity-40" />
      <div className={cn('min-h-0 flex-1 overflow-auto', codeClassName)}>
        <HighlightCode
          lang={display.lang}
          code={display.code}
          showLineNumbers={showLineNumbers ?? display.lineCount >= 10}
          lineKinds={display.lineKinds}
        />
      </div>
    </div>
  );
};
