import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import type { LabState } from '../lab-state';
import type { BenchTestCase } from '../test-catalog';

import { LabPolicyId, LabRunMode } from '../../modules/kernel';
import { Inspector, ReportDashboard } from '../../report';
import { LabStatus } from '../lab-state';
import { CaseStartState } from './CaseStartState';

/** 基准对比页面属性 */
export type BenchmarkViewProps = Readonly<{
  testCase: BenchTestCase;
  state: LabState;
  onRun: () => void;
}>;

/** 展示最近一次 Benchmark 的策略对比结果 */
export const BenchmarkView: FC<BenchmarkViewProps> = props => {
  const { testCase, state, onRun } = props;
  const { t } = useTranslation();
  const session = state.session?.mode === LabRunMode.Benchmark ? state.session : undefined;
  if (session === undefined) {
    return (
      <main className="grid min-h-0 min-w-0 flex-1 place-items-center overflow-auto bg-background p-6">
        <CaseStartState
          testCase={testCase}
          actionLabel={t('header.startBenchmark')}
          running={state.status === LabStatus.Running}
          onRun={onRun}
        />
      </main>
    );
  }
  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-muted/20 p-4 sm:p-5">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <ReportDashboard results={session.results} />
        <Inspector result={session.results.find(result => result.policyId === LabPolicyId.RetainedAuto)} />
      </div>
    </main>
  );
};
