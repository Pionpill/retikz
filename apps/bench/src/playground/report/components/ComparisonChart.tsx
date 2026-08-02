import type { FC } from 'react';

import { BarChart3 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { LabPolicyResult } from '../../modules/kernel';

import { createComparisonChartRows } from '../view-model';
import { ComparisonPlot } from './ComparisonPlot';

/** 策略对比图属性 */
export type ComparisonChartProps = Readonly<{
  results: ReadonlyArray<LabPolicyResult>;
  compact?: boolean;
}>;

type PlotSize = Readonly<{ width: number; height: number }>;

/** 完成采样后展示各策略 update 中位数 */
export const ComparisonChart: FC<ComparisonChartProps> = props => {
  const { results, compact = false } = props;
  const { t } = useTranslation();
  const plotHostRef = useRef<HTMLDivElement>(null);
  const [plotSize, setPlotSize] = useState<PlotSize>({
    width: compact ? 408 : 640,
    height: compact ? 205 : 245,
  });
  const data = createComparisonChartRows(results, policyId => t(`policy.${policyId}`));

  useEffect(() => {
    const host = plotHostRef.current;
    if (host === null) return undefined;
    const updateSize = (): void => {
      const rect = host.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const next = { width: Math.floor(rect.width), height: Math.floor(rect.height) };
      setPlotSize(current => (current.width === next.width && current.height === next.height ? current : next));
    };
    updateSize();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(updateSize);
    observer.observe(host);
    return () => observer.disconnect();
  }, [compact]);

  return (
    <section
      data-slot="lab-comparison-chart"
      className={`flex flex-col border-t border-border/60 ${compact ? 'h-[280px] p-4' : 'h-[340px] p-5'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
              <BarChart3 className="size-3.5" />
            </span>
            {t('chart.title')}
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">{t('chart.description')}</p>
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 font-mono text-[10px] text-muted-foreground">
          {t('chart.localWallClock')}
        </span>
      </div>
      <div ref={plotHostRef} className="mt-3 min-h-0 flex-1 overflow-hidden text-muted-foreground/80">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-xl bg-muted/25 text-center">
            <div>
              <BarChart3 className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm text-muted-foreground">{t('chart.empty')}</p>
              <p className="mt-1 text-xs text-muted-foreground/70">{t('chart.emptyDescription')}</p>
            </div>
          </div>
        ) : (
          <ComparisonPlot rows={data} width={plotSize.width} height={plotSize.height} />
        )}
      </div>
    </section>
  );
};
