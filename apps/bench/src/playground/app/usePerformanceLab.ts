import type { Dispatch, RefObject } from 'react';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { LabRunModeValue } from '../modules/kernel';
import type { LabState, LabStateAction } from './lab-state';
import type { BenchModule } from './module-registry';
import type { BenchTestCase } from './test-catalog';

import { BenchReportStatus } from '../../shared';
import { runKernelLab } from '../modules/kernel';
import { createLabSessionReportStatus, saveBenchReport } from '../report';
import { createInitialLabState, LabActionType, reduceLabState } from './lab-state';

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
  testCase: BenchTestCase | undefined,
  mode: LabRunModeValue,
  onReportSaved?: () => void,
): UsePerformanceLabValue => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reduceLabState, createInitialLabState(module.id));
  const previewHostRef = useRef<HTMLDivElement>(null);
  const executionGenerationRef = useRef(0);
  useEffect(() => {
    executionGenerationRef.current += 1;
    dispatch({ type: LabActionType.RunInvalidated });
  }, [
    mode,
    module.id,
    state.backend,
    state.policyId,
    state.previewHeight,
    state.previewWidth,
    state.sampleRuns,
    state.warmupRuns,
    testCase?.id,
  ]);
  const run = useCallback(async (): Promise<void> => {
    if (!module.available || testCase === undefined) {
      dispatch({
        type: LabActionType.RunFailed,
        error: t('module.unavailableRun', { module: t(module.title) }),
      });
      return;
    }
    executionGenerationRef.current += 1;
    const executionGeneration = executionGenerationRef.current;
    const isCurrentExecution = (): boolean => executionGenerationRef.current === executionGeneration;
    dispatch({ type: LabActionType.RunStarted });
    const reportStartedAt = new Date().toISOString();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    try {
      const { executeBrowserKernelLabPolicy } = await import('../modules/kernel/browser');
      if (!isCurrentExecution()) return;
      const session = await runKernelLab(
        {
          mode,
          scenarioId: testCase.scenarioId,
          backend: state.backend,
          policyId: state.policyId,
          warmupRuns: state.warmupRuns,
          sampleRuns: state.sampleRuns,
          ...(previewHostRef.current === null
            ? {}
            : {
                preview: Object.freeze({
                  host: previewHostRef.current,
                  width: state.previewWidth,
                  height: state.previewHeight,
                }),
              }),
        },
        executeBrowserKernelLabPolicy,
      );
      if (isCurrentExecution()) dispatch({ type: LabActionType.RunSucceeded, session });
      try {
        await saveBenchReport({
          moduleId: module.id,
          caseId: testCase.id,
          status: createLabSessionReportStatus(session),
          startedAt: reportStartedAt,
          completedAt: new Date().toISOString(),
          payload: session,
        });
        if (isCurrentExecution()) onReportSaved?.();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (isCurrentExecution()) {
          dispatch({
            type: LabActionType.ReportSaveFailed,
            warning: t('reportHistory.saveFailed', { error: message }),
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (isCurrentExecution()) dispatch({ type: LabActionType.RunFailed, error: message });
      try {
        await saveBenchReport({
          moduleId: module.id,
          caseId: testCase.id,
          status: BenchReportStatus.Failed,
          startedAt: reportStartedAt,
          completedAt: new Date().toISOString(),
          payload: { error: message },
        });
        if (isCurrentExecution()) onReportSaved?.();
      } catch (reportError) {
        const reportMessage = reportError instanceof Error ? reportError.message : String(reportError);
        if (isCurrentExecution()) {
          dispatch({
            type: LabActionType.ReportSaveFailed,
            warning: t('reportHistory.saveFailed', { error: reportMessage }),
          });
        }
      }
    }
  }, [
    module.available,
    module.id,
    module.title,
    mode,
    onReportSaved,
    state.backend,
    state.policyId,
    state.previewHeight,
    state.previewWidth,
    state.sampleRuns,
    state.warmupRuns,
    t,
    testCase,
  ]);
  return Object.freeze({ state, dispatch, previewHostRef, run });
};
