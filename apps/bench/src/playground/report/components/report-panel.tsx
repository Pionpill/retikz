import type { FC } from 'react';

import { BarChart3, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { LabPolicyResult, LabRunSession } from '../../modules/core';

import { ComparisonChart } from './comparison-chart';
import { Inspector } from './inspector';
import { MetricsSummary } from './metrics-summary';

/** 运行报告面板属性 */
export type ReportPanelProps = Readonly<{
  session: LabRunSession;
  inspectedResult?: LabPolicyResult;
  onClose: () => void;
}>;

/** 运行完成后固定在预览右侧的报告 */
export const ReportPanel: FC<ReportPanelProps> = props => {
  const { session, inspectedResult, onClose } = props;
  const { t } = useTranslation();
  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex h-full w-full max-w-[440px] shrink-0 flex-col border-l bg-card text-card-foreground shadow-2xl xl:static xl:z-auto xl:w-[440px] xl:shadow-none">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <BarChart3 className="size-4" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">{t('report.title')}</h2>
            <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">{session.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant="secondary">{t('report.complete')}</Badge>
          <Button variant="ghost" size="icon" aria-label={t('report.close')} onClick={onClose}>
            <X />
          </Button>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <MetricsSummary results={session.results} compact />
        <ComparisonChart results={session.results} compact />
        <Inspector result={inspectedResult} compact />
      </div>
    </aside>
  );
};
