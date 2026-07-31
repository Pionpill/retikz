import type { FC } from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { TooltipProvider } from '@/components/ui/tooltip';

import { LabPolicyId } from '../modules/core';
import { ReportPanel } from '../report';
import { ConfigurationSheet, LabActionType, TestWorkspace, WorkspaceHeader, WorkspaceSidebar } from '../workspace';
import { usePerformanceLab } from './use-performance-lab';

/** Kernel Performance Lab 工作台属性 */
export type AppProps = Readonly<Record<string, never>>;

/** Kernel Performance Lab 工作台 */
export const App: FC<AppProps> = () => {
  const { state, dispatch, previewHostRef, run } = usePerformanceLab();
  const results = state.session?.results ?? [];
  const inspectedResult =
    results.find(result => result.policyId === state.policyId) ??
    results.find(result => result.policyId === LabPolicyId.RetainedAuto) ??
    results[0];
  return (
    <TooltipProvider>
      <SidebarProvider>
        <WorkspaceSidebar state={state} dispatch={dispatch} />
        <SidebarInset className="h-svh min-w-0 overflow-hidden">
          <WorkspaceHeader state={state} dispatch={dispatch} onRun={() => void run()} />
          <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <TestWorkspace state={state} previewHostRef={previewHostRef} />
            {state.reportOpen && state.session !== undefined ? (
              <ReportPanel
                session={state.session}
                inspectedResult={inspectedResult}
                onClose={() => dispatch({ type: LabActionType.ReportClosed })}
              />
            ) : null}
          </div>
        </SidebarInset>
        <ConfigurationSheet state={state} dispatch={dispatch} />
      </SidebarProvider>
    </TooltipProvider>
  );
};
