import type { ValueOf } from '@retikz/core';

/** Retained Render 领域错误码 */
export const RetainedRenderErrorCode = {
  SceneTopologyInvalid: 'SCENE_TOPOLOGY_INVALID',
  ScenePatchInvalid: 'SCENE_PATCH_INVALID',
  ScenePatchSnapshotMismatch: 'SCENE_PATCH_SNAPSHOT_MISMATCH',
  ScenePatchRevisionMismatch: 'SCENE_PATCH_REVISION_MISMATCH',
  RetainedRendererInvalid: 'RETAINED_RENDERER_INVALID',
  RetainedRendererPrepareFailed: 'RETAINED_RENDERER_PREPARE_FAILED',
  RetainedRendererDisposed: 'RETAINED_RENDERER_DISPOSED',
  RetainedRendererInspectionUnsupported: 'RETAINED_RENDERER_INSPECTION_UNSUPPORTED',
  RetainedRendererInitialFrameMismatch: 'RETAINED_RENDERER_INITIAL_FRAME_MISMATCH',
  RetainedRenderParticipantInputInvalid: 'RETAINED_RENDER_PARTICIPANT_INPUT_INVALID',
  RetainedRuntimeInputInvalid: 'RETAINED_RUNTIME_INPUT_INVALID',
} as const;

/** Retained Render 领域错误码取值 */
export type RetainedRenderErrorCodeValue = ValueOf<typeof RetainedRenderErrorCode>;

/** Retained Render 领域错误构造参数 */
export type RetainedRenderErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetainedRenderErrorCodeValue;
  /** 原始失败原因 */
  cause?: unknown;
  /** 可选开发者信息 */
  message?: string;
}>;

/** Scene Patch、retained renderer 与 retained runtime 的具名领域错误 */
export class RetainedRenderError extends Error {
  /** 稳定错误码 */
  readonly code: RetainedRenderErrorCodeValue;

  /** 原始失败原因 */
  override readonly cause?: unknown;

  /** 创建具名 Retained Render 错误 */
  constructor(options: RetainedRenderErrorOptions) {
    super(options.message ?? options.code, { cause: options.cause });
    this.name = 'RetainedRenderError';
    this.code = options.code;
    this.cause = options.cause;
  }
}

/** 判断动态值是否为 Retained Render 领域错误 */
export const isRetainedRenderError = (value: unknown): value is RetainedRenderError =>
  value instanceof RetainedRenderError;
