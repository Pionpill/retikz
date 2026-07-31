import type { ValueOf } from '@retikz/core';

import type { LabBackendValue, LabPolicyIdValue, LabRunModeValue, LabRunSession } from '../modules/core';
import type { BenchModuleIdValue } from './constant';

import { defaultKernelLabScenarioId, LabBackend, LabPolicyId, LabRunMode } from '../modules/core';
import { BenchModuleId } from './constant';

/** Performance Lab 运行状态 */
export const LabStatus = {
  Idle: 'idle',
  Running: 'running',
  Success: 'success',
  Error: 'error',
} as const;

/** Performance Lab 运行状态取值 */
export type LabStatusValue = ValueOf<typeof LabStatus>;

/** Performance Lab 页面动作类型 */
export const LabActionType = {
  ModeSelected: 'mode-selected',
  BackendSelected: 'backend-selected',
  PolicySelected: 'policy-selected',
  ScenarioSelected: 'scenario-selected',
  SampleRunsSelected: 'sample-runs-selected',
  WarmupRunsSelected: 'warmup-runs-selected',
  DetailsOpened: 'details-opened',
  DetailsClosed: 'details-closed',
  RunStarted: 'run-started',
  RunSucceeded: 'run-succeeded',
  RunFailed: 'run-failed',
  ReportSaveFailed: 'report-save-failed',
} as const;

/** Performance Lab 页面动作类型取值 */
export type LabActionTypeValue = ValueOf<typeof LabActionType>;

/** Performance Lab 页面状态 */
export type LabState = Readonly<{
  mode: LabRunModeValue;
  moduleId: BenchModuleIdValue;
  backend: LabBackendValue;
  policyId: LabPolicyIdValue;
  scenarioId: string;
  warmupRuns: number;
  sampleRuns: number;
  status: LabStatusValue;
  detailsOpen: boolean;
  session?: LabRunSession;
  error?: string;
  reportWarning?: string;
}>;

/** Performance Lab 页面状态动作 */
export type LabStateAction =
  | Readonly<{ type: typeof LabActionType.ModeSelected; mode: LabRunModeValue }>
  | Readonly<{ type: typeof LabActionType.BackendSelected; backend: LabBackendValue }>
  | Readonly<{ type: typeof LabActionType.PolicySelected; policyId: LabPolicyIdValue }>
  | Readonly<{ type: typeof LabActionType.ScenarioSelected; scenarioId: string }>
  | Readonly<{ type: typeof LabActionType.SampleRunsSelected; sampleRuns: number }>
  | Readonly<{ type: typeof LabActionType.WarmupRunsSelected; warmupRuns: number }>
  | Readonly<{ type: typeof LabActionType.DetailsOpened }>
  | Readonly<{ type: typeof LabActionType.DetailsClosed }>
  | Readonly<{ type: typeof LabActionType.RunStarted }>
  | Readonly<{ type: typeof LabActionType.RunSucceeded; session: LabRunSession }>
  | Readonly<{ type: typeof LabActionType.RunFailed; error: string }>
  | Readonly<{ type: typeof LabActionType.ReportSaveFailed; warning: string }>;

/** 创建 Performance Lab 的稳定默认状态 */
export const createInitialLabState = (
  moduleId: BenchModuleIdValue = BenchModuleId.Kernel,
  scenarioId: string = defaultKernelLabScenarioId,
): LabState =>
  Object.freeze({
    mode: LabRunMode.Inspect,
    moduleId,
    backend: LabBackend.Svg,
    policyId: LabPolicyId.RetainedAuto,
    scenarioId,
    warmupRuns: 2,
    sampleRuns: 12,
    status: LabStatus.Idle,
    detailsOpen: false,
  });

/** 归并 Performance Lab 页面动作 */
export const reduceLabState = (state: LabState, action: LabStateAction): LabState => {
  switch (action.type) {
    case LabActionType.ModeSelected:
      return Object.freeze({ ...state, mode: action.mode });
    case LabActionType.BackendSelected:
      return Object.freeze({ ...state, backend: action.backend });
    case LabActionType.PolicySelected:
      return Object.freeze({ ...state, policyId: action.policyId });
    case LabActionType.ScenarioSelected:
      return Object.freeze({ ...state, scenarioId: action.scenarioId });
    case LabActionType.SampleRunsSelected:
      return Object.freeze({ ...state, sampleRuns: action.sampleRuns });
    case LabActionType.WarmupRunsSelected:
      return Object.freeze({ ...state, warmupRuns: action.warmupRuns });
    case LabActionType.DetailsOpened:
      return Object.freeze({ ...state, detailsOpen: true });
    case LabActionType.DetailsClosed:
      return Object.freeze({ ...state, detailsOpen: false });
    case LabActionType.RunStarted:
      return Object.freeze({ ...state, status: LabStatus.Running, error: undefined, reportWarning: undefined });
    case LabActionType.RunSucceeded:
      return Object.freeze({
        ...state,
        status: LabStatus.Success,
        session: action.session,
        error: undefined,
      });
    case LabActionType.RunFailed:
      return Object.freeze({ ...state, status: LabStatus.Error, error: action.error });
    case LabActionType.ReportSaveFailed:
      return Object.freeze({ ...state, reportWarning: action.warning });
  }
};
