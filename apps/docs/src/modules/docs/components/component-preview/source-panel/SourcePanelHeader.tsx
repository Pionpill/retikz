import type { FC, ReactNode } from 'react';

import type { SourcePanelState } from './useSourcePanelState';

import { CopyButton } from './CopyButton';
import { DiffModePicker } from './DiffModePicker';
import { SourceViewBar } from './SourceViewBar';

/** 源码面板头部属性。 */
export type SourcePanelHeaderProps = {
  /** 源码面板状态。 */
  state: SourcePanelState;
  /** 复制按钮之后的场景动作。 */
  actions?: ReactNode;
};

/** 源码面板的视图、文件与操作头部。 */
export const SourcePanelHeader: FC<SourcePanelHeaderProps> = props => {
  const { state, actions } = props;
  const display = state.display(true);

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 p-1 px-2">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <SourceViewBar
          views={state.views}
          view={state.view}
          onViewChange={state.setView}
          files={state.files}
          activeFileIndex={state.activeFileIndex}
          onFileChange={state.setActiveFileIndex}
        />
      </div>
      <div className="flex items-center gap-1">
        {display.showDiffPicker ? <DiffModePicker mode={state.diffMode} onModeChange={state.setDiffMode} /> : null}
        <CopyButton copied={state.copied} onCopy={state.copyActiveFile} title={state.copied ? 'Copied' : 'Copy'} />
        {actions}
      </div>
    </div>
  );
};
