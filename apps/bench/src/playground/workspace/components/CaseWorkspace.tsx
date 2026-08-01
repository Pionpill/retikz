import type { FC, RefObject } from 'react';

import { FileBarChart, Play, Settings2 } from 'lucide-react';
import { CircleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import type { BenchReportSummary } from '../../../shared';
import type { BenchModule } from '../constant';
import type { LabState } from '../lab-state';
import type { BenchCaseViewValue, BenchTestCase } from '../test-catalog';

import { ReportHistory } from '../../report';
import { BenchCaseView, getBenchCasePath } from '../test-catalog';
import { CaseConfiguration } from './CaseConfiguration';
import { TestWorkspace } from './TestWorkspace';

/** 用例工作区属性 */
export type CaseWorkspaceProps = Readonly<{
  module: BenchModule;
  testCase: BenchTestCase;
  view: BenchCaseViewValue;
  state: LabState;
  previewHostRef: RefObject<HTMLDivElement>;
  reports?: ReadonlyArray<BenchReportSummary>;
  reportDiagnostics?: ReadonlyArray<string>;
  reportError?: string;
  reportsLoading?: boolean;
}>;

const views = Object.freeze([
  Object.freeze({ id: BenchCaseView.Config, icon: Settings2 }),
  Object.freeze({ id: BenchCaseView.Run, icon: Play }),
  Object.freeze({ id: BenchCaseView.Reports, icon: FileBarChart }),
]);

/** 通过稳定路由组织用例配置、运行和报告 */
export const CaseWorkspace: FC<CaseWorkspaceProps> = props => {
  const {
    module,
    testCase,
    view,
    state,
    previewHostRef,
    reports = [],
    reportDiagnostics = [],
    reportError,
    reportsLoading = false,
  } = props;
  const { t } = useTranslation();
  return (
    <Tabs value={view} className="min-h-0 min-w-0 flex-1 gap-0 overflow-hidden bg-background">
      <div className="shrink-0 border-b px-4">
        <TabsList variant="line" className="h-11">
          {views.map(item => {
            const Icon = item.icon;
            return (
              <TabsTrigger key={item.id} value={item.id} asChild>
                <NavLink to={getBenchCasePath(module.id, testCase.id, item.id)}>
                  <Icon />
                  {t(`caseView.${item.id}`)}
                </NavLink>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>
      {state.reportWarning === undefined ? null : (
        <div className="mx-4 mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>{state.reportWarning}</span>
        </div>
      )}
      <TabsContent value={BenchCaseView.Config} className="min-h-0 overflow-auto">
        <CaseConfiguration module={module} testCase={testCase} state={state} />
      </TabsContent>
      <TabsContent value={BenchCaseView.Run} className="min-h-0 overflow-hidden">
        <TestWorkspace state={state} previewHostRef={previewHostRef} />
      </TabsContent>
      <TabsContent value={BenchCaseView.Reports} className="min-h-0 overflow-auto">
        <ReportHistory
          session={state.session}
          reports={reports}
          diagnostics={reportDiagnostics}
          error={reportError}
          loading={reportsLoading}
        />
      </TabsContent>
    </Tabs>
  );
};
