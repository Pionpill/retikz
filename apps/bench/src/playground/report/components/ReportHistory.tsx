import type { FC } from 'react';

import { FileBarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import type { BenchReportSummary } from '../../../shared';
import type { LabRunSession } from '../../modules/kernel';

import { ComparisonChart } from './ComparisonChart';
import { Inspector } from './Inspector';
import { MetricsSummary } from './MetricsSummary';

/** 本地报告历史属性 */
export type ReportHistoryProps = Readonly<{
  /** 当前进程最近一次运行结果 */
  session?: LabRunSession;
  /** 磁盘中的报告摘要 */
  reports?: ReadonlyArray<BenchReportSummary>;
  /** 扫描报告时发现的诊断 */
  diagnostics?: ReadonlyArray<string>;
  /** 报告 API 错误 */
  error?: string;
  /** 是否正在读取报告 */
  loading?: boolean;
}>;

/** 展示当前用例的本地报告历史与选中报告详情 */
export const ReportHistory: FC<ReportHistoryProps> = props => {
  const { session, reports = [], diagnostics = [], error, loading = false } = props;
  const { t } = useTranslation();
  if (session === undefined && reports.length === 0 && !loading) {
    return (
      <div className="grid min-h-[360px] place-items-center p-6 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
            <FileBarChart className="size-5" />
          </span>
          <h2 className="mt-4 text-base font-semibold">
            {error === undefined ? t('reportHistory.emptyTitle') : t('reportHistory.loadFailed')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {error === undefined ? t('reportHistory.emptyDescription') : error}
          </p>
        </div>
      </div>
    );
  }

  const inspectedResult = session?.results[0];
  return (
    <div className="grid min-h-0 gap-4 p-4 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="space-y-2 rounded-xl border bg-card p-3">
        <h2 className="px-1 text-sm font-semibold">{t('reportHistory.title')}</h2>
        {reports.map(report => (
          <div key={report.runId} className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-mono text-[10px]">{report.runId}</span>
              <span className="text-[10px] text-muted-foreground">{t(`status.${report.status}`)}</span>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">{report.completedAt}</p>
          </div>
        ))}
        {diagnostics.map(diagnostic => (
          <p key={diagnostic} className="rounded-md bg-destructive/10 p-2 text-[10px] text-destructive">
            {diagnostic}
          </p>
        ))}
      </aside>
      {session === undefined ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          {t('reportHistory.selectHint')}
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-4">
            <MetricsSummary results={session.results} />
            <ComparisonChart results={session.results} />
          </div>
          <Inspector result={inspectedResult} />
        </div>
      )}
    </div>
  );
};
