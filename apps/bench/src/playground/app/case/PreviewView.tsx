import type { FC, RefObject } from 'react';

import { CircleAlert } from 'lucide-react';

import type { LabState } from '../lab-state';
import type { BenchTestCase } from '../test-catalog';

import { RenderStage } from './RenderStage';

/** 测试预览页面属性 */
export type PreviewViewProps = Readonly<{
  /** 当前路由对应的测试用例 */
  testCase: BenchTestCase;
  state: LabState;
  previewHostRef: RefObject<HTMLDivElement>;
  /** 复用工作台 Preview 运行入口 */
  onRun: () => void;
}>;

/** 展示当前策略的真实渲染预览 */
export const PreviewView: FC<PreviewViewProps> = props => {
  const { testCase, state, previewHostRef, onRun } = props;
  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      <RenderStage testCase={testCase} state={state} previewHostRef={previewHostRef} onRun={onRun} />
      {state.error === undefined ? null : (
        <div className="absolute inset-x-4 top-4 z-30 flex items-start gap-3 rounded-xl border border-destructive/30 bg-background/95 px-4 py-3 text-sm text-destructive shadow-sm backdrop-blur-sm">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      )}
    </main>
  );
};
