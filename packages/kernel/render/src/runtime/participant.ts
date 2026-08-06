import type {
  AnyCompositeDefinition,
  CoreProgramDefinition,
  RuntimeScenePrimitive,
  Scene,
  ScenePatch,
  ScenePatchOperation,
  SceneRuntimeSnapshot,
} from '@retikz/core';
import type { RuntimeCommitParticipant, RuntimePreparedCommit, RuntimeSession } from '@retikz/runtime';

import {
  defineRuntimeCommitParticipant,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RuntimeProgramPhase,
} from '@retikz/runtime';

import type { AnimationControls } from '../animation';
import type { RenderRuntimeConfig } from './config';
import type { RenderFrameSnapshot, StaticRenderFrame } from './frame';
import type {
  RetainedCanvasRendererImmutableOptions,
  RetainedRenderer,
  RetainedRendererFactory,
  RetainedRendererRead,
  RetainedSvgRendererImmutableOptions,
} from './renderer';
import type { RuntimeIdentityMap } from './shared';

import { RenderRuntimeOwnerDefinition } from './config';
import { isRetainedRenderError, RetainedRenderError, RetainedRenderErrorCode } from './error';
import { getRetainedRendererExecutor, isCanvasHost, isRetainedRenderer, isSvgHost } from './renderer';
import { createRuntimeIdentityMap, isPlainObject, runtimeStructuralEquals } from './shared';
import { sceneRuntimeSnapshotEquals, validateScenePatch, validateSceneRuntimeSnapshot } from './validator';

/** SVG retained participant 的固定 key */
export const RETAINED_SVG_PARTICIPANT_KEY = '@retikz/render:svg' as const;

/** Canvas retained participant 的固定 key */
export const RETAINED_CANVAS_PARTICIPANT_KEY = '@retikz/render:canvas' as const;

/** Adapter 持有的 session-bound retained renderer handle */
export type RetainedRenderParticipantHandle = Readonly<{
  /** 注入 Runtime session 的 typed participant */
  participant: RuntimeCommitParticipant<RetainedRendererRead>;
  /** 通过 Runtime session gate 读取 committed renderer state */
  read: (session: RuntimeSession) => RetainedRendererRead;
}>;

type RetainedRenderParticipantOptionsBase<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** Adapter 注入的 renderer factory */
  rendererFactory: RetainedRendererFactory;
  /** 同一 session 使用的 Core Program */
  coreProgram: CoreProgramDefinition<TComposites>;
  /** 首次 mount 策略；SSR handoff 使用 adopt
   * @default create
   */
  mountMode?: 'create' | 'adopt';
}>;

/** Retained render participant 的判别输入 */
export type CreateRetainedRenderParticipantOptions<TComposites extends ReadonlyArray<AnyCompositeDefinition>> =
  | (RetainedRenderParticipantOptionsBase<TComposites> &
      Readonly<{
        backend: 'svg';
        host: SVGSVGElement;
        immutableOptions: RetainedSvgRendererImmutableOptions;
        /** SSR/create seed 与首次 Core frame 的预期值 */
        expectedInitialFrame?: StaticRenderFrame;
      }>)
  | (RetainedRenderParticipantOptionsBase<TComposites> &
      Readonly<{
        backend: 'canvas';
        host: HTMLCanvasElement;
        immutableOptions: RetainedCanvasRendererImmutableOptions;
      }>);

const countPrimitives = (primitives: ReadonlyArray<RuntimeScenePrimitive>): number =>
  primitives.reduce(
    (count, primitive) => count + 1 + (primitive.type === 'group' ? countPrimitives(primitive.children) : 0),
    0,
  );

/** 把静态 Scene 补齐为 Runtime Scene 的 canonical 空集合口径，用于 SSR seed 比较 */
const canonicalizeStaticScene = (scene: Scene): Scene => ({
  ...scene,
  resources: scene.resources ?? [],
  animations: scene.animations ?? [],
});

const primitiveAtPath = (
  snapshot: SceneRuntimeSnapshot,
  path: ReadonlyArray<number>,
): RuntimeScenePrimitive | undefined => {
  let current = snapshot.scene.primitives;
  let primitive: RuntimeScenePrimitive | undefined;
  for (const index of path) {
    const candidate: unknown = Reflect.get(current, index);
    if (candidate === undefined) return undefined;
    primitive = candidate as RuntimeScenePrimitive;
    current = primitive.type === 'group' ? primitive.children : [];
  }
  return primitive;
};

const operationTargetsGroup = (
  operation: ScenePatchOperation,
  currentPrimitives: RuntimeIdentityMap<RuntimeScenePrimitive | undefined>,
): boolean => {
  if (operation.kind === 'setLayout' || operation.kind === 'setResources' || operation.kind === 'setAnimations') {
    return true;
  }
  if (operation.kind === 'replaceScene') return true;
  if (operation.kind === 'insert') return operation.subtree.primitive.type === 'group';
  if (operation.kind === 'update') {
    const currentPrimitive = currentPrimitives.get(operation.identity);
    return currentPrimitive?.type === 'group' && operation.subtree.primitive.type === 'group';
  }
  return currentPrimitives.get(operation.identity)?.type === 'group';
};

const supportsPatch = (renderer: RetainedRenderer, patch: ScenePatch, current: SceneRuntimeSnapshot): boolean => {
  if (patch.operations.length === 0 || patch.operations.every(operation => operation.kind === 'replaceScene'))
    return true;
  if (renderer.capability === 'entity') return true;
  if (renderer.capability === 'none') return false;
  const currentPrimitives = createRuntimeIdentityMap(
    current.topology.map(node => [node.identity, primitiveAtPath(current, node.primitivePath)] as const),
  );
  return patch.operations.every(operation => operationTargetsGroup(operation, currentPrimitives));
};

const createReplacePatch = (patch: ScenePatch, next: SceneRuntimeSnapshot): ScenePatch =>
  Object.freeze({
    baseRevision: patch.baseRevision,
    nextRevision: patch.nextRevision,
    operations: Object.freeze([Object.freeze({ kind: 'replaceScene' as const, snapshot: next })]),
  });

const createConfigOnlySnapshot = (
  current: SceneRuntimeSnapshot,
  candidateRevision: SceneRuntimeSnapshot['revision'],
): SceneRuntimeSnapshot =>
  Object.freeze({
    revision: candidateRevision,
    scene: current.scene,
    root: current.root,
    topology: current.topology,
  });

const createConfigOnlyPatch = (current: SceneRuntimeSnapshot, next: SceneRuntimeSnapshot): ScenePatch =>
  Object.freeze({
    baseRevision: current.revision,
    nextRevision: next.revision,
    operations: Object.freeze([]),
  });

const validatePreparedToken = (token: RuntimePreparedCommit): RuntimePreparedCommit => {
  const candidate: unknown = token;
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    typeof Reflect.get(candidate, 'commit') !== 'function' ||
    typeof Reflect.get(candidate, 'rollback') !== 'function' ||
    typeof Reflect.get(candidate, 'dispose') !== 'function'
  ) {
    throw new RetainedRenderError({
      code: RetainedRenderErrorCode.RetainedRendererPrepareFailed,
      cause: token,
    });
  }
  return token;
};

const callRendererPrepare = (callback: () => RuntimePreparedCommit): RuntimePreparedCommit => {
  try {
    return validatePreparedToken(callback());
  } catch (cause) {
    if (isRetainedRenderError(cause)) throw cause;
    throw new RetainedRenderError({
      code: RetainedRenderErrorCode.RetainedRendererPrepareFailed,
      cause,
    });
  }
};

const invalidRendererRead = (cause: unknown): never => {
  throw new RetainedRenderError({ code: RetainedRenderErrorCode.RetainedRendererInvalid, cause });
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
      if (isRetainedRenderError(cause)) throw cause;
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
    throw new RetainedRenderError({
      code: RetainedRenderErrorCode.ScenePatchSnapshotMismatch,
      cause: value,
    });
  }
  const rawFrame: unknown = Reflect.get(candidate, 'frame');
  const animation = Reflect.get(candidate, 'animation') as AnimationControls | undefined;
  if (typeof rawFrame !== 'object' || rawFrame === null) {
    throw new RetainedRenderError({ code: RetainedRenderErrorCode.ScenePatchSnapshotMismatch, cause: value });
  }
  const frame = rawFrame as RenderFrameSnapshot;
  validateSceneRuntimeSnapshot(frame.primary);
  if (
    !sceneRuntimeSnapshotEquals(frame.primary, lineage.primary) ||
    !runtimeStructuralEquals(frame.inspection, lineage.inspection)
  ) {
    throw new RetainedRenderError({
      code: RetainedRenderErrorCode.ScenePatchSnapshotMismatch,
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
    if (isRetainedRenderError(cause)) throw cause;
    throw new RetainedRenderError({ code: RetainedRenderErrorCode.ScenePatchSnapshotMismatch, cause });
  }
};

const invalidInput = (cause: unknown): never => {
  throw new RetainedRenderError({
    code: RetainedRenderErrorCode.RetainedRenderParticipantInputInvalid,
    cause,
  });
};

const captureOptionsUnsafe = <TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
  options: CreateRetainedRenderParticipantOptions<TComposites>,
): CreateRetainedRenderParticipantOptions<TComposites> => {
  const candidate: unknown = options;
  if (typeof candidate !== 'object' || candidate === null) return invalidInput(options);
  const backend = Reflect.get(candidate, 'backend');
  const host = Reflect.get(candidate, 'host');
  const rendererFactory = Reflect.get(candidate, 'rendererFactory');
  const immutableOptions = Reflect.get(candidate, 'immutableOptions');
  const mountMode = Reflect.get(candidate, 'mountMode');
  const coreProgram = Reflect.get(candidate, 'coreProgram');
  const expectedInitialFrame = Reflect.get(candidate, 'expectedInitialFrame');
  if (typeof immutableOptions !== 'object' || immutableOptions === null || !isPlainObject(immutableOptions)) {
    return invalidInput(options);
  }
  const immutableBackend = Reflect.get(immutableOptions, 'backend');
  const idPrefix = Reflect.get(immutableOptions, 'idPrefix');
  const devicePixelRatio = Reflect.get(immutableOptions, 'devicePixelRatio');
  const validHost = backend === 'svg' ? isSvgHost(host) : backend === 'canvas' && isCanvasHost(host);
  if (
    !validHost ||
    typeof rendererFactory !== 'function' ||
    immutableBackend !== backend ||
    typeof idPrefix !== 'string' ||
    idPrefix.length === 0 ||
    (typeof coreProgram !== 'object' && typeof coreProgram !== 'function') ||
    coreProgram === null ||
    (expectedInitialFrame !== undefined &&
      (typeof expectedInitialFrame !== 'object' || expectedInitialFrame === null)) ||
    (mountMode !== undefined && mountMode !== 'create' && mountMode !== 'adopt')
  ) {
    return invalidInput(options);
  }
  if (backend === 'canvas') {
    if (expectedInitialFrame !== undefined) return invalidInput(options);
    if (
      devicePixelRatio !== undefined &&
      (typeof devicePixelRatio !== 'number' || !Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0)
    ) {
      return invalidInput(options);
    }
    return Object.freeze({
      backend,
      host: host as HTMLCanvasElement,
      rendererFactory,
      immutableOptions: Object.freeze({
        backend,
        idPrefix,
        ...(devicePixelRatio === undefined ? {} : { devicePixelRatio }),
      }),
      coreProgram: coreProgram as CoreProgramDefinition<TComposites>,
      ...(mountMode === undefined ? {} : { mountMode }),
    });
  }
  return Object.freeze({
    backend,
    host: host as SVGSVGElement,
    rendererFactory,
    immutableOptions: Object.freeze({ backend, idPrefix }),
    coreProgram: coreProgram as CoreProgramDefinition<TComposites>,
    ...(expectedInitialFrame === undefined ? {} : { expectedInitialFrame: expectedInitialFrame as StaticRenderFrame }),
    ...(mountMode === undefined ? {} : { mountMode }),
  });
};

const captureOptions = <TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
  options: CreateRetainedRenderParticipantOptions<TComposites>,
): CreateRetainedRenderParticipantOptions<TComposites> => {
  try {
    return captureOptionsUnsafe(options);
  } catch (cause) {
    if (isRetainedRenderError(cause)) throw cause;
    return invalidInput(cause);
  }
};

/** 创建连接 Core Program、Render config owner 与 retained renderer 的 Runtime participant */
export const createRetainedRenderParticipant = <TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
  options: CreateRetainedRenderParticipantOptions<TComposites>,
): RetainedRenderParticipantHandle => {
  const captured = captureOptions(options);
  let renderer: RetainedRenderer;
  try {
    if (captured.backend === 'svg') {
      renderer = captured.rendererFactory({
        backend: 'svg',
        host: captured.host,
        immutableOptions: captured.immutableOptions,
      });
    } else {
      renderer = captured.rendererFactory({
        backend: 'canvas',
        host: captured.host,
        immutableOptions: captured.immutableOptions,
      });
    }
  } catch (cause) {
    if (isRetainedRenderError(cause)) throw cause;
    throw new RetainedRenderError({ code: RetainedRenderErrorCode.RetainedRendererInvalid, cause });
  }
  const validRenderer =
    isRetainedRenderer(renderer) && renderer.backend === captured.backend && renderer.host === captured.host;
  if (!validRenderer) {
    let disposeFailure: unknown;
    if (isRetainedRenderer(renderer)) {
      try {
        getRetainedRendererExecutor(renderer)?.dispose();
      } catch (cause) {
        disposeFailure = cause;
      }
    }
    throw new RetainedRenderError({
      code: RetainedRenderErrorCode.RetainedRendererInvalid,
      cause: disposeFailure === undefined ? renderer : Object.freeze({ renderer, disposeFailure }),
    });
  }
  const executor = getRetainedRendererExecutor(renderer);
  if (executor === undefined) {
    throw new RetainedRenderError({ code: RetainedRenderErrorCode.RetainedRendererInvalid, cause: renderer });
  }
  let committedFrame: RenderFrameSnapshot | undefined;
  const animationControlsCache = new WeakMap<object, AnimationControls>();
  const assertInspectionSupported = (frame: RenderFrameSnapshot): void => {
    if (frame.inspection === null || renderer.inspectionCapability === 'supported') return;
    throw new RetainedRenderError({ code: RetainedRenderErrorCode.RetainedRendererInspectionUnsupported });
  };
  const participant = defineRuntimeCommitParticipant<RetainedRendererRead>({
    key: captured.backend === 'svg' ? RETAINED_SVG_PARTICIPANT_KEY : RETAINED_CANVAS_PARTICIPANT_KEY,
    owners: [RenderRuntimeOwnerDefinition],
    programs: [captured.coreProgram],
    revisionPolicy: 'continuous',
    tracePhases: [
      {
        phase: PerformanceTracePhase.Commit,
        unit: PerformanceTraceUnit.ScenePrimitive,
        outcomes: [PerformanceTraceOutcome.Full],
      },
      {
        phase: PerformanceTracePhase.Update,
        unit: PerformanceTraceUnit.SceneChange,
        outcomes: [PerformanceTraceOutcome.Full, PerformanceTraceOutcome.Incremental, PerformanceTraceOutcome.Fallback],
      },
    ],
    prepare: (candidate, context) => {
      const core = candidate.artifact(captured.coreProgram).value;
      const config: RenderRuntimeConfig = candidate.snapshot(RenderRuntimeOwnerDefinition).value;
      if (candidate.phase === RuntimeProgramPhase.Initial) {
        validateSceneRuntimeSnapshot(core.snapshot);
        const frame = Object.freeze({ primary: core.snapshot, inspection: core.output.result.inspection });
        if (
          captured.backend === 'svg' &&
          captured.expectedInitialFrame !== undefined &&
          (!runtimeStructuralEquals(
            canonicalizeStaticScene(captured.expectedInitialFrame.primary),
            frame.primary.scene,
          ) ||
            !runtimeStructuralEquals(captured.expectedInitialFrame.inspection, frame.inspection))
        ) {
          throw new RetainedRenderError({ code: RetainedRenderErrorCode.RetainedRendererInitialFrameMismatch });
        }
        assertInspectionSupported(frame);
        const rendererToken = callRendererPrepare(() =>
          executor.prepareMount(frame, config, captured.mountMode ?? 'create'),
        );
        const previous = committedFrame;
        return Object.freeze({
          commit: () => {
            rendererToken.commit();
            committedFrame = frame;
            const count = countPrimitives(core.snapshot.scene.primitives);
            context.trace.report({
              phase: PerformanceTracePhase.Commit,
              unit: PerformanceTraceUnit.ScenePrimitive,
              outcome: PerformanceTraceOutcome.Full,
              visited: count,
              reused: 0,
              changed: count,
            });
          },
          rollback: () => {
            rendererToken.rollback();
            committedFrame = previous;
          },
          dispose: () => rendererToken.dispose(),
        });
      }
      if (committedFrame === undefined) {
        throw new RetainedRenderError({ code: RetainedRenderErrorCode.ScenePatchRevisionMismatch });
      }
      const hasCandidateCoreSnapshot = core.snapshot.revision === candidate.candidateRevision;
      const next = hasCandidateCoreSnapshot
        ? core.snapshot
        : createConfigOnlySnapshot(committedFrame.primary, candidate.candidateRevision);
      const nextFrame = Object.freeze({
        primary: next,
        inspection: hasCandidateCoreSnapshot ? core.output.result.inspection : committedFrame.inspection,
      });
      const patch =
        hasCandidateCoreSnapshot && core.patch !== undefined
          ? core.patch
          : createConfigOnlyPatch(committedFrame.primary, next);
      validateScenePatch(committedFrame.primary, patch, next);
      const fallback = !supportsPatch(renderer, patch, committedFrame.primary);
      const directReplace = patch.operations.length === 1 && patch.operations[0]?.kind === 'replaceScene';
      const rendererPatch = fallback ? createReplacePatch(patch, next) : patch;
      if (fallback) {
        context.diagnose({
          code: 'RETAINED_RENDERER_CAPABILITY_FALLBACK',
          phase: 'prepare',
          message: `Renderer capability "${renderer.capability}" requires a full Scene replacement`,
        });
      }
      assertInspectionSupported(nextFrame);
      const rendererToken = callRendererPrepare(() => executor.prepare(rendererPatch, nextFrame, config));
      const previous = committedFrame;
      return Object.freeze({
        commit: () => {
          rendererToken.commit();
          committedFrame = nextFrame;
          context.trace.report({
            phase: PerformanceTracePhase.Update,
            unit: PerformanceTraceUnit.SceneChange,
            outcome: fallback
              ? PerformanceTraceOutcome.Fallback
              : directReplace
                ? PerformanceTraceOutcome.Full
                : PerformanceTraceOutcome.Incremental,
            visited: rendererPatch.operations.length,
            reused: 0,
            changed: rendererPatch.operations.length,
          });
        },
        rollback: () => {
          rendererToken.rollback();
          committedFrame = previous;
        },
        dispose: () => rendererToken.dispose(),
      });
    },
    read: () => normalizeRendererRead(executor.read(), committedFrame, animationControlsCache),
    dispose: () => {
      executor.dispose();
      committedFrame = undefined;
    },
  });
  return Object.freeze({
    participant,
    read: session => session.participant(participant),
  });
};
