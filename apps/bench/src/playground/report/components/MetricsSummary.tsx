import type { FC } from 'react';

import { Gauge, GitBranch, Layers, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';

import type { LabPolicyResult } from '../../modules/kernel';

import { LabPolicyId } from '../../modules/kernel';
import { createLabSummary } from '../view-model';

/** 指标摘要属性 */
export type MetricsSummaryProps = Readonly<{
  results: ReadonlyArray<LabPolicyResult>;
  compact?: boolean;
}>;

const formatMs = (value: number | undefined): string => (value === undefined ? '—' : `${value.toFixed(2)} ms`);

/** 展示本次最关键的 timing 与确定性工作量信号 */
export const MetricsSummary: FC<MetricsSummaryProps> = props => {
  const { results, compact = false } = props;
  const { t } = useTranslation();
  const summary = createLabSummary(results);
  const speedupLabel =
    summary.speedupPercent === undefined
      ? '—'
      : summary.speedupPercent >= 0
        ? t('metrics.faster', { value: summary.speedupPercent.toFixed(1) })
        : t('metrics.slower', { value: Math.abs(summary.speedupPercent).toFixed(1) });
  const selected = results.find(result => result.policyId === LabPolicyId.RetainedAuto) ?? results.at(0);
  const cards = [
    {
      id: 'median',
      label: t('metrics.medianUpdate'),
      value: formatMs(selected?.timing.medianMs),
      detail: selected === undefined ? '—' : t('metrics.samples', { count: selected.timing.samples }),
      icon: Gauge,
      accent: 'text-cyan-600 dark:text-cyan-400',
    },
    {
      id: 'reused',
      label: t('metrics.entitiesReused'),
      value: selected === undefined ? '—' : selected.work.reused.toLocaleString('en-US'),
      detail: selected === undefined ? '—' : t('metrics.reuse', { value: (selected.work.reuseRatio * 100).toFixed(2) }),
      icon: Layers,
      accent: 'text-violet-600 dark:text-violet-400',
    },
    {
      id: 'path',
      label: t('metrics.executionPath'),
      value: selected?.outcome ?? '—',
      detail: selected?.source ?? '—',
      icon: GitBranch,
      accent: summary.incrementalActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground',
    },
    {
      id: 'speedup',
      label: t('metrics.autoVsStatic'),
      value: speedupLabel,
      detail: summary.bestPolicyId === undefined ? '—' : t('metrics.best', { policy: summary.bestPolicyId }),
      icon: Zap,
      accent: 'text-amber-600 dark:text-amber-400',
    },
  ];
  return (
    <section className={`grid gap-3 ${compact ? 'grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
      {cards.map(card => {
        const Icon = card.icon;
        return (
          <article key={card.id} className={compact ? 'lab-panel p-3' : 'lab-panel p-4'}>
            <div className="flex items-start justify-between">
              <span className="lab-label">{card.label}</span>
              <Icon className={`size-4 ${card.accent}`} />
            </div>
            <div
              className={
                compact ? 'mt-2 flex flex-wrap items-baseline gap-2' : 'mt-3 flex flex-wrap items-baseline gap-2'
              }
            >
              <span
                className={`font-mono font-semibold tracking-tight text-foreground ${
                  compact ? 'text-base' : card.id === 'path' || card.id === 'speedup' ? 'text-xl' : 'text-2xl'
                }`}
              >
                {card.value}
              </span>
              {card.id === 'path' && selected !== undefined ? (
                <Badge variant={summary.incrementalActive ? 'secondary' : 'outline'}>{selected.policyId}</Badge>
              ) : null}
            </div>
            <p className={`${compact ? 'mt-1.5' : 'mt-2'} truncate text-[10px] text-muted-foreground`}>{card.detail}</p>
          </article>
        );
      })}
    </section>
  );
};
