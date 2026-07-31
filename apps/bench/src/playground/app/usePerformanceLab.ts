import type { Dispatch, RefObject } from 'react';

import { useCallback, useReducer, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import type { BenchModule, LabState, LabStateAction } from '../workspace';

import { runKernelLab } from '../modules/core';
import { createInitialLabState, LabActionType, reduceLabState } from '../workspace';

/** Performance Lab 页面交互出口 */
export type UsePerformanceLabValue = Readonly<{
  state: LabState;
  dispatch: Dispatch<LabStateAction>;
  previewHostRef: RefObject<HTMLDivElement>;
  run: () => Promise<void>;
}>;

/** 管理 Performance Lab 状态并在浏览器中执行 Kernel 场景 */
export const usePerformanceLab = (module: BenchModule): UsePerformanceLabValue => {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(reduceLabState, module.id, createInitialLabState);
  const previewHostRef = useRef<HTMLDivElement>(null);
  const run = useCallback(async (): Promise<void> => {
    if (!module.available) {
      dispatch({
        type: LabActionType.RunFailed,
        error: t('module.unavailableRun', { module: t(module.title) }),
      });
      return;
    }
    dispatch({ type: LabActionType.RunStarted });
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
    } catch (error) {
      dispatch({ type: LabActionType.RunFailed, error: error instanceof Error ? error.message : String(error) });
    }
  }, [
    module.available,
    module.title,
    state.backend,
    state.mode,
    state.policyId,
    state.sampleRuns,
    state.scenarioId,
    state.warmupRuns,
    t,
  ]);
  return Object.freeze({ state, dispatch, previewHostRef, run });
};
