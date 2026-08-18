import type {
  AnyCompositeDefinition,
  CoreProgramDefinition,
  CoreProgramOutput,
  RuntimeScenePrimitive,
  Scene,
  ScenePatch,
  ScenePatchOperation,
  SceneRuntimeSnapshot,
} from '@retikz/core';
import type { RuntimeCommitParticipant, RuntimePreparedCommit, RuntimeSession } from '@retikz/runtime';

import {
  createRuntimeRevision,
  defineRuntimeCommitParticipant,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
  RuntimeProgramPhase,
} from '@retikz/runtime';

import type { AnimationControls } from '../animation';
import type { RenderRuntimeConfig } from './config';
import type { RenderFrameSnapshot, StaticRenderFrame } from './frame';
import type { RenderReadonlyLayer } from './readonly-layer';
import type {
  RetainedCanvasRendererImmutableOptions,
  RetainedRenderer,
  RetainedRendererFactory,
  RetainedRendererRead,
  RetainedSvgRendererImmutableOptions,
} from './renderer';
import type { RuntimeIdentityMap } from './shared';

import { RenderRuntimeOwnerDefinition } from './config';
import { isRetikzRetainedRenderError, RetikzRetainedRenderError, RetikzRetainedRenderErrorCode } from './error';
import { EMPTY_READONLY_LAYERS, validateReadonlyLayers } from './readonly-layer';
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
  /** 在 topology 重建时保持同一 renderer 的私有交接租约 */
  lease: RetainedRenderParticipantLease;
}>;

declare const RetainedRenderParticipantLeaseBrand: unique symbol;

/** 在新的 Runtime session 接管前保持 retained renderer 所有权的私有租约 */
export type RetainedRenderParticipantLease = Readonly<{
  [RetainedRenderParticipantLeaseBrand]: true;
}>;

type RetainedRenderParticipantLeaseState = {
  renderer: RetainedRenderer;
  owner: object | undefined;
};

const retainedRenderParticipantLeases = new WeakMap<object, RetainedRenderParticipantLeaseState>();

type RetainedRenderParticipantOptionsBase<TComposites extends ReadonlyArray<AnyCompositeDefinition>> = Readonly<{
  /** Adapter 注入的 renderer factory */
  rendererFactory: RetainedRendererFactory;
  /** 接管同一宿主上已提交 renderer 的内部租约 */
  rendererLease?: RetainedRenderParticipantLease;
  /** 同一 session 使用的 Core Program */
  coreProgram: CoreProgramDefinition<TComposites>;
  /**
   * 从同一 candidate 的 Core 输出解析有序只读 Scene 图层
   * @default 冻结空数组
   */
  resolveReadonlyLayers?: (coreOutput: CoreProgramOutput<TComposites>) => ReadonlyArray<RenderReadonlyLayer>;
  /**
   * 首次 mount 策略；SSR handoff 使用 adopt
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
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.RetainedRendererPrepareFailed,
      cause: token,
    });
  }
  return token;
};

const callRendererPrepare = (callback: () => RuntimePreparedCommit): RuntimePreparedCommit => {
  try {
    return validatePreparedToken(callback());
  } catch (cause) {
    if (isRetikzRetainedRenderError(cause)) throw cause;
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.RetainedRendererPrepareFailed,
      cause,
    });
  }
};

const invalidRendererRead = (cause: unknown): never => {
  throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid, cause });
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
      if (isRetikzRetainedRenderError(cause)) throw cause;
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
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.ScenePatchSnapshotMismatch,
      cause: value,
    });
  }
  const rawFrame: unknown = Reflect.get(candidate, 'frame');
  const animation = Reflect.get(candidate, 'animation') as AnimationControls | undefined;
  if (typeof rawFrame !== 'object' || rawFrame === null) {
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.ScenePatchSnapshotMismatch,
      cause: value,
    });
  }
  const frame = rawFrame as RenderFrameSnapshot;
  validateSceneRuntimeSnapshot(frame.primary);
  if (
    !sceneRuntimeSnapshotEquals(frame.primary, lineage.primary) ||
    !runtimeStructuralEquals(frame.layers, lineage.layers)
  ) {
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.ScenePatchSnapshotMismatch,
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
    if (isRetikzRetainedRenderError(cause)) throw cause;
    throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.ScenePatchSnapshotMismatch, cause });
  }
};

const invalidInput = (cause: unknown): never => {
  throw new RetikzRetainedRenderError({
    code: RetikzRetainedRenderErrorCode.RetainedRenderParticipantInputInvalid,
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
  const rendererLease = Reflect.get(candidate, 'rendererLease');
  const immutableOptions = Reflect.get(candidate, 'immutableOptions');
  const mountMode = Reflect.get(candidate, 'mountMode');
  const coreProgram = Reflect.get(candidate, 'coreProgram');
  const expectedInitialFrame = Reflect.get(candidate, 'expectedInitialFrame');
  const resolveReadonlyLayers = Reflect.get(candidate, 'resolveReadonlyLayers');
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
    (rendererLease !== undefined &&
      (typeof rendererLease !== 'object' ||
        rendererLease === null ||
        !retainedRenderParticipantLeases.has(rendererLease))) ||
    immutableBackend !== backend ||
    typeof idPrefix !== 'string' ||
    idPrefix.length === 0 ||
    (typeof coreProgram !== 'object' && typeof coreProgram !== 'function') ||
    coreProgram === null ||
    (expectedInitialFrame !== undefined &&
      (typeof expectedInitialFrame !== 'object' || expectedInitialFrame === null)) ||
    (mountMode !== undefined && mountMode !== 'create' && mountMode !== 'adopt') ||
    (resolveReadonlyLayers !== undefined && typeof resolveReadonlyLayers !== 'function')
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
      ...(rendererLease === undefined ? {} : { rendererLease: rendererLease as RetainedRenderParticipantLease }),
      immutableOptions: Object.freeze({
        backend,
        idPrefix,
        ...(devicePixelRatio === undefined ? {} : { devicePixelRatio }),
      }),
      coreProgram: coreProgram as CoreProgramDefinition<TComposites>,
      ...(resolveReadonlyLayers === undefined
        ? {}
        : {
            resolveReadonlyLayers: resolveReadonlyLayers as (
              coreOutput: CoreProgramOutput<TComposites>,
            ) => ReadonlyArray<RenderReadonlyLayer>,
          }),
      ...(mountMode === undefined ? {} : { mountMode }),
    });
  }
  return Object.freeze({
    backend,
    host: host as SVGSVGElement,
    rendererFactory,
    ...(rendererLease === undefined ? {} : { rendererLease: rendererLease as RetainedRenderParticipantLease }),
    immutableOptions: Object.freeze({ backend, idPrefix }),
    coreProgram: coreProgram as CoreProgramDefinition<TComposites>,
    ...(resolveReadonlyLayers === undefined
      ? {}
      : {
          resolveReadonlyLayers: resolveReadonlyLayers as (
            coreOutput: CoreProgramOutput<TComposites>,
          ) => ReadonlyArray<RenderReadonlyLayer>,
        }),
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
    if (isRetikzRetainedRenderError(cause)) throw cause;
    return invalidInput(cause);
  }
};

/** 创建连接 Core Program、Render config owner 与 retained renderer 的 Runtime participant */
export const createRetainedRenderParticipant = <TComposites extends ReadonlyArray<AnyCompositeDefinition>>(
  options: CreateRetainedRenderParticipantOptions<TComposites>,
): RetainedRenderParticipantHandle => {
  const captured = captureOptions(options);
  const owner = Object.freeze({});
  const previousLease = captured.rendererLease;
  const leaseState = previousLease === undefined ? undefined : retainedRenderParticipantLeases.get(previousLease);
  let renderer: RetainedRenderer;
  if (leaseState !== undefined) {
    renderer = leaseState.renderer;
  } else {
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
      if (isRetikzRetainedRenderError(cause)) throw cause;
      throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid, cause });
    }
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
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid,
      cause: disposeFailure === undefined ? renderer : Object.freeze({ renderer, disposeFailure }),
    });
  }
  const executor = getRetainedRendererExecutor(renderer);
  if (executor === undefined) {
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid,
      cause: renderer,
    });
  }
  const lease =
    previousLease ??
    (() => {
      const next = Object.freeze({}) as RetainedRenderParticipantLease;
      retainedRenderParticipantLeases.set(next, { renderer, owner });
      return next;
    })();
  const currentLeaseState = retainedRenderParticipantLeases.get(lease);
  if (currentLeaseState === undefined) {
    throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.RetainedRendererInvalid, cause: lease });
  }
  const previousFrame =
    previousLease === undefined
      ? undefined
      : (() => {
          const frame = executor.read().frame;
          validateSceneRuntimeSnapshot(frame.primary);
          return Object.freeze({ primary: frame.primary, layers: validateReadonlyLayers(frame.layers) });
        })();
  const revisionOffset = previousFrame === undefined ? 0 : Number(previousFrame.primary.revision) + 1;
  const rebaseRevision = (revision: SceneRuntimeSnapshot['revision']): SceneRuntimeSnapshot['revision'] =>
    revisionOffset === 0 ? revision : createRuntimeRevision(Number(revision) + revisionOffset);
  const rebaseSnapshot = (snapshot: SceneRuntimeSnapshot): SceneRuntimeSnapshot =>
    revisionOffset === 0 ? snapshot : Object.freeze({ ...snapshot, revision: rebaseRevision(snapshot.revision) });
  const rebasePatch = (patch: ScenePatch): ScenePatch =>
    revisionOffset === 0
      ? patch
      : Object.freeze({
          baseRevision: rebaseRevision(patch.baseRevision),
          nextRevision: rebaseRevision(patch.nextRevision),
          operations: Object.freeze(
            patch.operations.map(operation =>
              operation.kind === 'replaceScene'
                ? Object.freeze({ ...operation, snapshot: rebaseSnapshot(operation.snapshot) })
                : operation,
            ),
          ),
        });
  let committedFrame: RenderFrameSnapshot | undefined = previousFrame;
  const animationControlsCache = new WeakMap<object, AnimationControls>();
  const resolveReadonlyLayers = (output: CoreProgramOutput<TComposites>): ReadonlyArray<RenderReadonlyLayer> =>
    validateReadonlyLayers(captured.resolveReadonlyLayers?.(output) ?? EMPTY_READONLY_LAYERS);
  const assertReadonlyLayersSupported = (frame: RenderFrameSnapshot): void => {
    if (frame.layers.length === 0 || renderer.readonlyLayerCapability === 'supported') return;
    throw new RetikzRetainedRenderError({
      code: RetikzRetainedRenderErrorCode.RetainedRendererReadonlyLayerUnsupported,
    });
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
        const frame = Object.freeze({
          primary: rebaseSnapshot(core.snapshot),
          layers: resolveReadonlyLayers(core.output),
        });
        if (
          captured.backend === 'svg' &&
          captured.expectedInitialFrame !== undefined &&
          (!runtimeStructuralEquals(
            canonicalizeStaticScene(captured.expectedInitialFrame.primary),
            frame.primary.scene,
          ) ||
            !runtimeStructuralEquals(validateReadonlyLayers(captured.expectedInitialFrame.layers), frame.layers))
        ) {
          throw new RetikzRetainedRenderError({
            code: RetikzRetainedRenderErrorCode.RetainedRendererInitialFrameMismatch,
          });
        }
        assertReadonlyLayersSupported(frame);
        const rendererToken =
          previousFrame === undefined
            ? callRendererPrepare(() => executor.prepareMount(frame, config, captured.mountMode ?? 'create'))
            : (() => {
                const patch = Object.freeze({
                  baseRevision: previousFrame.primary.revision,
                  nextRevision: frame.primary.revision,
                  operations: Object.freeze([
                    Object.freeze({ kind: 'replaceScene' as const, snapshot: frame.primary }),
                  ]),
                });
                validateScenePatch(previousFrame.primary, patch, frame.primary);
                return callRendererPrepare(() => executor.prepare(patch, frame, config));
              })();
        const previous = committedFrame;
        return Object.freeze({
          commit: () => {
            rendererToken.commit();
            committedFrame = frame;
            currentLeaseState.owner = owner;
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
        throw new RetikzRetainedRenderError({ code: RetikzRetainedRenderErrorCode.ScenePatchRevisionMismatch });
      }
      const hasCandidateCoreSnapshot = core.snapshot.revision === candidate.candidateRevision;
      const next = hasCandidateCoreSnapshot
        ? rebaseSnapshot(core.snapshot)
        : createConfigOnlySnapshot(committedFrame.primary, rebaseRevision(candidate.candidateRevision));
      const nextFrame = Object.freeze({
        primary: next,
        layers: resolveReadonlyLayers(core.output),
      });
      const patch =
        hasCandidateCoreSnapshot && core.patch !== undefined
          ? rebasePatch(core.patch)
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
      assertReadonlyLayersSupported(nextFrame);
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
      if (currentLeaseState.owner === owner) {
        executor.dispose();
        currentLeaseState.owner = undefined;
      }
      committedFrame = undefined;
    },
  });
  return Object.freeze({
    participant,
    read: session => session.participant(participant),
    lease,
  });
};
