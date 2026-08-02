import type { FC } from 'react';

import { CircleAlert } from 'lucide-react';
import { useParams } from 'react-router';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import type { BenchModule } from './module-registry';
import type { BenchCaseStatusValue } from './test-catalog';

import { LabRunMode } from '../modules/kernel';
import { createLabSessionReportStatus, ReportHistory, useReportHistory } from '../report';
import { BenchmarkView, PreviewView, UnavailableModulePage } from './case';
import { ConfigurationSheet } from './configuration';
import { Header } from './header';
import { AppSidebar } from './sidebar';
import { BenchCaseStatus, BenchCaseView, getBenchTestCase } from './test-catalog';
import { usePerformanceLab } from './usePerformanceLab';

/** Bench Performance Lab 工作台属性 */
export type AppProps = Readonly<{
  /** 当前一级路由对应的模块 */
  module: BenchModule;
}>;

/** Bench Performance Lab 工作台 */
export const App: FC<AppProps> = props => {
  const { module } = props;
  const params = useParams();
  const testCase = params.caseId === undefined ? undefined : getBenchTestCase(module.id, params.caseId);
  const view = Object.values(BenchCaseView).includes(params.view as (typeof BenchCaseView)[keyof typeof BenchCaseView])
    ? (params.view as (typeof BenchCaseView)[keyof typeof BenchCaseView])
    : BenchCaseView.Preview;
  const mode = view === BenchCaseView.Benchmark ? LabRunMode.Benchmark : LabRunMode.Preview;
  const reportHistory = useReportHistory(module.id, testCase?.id);
  const { state, dispatch, previewHostRef, run } = usePerformanceLab(module, testCase, mode, reportHistory.refresh);
  const onRun = (): void => void run();
  const caseStatuses: Partial<Record<string, BenchCaseStatusValue>> = {};
  for (const report of reportHistory.reports) {
    if (caseStatuses[report.caseId] !== undefined) continue;
    caseStatuses[report.caseId] = report.status;
  }
  if (testCase !== undefined) {
    if (state.status === 'running') caseStatuses[testCase.id] = BenchCaseStatus.Running;
    else if (state.status === 'error') caseStatuses[testCase.id] = BenchCaseStatus.Failed;
    else if (state.session !== undefined) caseStatuses[testCase.id] = createLabSessionReportStatus(state.session);
  }
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          module={module}
          activeCaseId={testCase?.id}
          caseStatuses={caseStatuses}
          state={state}
          dispatch={dispatch}
        />
        <SidebarInset className="h-svh min-w-0 overflow-hidden">
          <Header module={module} testCase={testCase} view={view} state={state} dispatch={dispatch} onRun={onRun} />
          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {module.available && testCase !== undefined ? (
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
                {state.reportWarning === undefined ? null : (
                  <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
                    <span>{state.reportWarning}</span>
                  </div>
                )}
                {view === BenchCaseView.Preview ? (
                  <PreviewView testCase={testCase} state={state} previewHostRef={previewHostRef} onRun={onRun} />
                ) : view === BenchCaseView.Benchmark ? (
                  <BenchmarkView testCase={testCase} state={state} onRun={onRun} />
                ) : (
                  <div className="min-h-0 flex-1 overflow-auto">
                    <ReportHistory
                      session={state.session}
                      reports={reportHistory.reports}
                      diagnostics={reportHistory.diagnostics}
                      error={reportHistory.error}
                      loading={reportHistory.loading}
                      selectedRunId={reportHistory.selectedRunId}
                      selectedReport={reportHistory.selectedReport}
                      detailLoading={reportHistory.detailLoading}
                      detailError={reportHistory.detailError}
                      onSelectReport={reportHistory.selectReport}
                    />
                  </div>
                )}
              </div>
            ) : (
              <UnavailableModulePage module={module} />
            )}
          </div>
        </SidebarInset>
        <ConfigurationSheet state={state} dispatch={dispatch} />
      </SidebarProvider>
    </TooltipProvider>
  );
};
