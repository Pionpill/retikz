import type { FC } from 'react';

import { useParams } from 'react-router';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import type { BenchModule } from './module-registry';
import type { BenchCaseStatusValue } from './test-catalog';

import { createLabSessionReportStatus, useReportHistory } from '../report';
import { CasePage, UnavailableModulePage } from './case';
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
    : BenchCaseView.Run;
  const reportHistory = useReportHistory(module.id, testCase?.id);
  const { state, dispatch, previewHostRef, run } = usePerformanceLab(module, testCase, reportHistory.refresh);
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
          <Header module={module} testCase={testCase} state={state} dispatch={dispatch} onRun={() => void run()} />
          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            {module.available && testCase !== undefined ? (
              <CasePage
                module={module}
                testCase={testCase}
                view={view}
                state={state}
                previewHostRef={previewHostRef}
                reports={reportHistory.reports}
                reportDiagnostics={reportHistory.diagnostics}
                reportError={reportHistory.error}
                reportsLoading={reportHistory.loading}
              />
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
