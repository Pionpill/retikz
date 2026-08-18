import type { ValueOf } from '@retikz/foundation';

import { RetikzError } from '@retikz/foundation';

/** Retained Render 领域错误码 */
export const RetikzRetainedRenderErrorCode = {
  SceneTopologyInvalid: 'SCENE_TOPOLOGY_INVALID',
  ScenePatchInvalid: 'SCENE_PATCH_INVALID',
  ScenePatchSnapshotMismatch: 'SCENE_PATCH_SNAPSHOT_MISMATCH',
  ScenePatchRevisionMismatch: 'SCENE_PATCH_REVISION_MISMATCH',
  RetainedRendererInvalid: 'RETAINED_RENDERER_INVALID',
  RetainedRendererPrepareFailed: 'RETAINED_RENDERER_PREPARE_FAILED',
  RetainedRendererDisposed: 'RETAINED_RENDERER_DISPOSED',
  RetainedRendererReadonlyLayerUnsupported: 'RETAINED_RENDERER_READONLY_LAYER_UNSUPPORTED',
  RetainedRendererInitialFrameMismatch: 'RETAINED_RENDERER_INITIAL_FRAME_MISMATCH',
  RetainedRenderParticipantInputInvalid: 'RETAINED_RENDER_PARTICIPANT_INPUT_INVALID',
  RetainedRuntimeInputInvalid: 'RETAINED_RUNTIME_INPUT_INVALID',
} as const;

/** Retained Render 领域错误码取值 */
export type RetikzRetainedRenderErrorCodeValue = ValueOf<typeof RetikzRetainedRenderErrorCode>;

/** Retained Render 领域错误构造参数 */
export type RetikzRetainedRenderErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzRetainedRenderErrorCodeValue;
  /** 原始失败原因 */
  cause?: unknown;
  /** 可选开发者信息 */
  message?: string;
  /** Render owner 提供的机器可读上下文 */
  details?: Readonly<Record<string, unknown>>;
}>;

const EMPTY_RETAINED_RENDER_DETAILS = Object.freeze({});

/** Scene Patch、retained renderer 与 retained runtime 的具名领域错误 */
export class RetikzRetainedRenderError extends RetikzError<
  RetikzRetainedRenderErrorCodeValue,
  Readonly<Record<string, unknown>>
> {
  /** 稳定错误码 */
  readonly code: RetikzRetainedRenderErrorCodeValue;

  /** 原始失败原因 */
  override readonly cause?: unknown;

  /** 创建具名 Retained Render 错误 */
  constructor(options: RetikzRetainedRenderErrorOptions) {
    super({
      code: options.code,
      message: options.message ?? options.code,
      details: options.details ?? EMPTY_RETAINED_RENDER_DETAILS,
      cause: options.cause,
    });
    this.name = 'RetikzRetainedRenderError';
    this.code = options.code;
    this.cause = options.cause;
  }
}

/** 判断动态值是否为 Retained Render 领域错误 */
export const isRetikzRetainedRenderError = (value: unknown): value is RetikzRetainedRenderError =>
  value instanceof RetikzRetainedRenderError;
