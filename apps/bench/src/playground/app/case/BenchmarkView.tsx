import type { FC } from 'react';

import { BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { LabState } from '../lab-state';

import { LabRunMode } from '../../modules/kernel';
import { ComparisonChart, Inspector, MetricsSummary } from '../../report';

/** 基准对比页面属性 */
export type BenchmarkViewProps = Readonly<{
  state: LabState;
}>;

/** 展示最近一次 Benchmark 的策略对比结果 */
export const BenchmarkView: FC<BenchmarkViewProps> = props => {
  const { state } = props;
  const { t } = useTranslation();
  const session = state.session?.mode === LabRunMode.Benchmark ? state.session : undefined;
  if (session === undefined) {
    return (
      <main className="grid min-h-0 min-w-0 flex-1 place-items-center overflow-auto bg-background p-6 text-center">
        <div className="max-w-md rounded-2xl border border-dashed bg-muted/20 px-8 py-10">
          <BarChart3 className="mx-auto size-9 text-muted-foreground/50" />
          <h1 className="mt-4 text-base font-semibold">{t('benchmark.emptyTitle')}</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('benchmark.emptyDescription')}</p>
        </div>
      </main>
    );
  }
  return (
    <main className="min-h-0 min-w-0 flex-1 overflow-auto bg-background p-4">
      <div className="space-y-4">
        <MetricsSummary results={session.results} />
        <ComparisonChart results={session.results} />
        <Inspector result={session.results.find(result => result.policyId === 'retained-auto')} />
      </div>
    </main>
  );
};
