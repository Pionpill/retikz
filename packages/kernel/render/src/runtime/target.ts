import type { PerformanceTraceSink } from '@retikz/foundation';
import { createFullSceneRuntimeSnapshot } from '@retikz/reconciler';
import type { ReconcilerCommitTarget, ReconcilerResult, ScenePatch } from '@retikz/reconciler';

import type { AnimationControls } from '../animation';
import { isRetikzRenderError, RetikzRenderError, RetikzRenderErrorCode } from '../error';
import { captureRuntimeConfig } from './config';
import type { RenderRuntimeConfigInput } from './config';
import type { RenderFrameSnapshot, StaticRenderFrame } from './frame';
import { EMPTY_READONLY_LAYERS, validateReadonlyLayers } from './readonly-layer';
import type { RenderReadonlyLayer } from './readonly-layer';
import { getRetainedRendererExecutor, isRetainedRenderer, isSvgHost, isCanvasHost } from './renderer';
import type {
  RetainedRenderer,
  RetainedRendererFactory,
  RetainedRendererRead,
  RetainedSvgRendererImmutableOptions,
  RetainedCanvasRendererImmutableOptions,
} from './renderer';
import { runtimeStructuralEquals } from './shared';
import { validateSceneRuntimeSnapshot, sceneRuntimeSnapshotEquals, validateScenePatch } from './validator';

/** 同一宿主重建编译会话时交接 renderer 的句柄 */
export type RetainedRenderLease = Readonly<{ renderer: RetainedRenderer }>;
const leaseOwners = new WeakMap<RetainedRenderLease, object>();
/** 编译结果到保留式宿主的接线配置 */
export type RetainedRenderTargetOptions = Readonly<{
  /** 宿主提交的可选观测出口 */
  trace?: PerformanceTraceSink;
  /** 创建当前宿主的后端实例 */
  rendererFactory: RetainedRendererFactory;
  /** 重建会话时可接管的现有后端 */
  rendererLease?: RetainedRenderLease;
  /** 每次准备读取本次输出配置 */
  configuration: () => RenderRuntimeConfigInput;
  /** 从同一编译结果解析只读图层 */
  resolveReadonlyLayers?: (output: ReconcilerResult['compilation']) => ReadonlyArray<RenderReadonlyLayer>;
  /** 首次建立新宿主或接管已有宿主 */
  mountMode?: 'create' | 'adopt';
}> &
  (
    | Readonly<{
        backend: 'svg';
        host: SVGSVGElement;
        immutableOptions: RetainedSvgRendererImmutableOptions;
        expectedInitialFrame?: StaticRenderFrame;
      }>
    | Readonly<{ backend: 'canvas'; host: HTMLCanvasElement; immutableOptions: RetainedCanvasRendererImmutableOptions }>
  );
/** Render 对外的读取及单目标提交能力 */
export type RetainedRenderTarget = Readonly<{
  /** 供会话调度的单目标提交协议 */
  target: ReconcilerCommitTarget;
  /** 仅返回最近成功提交的宿主状态 */
  read: () => RetainedRendererRead;
  /** 会话之间交接后端所有权的稳定句柄 */
  lease: RetainedRenderLease;
}>;

/** 创建与计算会话解耦的宿主提交目标 */
export const createRetainedRenderTarget = (input: RetainedRenderTargetOptions): RetainedRenderTarget => {
  let options: RetainedRenderTargetOptions;
  try {
    if (input.backend === 'svg') options = { ...input };
    else options = { ...input };
  } catch (cause) {
    throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRenderParticipantInputInvalid, cause });
  }
  if (!(options.backend === 'svg' ? isSvgHost(options.host) : isCanvasHost(options.host)))
    throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRenderParticipantInputInvalid, cause: options });
  const owner = {};
  const renderer =
    options.rendererLease?.renderer ??
    (options.backend === 'svg'
      ? options.rendererFactory({ backend: 'svg', host: options.host, immutableOptions: options.immutableOptions })
      : options.rendererFactory({ backend: 'canvas', host: options.host, immutableOptions: options.immutableOptions }));
  if (!isRetikzRendererForHost(renderer, options)) {
    let disposeFailure: unknown;
    if (options.rendererLease === undefined) {
      try {
        getRetainedRendererExecutor(renderer)?.dispose();
      } catch (cause) {
        disposeFailure = cause;
      }
    }
    throw new RetikzRenderError({
      code: RetikzRenderErrorCode.RetainedRendererInvalid,
      cause: { renderer, disposeFailure },
    });
  }
  const executor = getRetainedRendererExecutor(renderer);
  if (executor === undefined) throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererInvalid });
  const lease = options.rendererLease ?? Object.freeze({ renderer });
  if (options.rendererLease === undefined) leaseOwners.set(lease, owner);
  let committedRead: RetainedRendererRead | undefined;
  let disposed = false;
  let currentFrame = options.rendererLease === undefined ? undefined : executor.read().frame;
  const offset = currentFrame === undefined ? 0 : currentFrame.primary.revision + 1;
  const animationControlsCache = new WeakMap<object, AnimationControls>();
  const target: ReconcilerCommitTarget = {
    prepare: (candidate, previous) => {
      try {
        const prior = currentFrame;
        const priorRead = committedRead;
        const priorOwner = leaseOwners.get(lease);
        const revision = candidate.revision + offset;
        const sameCompilation = previous !== undefined && candidate.compilation === previous.compilation;
        const provenance = candidate.compilation.provenance;
        if (!sameCompilation && provenance === undefined)
          throw new RetikzRenderError({ code: RetikzRenderErrorCode.ScenePatchSnapshotMismatch });
        const primary =
          sameCompilation && prior !== undefined
            ? { ...prior.primary, revision }
            : createFullSceneRuntimeSnapshot(candidate.compilation.result.scene, revision, provenance!);
        const frame: RenderFrameSnapshot = Object.freeze({
          primary,
          layers: validateReadonlyLayers(
            options.resolveReadonlyLayers?.(candidate.compilation) ?? EMPTY_READONLY_LAYERS,
          ),
        });
        if (frame.layers.length > 0 && renderer.readonlyLayerCapability !== 'supported')
          throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererReadonlyLayerUnsupported });
        if (previous === undefined && options.backend === 'svg' && options.expectedInitialFrame !== undefined) {
          const expected = options.expectedInitialFrame;
          const normalized = {
            ...expected.primary,
            resources: expected.primary.resources ?? [],
            animations: expected.primary.animations ?? [],
          };
          if (
            !runtimeStructuralEquals(normalized, primary.scene) ||
            !runtimeStructuralEquals(validateReadonlyLayers(expected.layers), frame.layers)
          )
            throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererInitialFrameMismatch });
        }
        const config = captureRuntimeConfig(options.configuration());
        const patch: ScenePatch | undefined =
          prior === undefined
            ? undefined
            : {
                baseRevision: prior.primary.revision,
                nextRevision: revision,
                operations: sameCompilation ? [] : [{ kind: 'replaceScene', snapshot: primary }],
              };
        if (patch !== undefined && prior !== undefined) validateScenePatch(prior.primary, patch, primary);
        const token =
          patch === undefined
            ? executor.prepareMount(frame, config, options.mountMode ?? 'create')
            : executor.prepare(patch, frame, config);
        let committed = false;
        return {
          commit: () => {
            token.commit();
            committedRead = normalizeRendererRead(executor.read(), frame, animationControlsCache);
            currentFrame = frame;
            leaseOwners.set(lease, owner);
            committed = true;
          },
          rollback: () => {
            committed = false;
            token.rollback();
            currentFrame = prior;
            committedRead = priorRead;
            if (priorOwner === undefined) leaseOwners.delete(lease);
            else leaseOwners.set(lease, priorOwner);
          },
          dispose: () => {
            try {
              token.dispose();
            } finally {
              if (committed) {
                try {
                  options.trace?.({
                    owner: `@retikz/render:${options.backend}`,
                    phase: prior === undefined ? 'commit' : 'update',
                    unit: 'scene-change',
                    outcome: 'full',
                    visited: sameCompilation ? 0 : 1,
                    reused: 0,
                    changed: sameCompilation ? 0 : 1,
                  });
                } catch {
                  /* 观测失败不撤销宿主提交 */
                }
              }
            }
          },
        };
      } catch (cause) {
        if (isRetikzRenderError(cause)) throw cause;
        throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererPrepareFailed, cause });
      }
    },
    dispose: () => {
      disposed = true;
      committedRead = undefined;
      if (
        leaseOwners.get(lease) === owner ||
        (leaseOwners.get(lease) === undefined && options.rendererLease === undefined)
      ) {
        executor.dispose();
        leaseOwners.delete(lease);
      }
      currentFrame = undefined;
    },
  };
  return {
    target,
    lease,
    read: () => {
      if (disposed || committedRead === undefined)
        throw new RetikzRenderError({ code: RetikzRenderErrorCode.ScenePatchSnapshotMismatch });
      return committedRead;
    },
  };
};

/** 验证 renderer 的宿主归属，不允许把别的宿主接入本目标 */
const isRetikzRendererForHost = (renderer: RetainedRenderer, options: RetainedRenderTargetOptions): boolean =>
  isRetainedRenderer(renderer) && renderer.backend === options.backend && renderer.host === options.host;

const invalidRendererRead = (cause: unknown): never => {
  throw new RetikzRenderError({ code: RetikzRenderErrorCode.RetainedRendererInvalid, cause });
};

const findPropertyDescriptor = (value: object, key: PropertyKey): PropertyDescriptor | undefined => {
  let current: object | null = value;

  while (current !== null) {
    const descriptor = Object.getOwnPropertyDescriptor(current, key);
    if (descriptor !== undefined) return descriptor;
    current = Object.getPrototypeOf(current);
  }

  return undefined;
};

const captureAnimationState = <TValue extends number | boolean>(
  controls: object,
  key: 'time' | 'running',
  validate: (value: unknown) => value is TValue,
): (() => TValue) => {
  const descriptor = findPropertyDescriptor(controls, key);
  if (descriptor === undefined) return invalidRendererRead({ controls, key });

  const read =
    descriptor.get === undefined ? () => descriptor.value as unknown : () => descriptor.get?.call(controls) as unknown;
  const initial = read();
  if (!validate(initial)) return invalidRendererRead({ controls, key, value: initial });

  return () => {
    try {
      const value = read();
      return validate(value) ? value : invalidRendererRead({ controls, key, value });
    } catch (cause) {
      if (isRetikzRenderError(cause)) throw cause;
      return invalidRendererRead(cause);
    }
  };
};

const freezeAnimationControls = (
  controls: AnimationControls,
  cache: WeakMap<object, AnimationControls>,
): AnimationControls => {
  const candidate: unknown = controls;
  if (typeof candidate !== 'object' || candidate === null) return invalidRendererRead(controls);

  const cached = cache.get(candidate);
  if (cached !== undefined) return cached;

  const play = Reflect.get(candidate, 'play');
  const pause = Reflect.get(candidate, 'pause');
  const seek = Reflect.get(candidate, 'seek');
  const dispose = Reflect.get(candidate, 'dispose');
  if (
    typeof play !== 'function' ||
    typeof pause !== 'function' ||
    typeof seek !== 'function' ||
    typeof dispose !== 'function'
  ) {
    return invalidRendererRead(controls);
  }

  const readTime = captureAnimationState<number>(
    candidate,
    'time',
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  );
  const readRunning = captureAnimationState<boolean>(
    candidate,
    'running',
    (value): value is boolean => typeof value === 'boolean',
  );

  const wrapper: AnimationControls = {
    play: () => {
      Reflect.apply(play, candidate, []);
    },
    pause: () => {
      Reflect.apply(pause, candidate, []);
    },
    seek: (timeMs: number) => {
      Reflect.apply(seek, candidate, [timeMs]);
    },
    dispose: () => {
      Reflect.apply(dispose, candidate, []);
    },
    get time() {
      return readTime();
    },
    get running() {
      return readRunning();
    },
  };

  const frozen = Object.freeze(wrapper);
  cache.set(candidate, frozen);

  return frozen;
};

const normalizeRendererReadUnsafe = (
  value: RetainedRendererRead,
  lineage: RenderFrameSnapshot | undefined,
  animationControlsCache: WeakMap<object, AnimationControls>,
): RetainedRendererRead => {
  const candidate: unknown = value;
  if (lineage === undefined || typeof candidate !== 'object' || candidate === null) {
    throw new RetikzRenderError({
      code: RetikzRenderErrorCode.ScenePatchSnapshotMismatch,
      cause: value,
    });
  }

  const rawFrame: unknown = Reflect.get(candidate, 'frame');
  const animation = Reflect.get(candidate, 'animation') as AnimationControls | undefined;
  if (typeof rawFrame !== 'object' || rawFrame === null) {
    throw new RetikzRenderError({
      code: RetikzRenderErrorCode.ScenePatchSnapshotMismatch,
      cause: value,
    });
  }

  const frame = rawFrame as RenderFrameSnapshot;
  validateSceneRuntimeSnapshot(frame.primary);
  if (
    !sceneRuntimeSnapshotEquals(frame.primary, lineage.primary) ||
    !runtimeStructuralEquals(frame.layers, lineage.layers)
  ) {
    throw new RetikzRenderError({
      code: RetikzRenderErrorCode.ScenePatchSnapshotMismatch,
      cause: { expected: lineage, received: frame },
    });
  }

  return Object.freeze({
    frame: lineage,
    ...(animation === undefined ? {} : { animation: freezeAnimationControls(animation, animationControlsCache) }),
  });
};

const normalizeRendererRead = (
  value: RetainedRendererRead,
  lineage: RenderFrameSnapshot | undefined,
  animationControlsCache: WeakMap<object, AnimationControls>,
): RetainedRendererRead => {
  try {
    return normalizeRendererReadUnsafe(value, lineage, animationControlsCache);
  } catch (cause) {
    if (isRetikzRenderError(cause)) throw cause;
    throw new RetikzRenderError({ code: RetikzRenderErrorCode.ScenePatchSnapshotMismatch, cause });
  }
};
