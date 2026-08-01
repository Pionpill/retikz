import type { FC } from 'react';

import { Cpu, DatabaseZap, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { BenchModule } from '../constant';
import type { LabState } from '../lab-state';
import type { BenchTestCase } from '../test-catalog';

/** 用例配置页面属性 */
export type CaseConfigurationProps = Readonly<{
  module: BenchModule;
  testCase: BenchTestCase;
  state: LabState;
}>;

/** 展示当前用例的运行配置与本地环境边界 */
export const CaseConfiguration: FC<CaseConfigurationProps> = props => {
  const { module, testCase, state } = props;
  const { t } = useTranslation();
  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <section className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{t(testCase.title)}</h1>
          <Badge variant="secondary">{t(module.title)}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(testCase.description)}</p>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">{t('caseView.scenario')}</dt>
            <dd className="mt-1 font-mono text-xs">{testCase.scenarioId}</dd>
          </div>
          <div className="rounded-lg border bg-muted/30 p-3">
            <dt className="text-xs text-muted-foreground">{t('caseView.localEnvironment')}</dt>
            <dd className="mt-1 flex items-center gap-2 text-xs">
              <Cpu className="size-3.5 text-violet-500" />
              {t('config.local')}
            </dd>
          </div>
        </dl>
      </section>
      <section className="rounded-xl border bg-card p-5 text-card-foreground shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="size-4" />
          {t('header.details')}
        </div>
        <div className="mt-4 space-y-3 text-xs">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t('caseView.backend')}</span>
            <span>{state.backend.toUpperCase()}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t('caseView.policy')}</span>
            <span>{state.policyId}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t('caseView.samples')}</span>
            <span>{state.sampleRuns}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">{t('caseView.warmups')}</span>
            <span>{state.warmupRuns}</span>
          </div>
        </div>
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-[11px] leading-5 text-muted-foreground">
          <DatabaseZap className="mt-0.5 size-3.5 shrink-0" />
          <span>{t('config.readOnly')}</span>
        </div>
      </section>
    </div>
  );
};
