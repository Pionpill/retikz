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
      detail:
        summary.bestPolicyId === undefined
          ? '—'
          : t('metrics.best', {
              policy: t(`policy.${summary.bestPolicyId}`, { defaultValue: summary.bestPolicyId }),
            }),
      icon: Zap,
      accent:
        summary.speedupPercent === undefined
          ? 'text-muted-foreground'
          : summary.speedupPercent >= 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-orange-600 dark:text-orange-400',
    },
  ];
  return (
    <section
      data-slot="lab-metrics-summary"
      className={
        compact
          ? 'grid gap-0 border-b border-border/60 sm:grid-cols-2'
          : 'grid gap-0 border-b border-border/60 md:grid-cols-2 xl:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))]'
      }
    >
      {cards.map((card, index) => {
        const Icon = card.icon;
        const primary = index === 0;
        return (
          <article
            key={card.id}
            data-slot={primary ? 'lab-metric-primary' : 'lab-metric-supporting'}
            className={`${primary ? 'bg-primary/[0.035]' : ''} min-w-0 p-4 ${
              compact
                ? primary
                  ? 'sm:col-span-2 sm:p-5'
                  : 'border-t border-border/60 sm:border-l sm:first-of-type:border-l-0'
                : primary
                  ? 'md:col-span-2 md:p-5 xl:col-span-1 xl:p-6'
                  : 'border-t border-border/60 md:odd:border-l xl:border-t-0 xl:border-l xl:p-5'
            }`}
          >
            <div className="flex items-start justify-between">
              <span className="lab-label">{card.label}</span>
              <span className={`grid size-7 place-items-center rounded-lg bg-background/70 ${card.accent}`}>
                <Icon className="size-3.5" />
              </span>
            </div>
            <div className={`${primary ? 'mt-4' : 'mt-3'} flex flex-wrap items-baseline gap-2`}>
              <span
                className={`font-mono font-semibold tracking-tight ${card.id === 'speedup' ? card.accent : 'text-foreground'} ${
                  primary ? (compact ? 'text-2xl' : 'text-3xl') : compact ? 'text-base' : 'text-lg'
                }`}
              >
                {card.value}
              </span>
              {card.id === 'path' && selected !== undefined ? (
                <Badge variant={summary.incrementalActive ? 'secondary' : 'outline'}>{selected.policyId}</Badge>
              ) : null}
            </div>
            <p className={`${primary ? 'mt-3' : 'mt-2'} truncate text-[11px] text-muted-foreground`}>{card.detail}</p>
          </article>
        );
      })}
    </section>
  );
};
