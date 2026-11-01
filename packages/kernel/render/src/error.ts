import type { ValueOf } from '@retikz/foundation';
import { RetikzError } from '@retikz/foundation';

/** Render 包稳定错误码 */
export const RetikzRenderErrorCode = {
  /** 未被更精确分类覆盖的 Render 错误 */
  Default: 'RENDER_ERROR',

  /** WAAPI binding 初始化失败 */
  AnimationWaapiBindingSetupFailed: 'RENDER_ANIMATION_WAAPI_BINDING_SETUP_FAILED',

  /** Canvas 渲染失败 */
  Canvas: 'RENDER_CANVAS_ERROR',
  /** Canvas 节点渲染失败 */
  CanvasNode: 'RENDER_CANVAS_NODE_ERROR',
  /** Canvas visibility 初始化失败 */
  CanvasVisibilitySetupFailed: 'RENDER_CANVAS_VISIBILITY_SETUP_FAILED',
  /** Canvas animation 初始化失败 */
  CanvasAnimationSetupFailed: 'RENDER_CANVAS_ANIMATION_SETUP_FAILED',
  /** Canvas animation commit 恢复失败 */
  CanvasAnimationCommitRecoveryFailed: 'RENDER_CANVAS_ANIMATION_COMMIT_RECOVERY_FAILED',

  /** Hydration controller 初始化失败 */
  HydrationControllerSetupFailed: 'RENDER_HYDRATION_CONTROLLER_SETUP_FAILED',

  /** Render runtime 失败 */
  Runtime: 'RENDER_RUNTIME_ERROR',
  /** Scene Patch 无效 */
  RuntimeScenePatchInvalid: 'RENDER_RUNTIME_SCENE_PATCH_INVALID',
  /** Scene Patch snapshot 不匹配 */
  RuntimeScenePatchSnapshotMismatch: 'RENDER_RUNTIME_SCENE_PATCH_SNAPSHOT_MISMATCH',
  /** Scene Patch revision 不匹配 */
  RuntimeScenePatchRevisionMismatch: 'RENDER_RUNTIME_SCENE_PATCH_REVISION_MISMATCH',
  /** Retained renderer 无效 */
  RuntimeRendererInvalid: 'RENDER_RUNTIME_RENDERER_INVALID',
  /** Retained renderer prepare 失败 */
  RuntimeRendererPrepareFailed: 'RENDER_RUNTIME_RENDERER_PREPARE_FAILED',
  /** Retained renderer 已释放 */
  RuntimeRendererDisposed: 'RENDER_RUNTIME_RENDERER_DISPOSED',
  /** Retained renderer 不支持只读图层 */
  RuntimeRendererReadonlyLayerUnsupported: 'RENDER_RUNTIME_RENDERER_READONLY_LAYER_UNSUPPORTED',
  /** Retained renderer 初始帧不匹配 */
  RuntimeRendererInitialFrameMismatch: 'RENDER_RUNTIME_RENDERER_INITIAL_FRAME_MISMATCH',
  /** Retained Render participant 输入无效 */
  RuntimeParticipantInputInvalid: 'RENDER_RUNTIME_PARTICIPANT_INPUT_INVALID',
  /** Retained runtime 输入无效 */
  RuntimeInputInvalid: 'RENDER_RUNTIME_INPUT_INVALID',

  /** Scene 拓扑无效 */
  SceneTopologyInvalid: 'RENDER_SCENE_TOPOLOGY_INVALID',

  /** SVG 渲染失败 */
  Svg: 'RENDER_SVG_ERROR',
} as const;

/** Render 包稳定错误码取值 */
export type RetikzRenderErrorCode = ValueOf<typeof RetikzRenderErrorCode>;

/** Render 包错误的结构化构造参数 */
export type RetikzRenderErrorOptions = Readonly<{
  /** 稳定错误码 */
  code: RetikzRenderErrorCode;
  /** 面向调用方的原始错误消息 */
  message?: string;
  /** 失败上下文的结构化详情 */
  details?: Readonly<Record<string, unknown>>;
  /** 导致当前失败的原始异常或值 */
  cause?: unknown;
}>;

type RetikzRenderErrorCauseOptions = Readonly<Pick<RetikzRenderErrorOptions, 'details' | 'cause'>>;

/** Render 包统一的结构化错误 */
export class RetikzRenderError extends RetikzError<RetikzRenderErrorCode, Readonly<Record<string, unknown>>> {
  /** 使用默认错误码创建 Render 错误 */
  constructor(message: string);
  /** 使用结构化参数创建 Render 错误 */
  constructor(options: RetikzRenderErrorOptions);
  /** 使用显式错误码创建 Render 错误 */
  constructor(code: RetikzRenderErrorCode, message: string, options?: RetikzRenderErrorCauseOptions);
  constructor(
    optionsOrMessageOrCode: RetikzRenderErrorOptions | string,
    message?: string,
    causeOptions: RetikzRenderErrorCauseOptions = {},
  ) {
    const options: RetikzRenderErrorOptions =
      typeof optionsOrMessageOrCode !== 'string'
        ? optionsOrMessageOrCode
        : message === undefined
          ? { code: RetikzRenderErrorCode.Default, message: optionsOrMessageOrCode }
          : { code: optionsOrMessageOrCode as RetikzRenderErrorCode, message, ...causeOptions };
    super({
      code: options.code,
      message: options.message ?? options.code,
      details: options.details ?? Object.freeze({ code: options.code }),
      cause: options.cause,
    });
  }
}

/** 判断动态值是否为 Render 包错误 */
export const isRetikzRenderError = (value: unknown): value is RetikzRenderError => value instanceof RetikzRenderError;
