import type { FC, RefObject } from 'react';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { LabState } from '../lab-state';
import type { BenchTestCase } from '../test-catalog';

import { LabStatus } from '../lab-state';
import { CaseStartState } from './CaseStartState';

/** 真实 renderer 舞台属性 */
export type RenderStageProps = Readonly<{
  /** 当前路由对应的测试用例 */
  testCase: BenchTestCase;
  state: LabState;
  previewHostRef: RefObject<HTMLDivElement>;
  /** 复用工作台 Preview 运行入口 */
  onRun: () => void;
}>;

/** 承载 Preview 模式真实 SVG / Canvas host 的舞台 */
export const RenderStage: FC<RenderStageProps> = props => {
  const { testCase, state, previewHostRef, onRun } = props;
  const { t } = useTranslation();
  const [hasOutput, setHasOutput] = useState(false);
  useEffect(() => {
    const host = previewHostRef.current;
    if (host === null) return;
    const updatePresence = (): void => setHasOutput(host.childElementCount > 0);
    updatePresence();
    const observer = new MutationObserver(updatePresence);
    observer.observe(host, { childList: true });
    return () => observer.disconnect();
  }, [previewHostRef]);
  return (
    <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-background">
      <div
        ref={previewHostRef}
        className="lab-preview absolute inset-0 z-10 grid place-items-center overflow-hidden bg-background"
      />
      {hasOutput ? null : (
        <div className="absolute inset-0 z-20 grid place-items-center bg-background p-6">
          <CaseStartState
            testCase={testCase}
            actionLabel={t('header.runPreview')}
            running={state.status === LabStatus.Running}
            onRun={onRun}
          />
        </div>
      )}
    </section>
  );
};
