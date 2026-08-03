import type { FC } from 'react';

import { FileBarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

import type { BenchLabReport, BenchReportSummary } from '../../../shared';
import type { LabRunSession } from '../../modules/kernel';

import { BenchReportStatus } from '../../../shared';
import { LabPolicyId } from '../../modules/kernel';
import { getLabReportFailureMessage, getLabRunSessionPayload } from '../view-model';
import { Inspector } from './Inspector';
import { ReportDashboard } from './ReportDashboard';

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
  /** 当前选择的报告标识 */
  selectedRunId?: string;
  /** 当前选择的完整报告 */
  selectedReport?: BenchLabReport;
  /** 是否正在读取所选报告详情 */
  detailLoading?: boolean;
  /** 读取所选报告详情时的错误 */
  detailError?: string;
  /** 选择一份本地报告 */
  onSelectReport?: (runId: string) => void;
}>;

/** 报告状态在紧凑列表中的视觉语义 */
const reportStatusClassNames: Record<BenchReportSummary['status'], string> = {
  [BenchReportStatus.Passed]: 'text-emerald-600 dark:text-emerald-400',
  [BenchReportStatus.Warning]: 'text-amber-600 dark:text-amber-400',
  [BenchReportStatus.Failed]: 'text-destructive',
};

/** 展示当前用例的本地报告历史与选中报告详情 */
export const ReportHistory: FC<ReportHistoryProps> = props => {
  const {
    session,
    reports = [],
    diagnostics = [],
    error,
    loading = false,
    selectedRunId,
    selectedReport,
    detailLoading = false,
    detailError,
    onSelectReport,
  } = props;
  const { t, i18n } = useTranslation();
  const dateFormatter = new Intl.DateTimeFormat(i18n.resolvedLanguage ?? i18n.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
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
          {diagnostics.map(diagnostic => (
            <p key={diagnostic} className="mt-3 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {diagnostic}
            </p>
          ))}
        </div>
      </div>
    );
  }

  const selectedSession = selectedReport === undefined ? undefined : getLabRunSessionPayload(selectedReport);
  const selectedFailureMessage = selectedReport === undefined ? undefined : getLabReportFailureMessage(selectedReport);
  const visibleSession = selectedRunId === undefined ? session : selectedSession;
  const inspectedResult =
    visibleSession?.results.find(result => result.policyId === LabPolicyId.RetainedAuto) ?? visibleSession?.results[0];
  return (
    <div className="grid min-h-0 gap-4 bg-muted/20 p-4 sm:p-5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="lab-panel space-y-1 p-2.5">
        <h2 className="px-2 py-1 text-sm font-semibold">{t('reportHistory.title')}</h2>
        {reports.map(report => (
          <Button
            key={report.runId}
            type="button"
            variant="ghost"
            data-run-id={report.runId}
            aria-label={t('reportHistory.openReport', { runId: report.runId })}
            aria-pressed={selectedRunId === report.runId}
            onClick={() => onSelectReport?.(report.runId)}
            className="h-10 w-full justify-start rounded-md border border-transparent bg-transparent px-2.5 py-0 text-left hover:bg-muted/60 aria-pressed:border-border aria-pressed:bg-background aria-pressed:shadow-xs"
          >
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <time
                dateTime={report.completedAt}
                className="truncate text-[11px] font-normal tabular-nums text-muted-foreground"
              >
                {dateFormatter.format(new Date(report.completedAt))}
              </time>
              <span
                className={`flex shrink-0 items-center gap-1.5 text-[11px] font-medium ${reportStatusClassNames[report.status]}`}
              >
                <span aria-hidden className="size-1.5 rounded-full bg-current" />
                {t(`status.${report.status}`)}
              </span>
            </div>
          </Button>
        ))}
        {diagnostics.map(diagnostic => (
          <p key={diagnostic} className="rounded-md bg-destructive/10 p-2 text-[10px] text-destructive">
            {diagnostic}
          </p>
        ))}
      </aside>
      {detailLoading ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          {t('reportHistory.loadingDetail')}
        </div>
      ) : detailError !== undefined ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <div>
            <p className="font-medium">{t('reportHistory.detailLoadFailed')}</p>
            <p className="mt-2 text-xs">{detailError}</p>
          </div>
        </div>
      ) : selectedFailureMessage !== undefined ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          <div>
            <p className="font-medium">{t('reportHistory.runFailed')}</p>
            <p className="mt-2 text-xs">{selectedFailureMessage}</p>
          </div>
        </div>
      ) : selectedRunId !== undefined && selectedReport !== undefined && selectedSession === undefined ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          {t('reportHistory.detailUnavailable')}
        </div>
      ) : visibleSession === undefined ? (
        <div className="grid min-h-[320px] place-items-center rounded-xl border bg-muted/20 p-6 text-sm text-muted-foreground">
          {t('reportHistory.selectHint')}
        </div>
      ) : (
        <div className="min-w-0 space-y-4">
          <ReportDashboard results={visibleSession.results} />
          <Inspector result={inspectedResult} />
        </div>
      )}
    </div>
  );
};
