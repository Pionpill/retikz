import type { ValueOf } from '@retikz/foundation';

import type { LabBackendValue, LabPolicyIdValue, LabRunSession } from '../modules/kernel';
import type { BenchModuleIdValue } from './module-registry';
import type { LabPreviewSizePresetIdValue } from './preview-size';

import { isValidLabPreviewSize, LabBackend, LabPolicyId } from '../modules/kernel';
import { BenchModuleId } from './module-registry';
import { defaultLabPreviewSizePreset, getLabPreviewSizePreset, LabPreviewSizePresetId } from './preview-size';

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
  BackendSelected: 'backend-selected',
  PolicySelected: 'policy-selected',
  SampleRunsSelected: 'sample-runs-selected',
  WarmupRunsSelected: 'warmup-runs-selected',
  PreviewSizePresetSelected: 'preview-size-preset-selected',
  PreviewSizeChanged: 'preview-size-changed',
  DetailsOpened: 'details-opened',
  DetailsClosed: 'details-closed',
  RunStarted: 'run-started',
  RunInvalidated: 'run-invalidated',
  RunSucceeded: 'run-succeeded',
  RunFailed: 'run-failed',
  ReportSaveFailed: 'report-save-failed',
} as const;

/** Performance Lab 页面动作类型取值 */
export type LabActionTypeValue = ValueOf<typeof LabActionType>;

/** Performance Lab 页面状态 */
export type LabState = Readonly<{
  moduleId: BenchModuleIdValue;
  backend: LabBackendValue;
  policyId: LabPolicyIdValue;
  warmupRuns: number;
  sampleRuns: number;
  /** 当前预览尺寸模式 */
  previewSizePresetId: LabPreviewSizePresetIdValue;
  /** SVG / Canvas 预览输出宽度 */
  previewWidth: number;
  /** SVG / Canvas 预览输出高度 */
  previewHeight: number;
  status: LabStatusValue;
  detailsOpen: boolean;
  session?: LabRunSession;
  error?: string;
  reportWarning?: string;
}>;

/** Performance Lab 页面状态动作 */
export type LabStateAction =
  | Readonly<{ type: typeof LabActionType.BackendSelected; backend: LabBackendValue }>
  | Readonly<{ type: typeof LabActionType.PolicySelected; policyId: LabPolicyIdValue }>
  | Readonly<{ type: typeof LabActionType.SampleRunsSelected; sampleRuns: number }>
  | Readonly<{ type: typeof LabActionType.WarmupRunsSelected; warmupRuns: number }>
  | Readonly<{
      type: typeof LabActionType.PreviewSizePresetSelected;
      presetId: LabPreviewSizePresetIdValue;
    }>
  | Readonly<{
      type: typeof LabActionType.PreviewSizeChanged;
      width: number;
      height: number;
    }>
  | Readonly<{ type: typeof LabActionType.DetailsOpened }>
  | Readonly<{ type: typeof LabActionType.DetailsClosed }>
  | Readonly<{ type: typeof LabActionType.RunStarted }>
  | Readonly<{ type: typeof LabActionType.RunInvalidated }>
  | Readonly<{ type: typeof LabActionType.RunSucceeded; session: LabRunSession }>
  | Readonly<{ type: typeof LabActionType.RunFailed; error: string }>
  | Readonly<{ type: typeof LabActionType.ReportSaveFailed; warning: string }>;

/** 创建 Performance Lab 的稳定默认状态 */
export const createInitialLabState = (moduleId: BenchModuleIdValue = BenchModuleId.Kernel): LabState =>
  Object.freeze({
    moduleId,
    backend: LabBackend.Svg,
    policyId: LabPolicyId.RetainedAuto,
    warmupRuns: 2,
    sampleRuns: 12,
    previewSizePresetId: defaultLabPreviewSizePreset.id,
    previewWidth: defaultLabPreviewSizePreset.width,
    previewHeight: defaultLabPreviewSizePreset.height,
    status: LabStatus.Idle,
    detailsOpen: false,
  });

/** 归并 Performance Lab 页面动作 */
export const reduceLabState = (state: LabState, action: LabStateAction): LabState => {
  switch (action.type) {
    case LabActionType.BackendSelected:
      return Object.freeze({ ...state, backend: action.backend });
    case LabActionType.PolicySelected:
      return Object.freeze({ ...state, policyId: action.policyId });
    case LabActionType.SampleRunsSelected:
      return Object.freeze({ ...state, sampleRuns: action.sampleRuns });
    case LabActionType.WarmupRunsSelected:
      return Object.freeze({ ...state, warmupRuns: action.warmupRuns });
    case LabActionType.PreviewSizePresetSelected: {
      if (action.presetId === LabPreviewSizePresetId.Custom) {
        return Object.freeze({ ...state, previewSizePresetId: action.presetId });
      }
      const preset = getLabPreviewSizePreset(action.presetId);
      return Object.freeze({
        ...state,
        previewSizePresetId: preset.id,
        previewWidth: preset.width,
        previewHeight: preset.height,
      });
    }
    case LabActionType.PreviewSizeChanged:
      if (!isValidLabPreviewSize(action.width, action.height)) return state;
      return Object.freeze({
        ...state,
        previewSizePresetId: LabPreviewSizePresetId.Custom,
        previewWidth: action.width,
        previewHeight: action.height,
      });
    case LabActionType.DetailsOpened:
      return Object.freeze({ ...state, detailsOpen: true });
    case LabActionType.DetailsClosed:
      return Object.freeze({ ...state, detailsOpen: false });
    case LabActionType.RunStarted:
      return Object.freeze({ ...state, status: LabStatus.Running, error: undefined, reportWarning: undefined });
    case LabActionType.RunInvalidated:
      return Object.freeze({
        ...state,
        status: LabStatus.Idle,
        session: undefined,
        error: undefined,
        reportWarning: undefined,
      });
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
