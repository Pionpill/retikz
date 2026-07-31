import type { Dispatch, RefObject } from 'react';

import { useCallback, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { BenchModule, BenchTestCase, LabState, LabStateAction } from '../workspace';

import { BenchReportStatus } from '../../shared';
import { runKernelLab } from '../modules/core';
import { createLabSessionReportStatus, saveBenchReport } from '../report';
import { createInitialLabState, LabActionType, reduceLabState } from '../workspace';

/** Performance Lab 页面交互出口 */
export type UsePerformanceLabValue = Readonly<{
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
  previewHostRef: RefObject<HTMLDivElement>;
  run: () => Promise<void>;
}>;

/** 管理 Performance Lab 状态并在浏览器中执行 Kernel 场景 */
export const usePerformanceLab = (
  module: BenchModule,
  testCase?: BenchTestCase,
  onReportSaved?: () => void,
): UsePerformanceLabValue => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reduceLabState, createInitialLabState(module.id, testCase?.scenarioId));
  const previewHostRef = useRef<HTMLDivElement>(null);
  const run = useCallback(async (): Promise<void> => {
    if (!module.available || testCase === undefined) {
      dispatch({
        type: LabActionType.RunFailed,
        error: t('module.unavailableRun', { module: t(module.title) }),
      });
      return;
    }
    dispatch({ type: LabActionType.RunStarted });
    const reportStartedAt = new Date().toISOString();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      const { executeBrowserKernelLabPolicy } = await import('../modules/core/browser');
      const session = await runKernelLab(
        {
          mode: state.mode,
          scenarioId: state.scenarioId,
          backend: state.backend,
          policyId: state.policyId,
          warmupRuns: state.warmupRuns,
          sampleRuns: state.sampleRuns,
          ...(previewHostRef.current === null ? {} : { previewHost: previewHostRef.current }),
        },
        executeBrowserKernelLabPolicy,
      );
      dispatch({ type: LabActionType.RunSucceeded, session });
      try {
        await saveBenchReport({
          moduleId: module.id,
          caseId: testCase.id,
          status: createLabSessionReportStatus(session),
          startedAt: reportStartedAt,
          completedAt: new Date().toISOString(),
          payload: session,
        });
        onReportSaved?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        dispatch({ type: LabActionType.ReportSaveFailed, warning: t('reportHistory.saveFailed', { error: message }) });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      dispatch({ type: LabActionType.RunFailed, error: message });
      try {
        await saveBenchReport({
          moduleId: module.id,
          caseId: testCase.id,
          status: BenchReportStatus.Failed,
          startedAt: reportStartedAt,
          completedAt: new Date().toISOString(),
          payload: { error: message },
        });
        onReportSaved?.();
      } catch (reportError) {
        const reportMessage = reportError instanceof Error ? reportError.message : String(reportError);
        dispatch({
          type: LabActionType.ReportSaveFailed,
          warning: t('reportHistory.saveFailed', { error: reportMessage }),
        });
      }
    }
  }, [
    module.available,
    module.id,
    module.title,
    onReportSaved,
    state.backend,
    state.mode,
    state.policyId,
    state.sampleRuns,
    state.scenarioId,
    state.warmupRuns,
    t,
    testCase,
  ]);
  return Object.freeze({ state, dispatch, previewHostRef, run });
};
