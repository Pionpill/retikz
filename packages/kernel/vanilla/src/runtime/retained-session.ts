import type {
  AnyCompositeDefinition,
  CompileArtifact,
  CoreProgramOptions,
  CoreProgramOutput,
  IRScene,
  Scene,
} from '@retikz/core';
import type { RenderHandlerContribution, RenderRuntimeConfigInput, RetainedRendererRead } from '@retikz/render/runtime';
import type { RuntimeDiagnostic, RuntimeSession } from '@retikz/runtime';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import {
  builtinRetainedRendererFactory,
  createRetainedRenderParticipant,
  RenderCachePolicy,
  RenderRuntimeOwnerDefinition,
  RetainedRenderError,
  RetainedRenderErrorCode,
} from '@retikz/render/runtime';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeOwner,
} from '@retikz/runtime';

import type { VanillaAuthoringSite, VanillaRuntimeMeta } from '../spec';
import type { VanillaCompileDriverInput, VanillaCompileDriverSession } from './compile-driver';
import type {
  CommonOptions,
  HydrateOptions,
  HydrationHandle,
  RetainedCanvasUpdateOptions,
  RetainedMountCanvasOptions,
  RetainedMountOptions,
  RetainedRenderInput,
  RetainedSvgUpdateOptions,
  RetainedVanillaCanvasUpdateOptions,
  RetainedVanillaUpdateOptions,
  VanillaAnimationOptions,
  VanillaRetainedRuntimeOptions,
} from './types';

import { isVanillaFigureSpec, normalizeFigureSpec, VanillaLayerCache } from '../spec';
import {
  commitVanillaCompileOutput,
  createVanillaCompileDriverSession,
  defaultVanillaCompileDriver,
  resolveVanillaCompileOutput,
} from './compile-driver';
import { createRetainedCompositeDefinitions, VanillaCompositeRevisionOwnerDefinition } from './retained-composites';
import { captureRetainedUpdateOptions } from './retained-update-options';
import { createEmptyRuntimeMeta } from './to-scene';

/** 自定义编译驱动运行时输入的领域中立失效 revision */
const VanillaCompileDriverRevisionOwnerDefinition = defineRuntimeOwner<number, number, number, never>({
  key: '@retikz/vanilla:compile-driver-revision',
  value: {
    capture: value => {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new RetainedRenderError({
          code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
          cause: value,
          message: 'Vanilla compile driver revision must be a non-negative safe integer',
        });
      }
      return value;
    },
    read: value => value,
    equals: Object.is,
  },
});

/** 捕获 mount-lifetime composite definition record，保留 schema 与 callback identity */
const captureCompositeDefinition = (definition: AnyCompositeDefinition): AnyCompositeDefinition =>
  Object.freeze(
    typeof definition.expand === 'function'
      ? {
          namespace: definition.namespace,
          type: definition.type,
          schema: definition.schema,
          expand: definition.expand,
        }
      : {
          namespace: definition.namespace,
          type: definition.type,
          schema: definition.schema,
          compile: definition.compile,
          ...(definition.artifactSchema === undefined ? {} : { artifactSchema: definition.artifactSchema }),
        },
  ) as AnyCompositeDefinition;

/** 捕获 retained session 会在后续 normalization 继续读取的 mount options */
const captureRetainedMountOptions = (options: RetainedMountCanvasOptions): RetainedMountCanvasOptions => {
  const adapters = options.adapters?.map(adapter =>
    Object.freeze({ kind: adapter.kind, namespace: adapter.namespace, lower: adapter.lower }),
  );
  const composites = options.compile?.composites?.map(captureCompositeDefinition);
  return Object.freeze({
    ...options,
    ...(adapters === undefined ? {} : { adapters: Object.freeze(adapters) }),
    ...(options.compile === undefined
      ? {}
      : {
          compile: Object.freeze({
            ...options.compile,
            ...(composites === undefined ? {} : { composites: Object.freeze(composites) }),
          }),
        }),
  });
};

/** Retained session 创建所需的规范化输入 */
export type PreparedRetainedInput = Readonly<{
  /** 提交给 Core owner 的完整 IR Snapshot */
  source: IRScene;
  /** 与 source 同次 normalization 的 runtime metadata */
  runtimeMeta: VanillaRuntimeMeta;
  /** 固定 Core Program 使用的编译配置 */
  coreOptions: CoreProgramOptions<ReadonlyArray<AnyCompositeDefinition>>;
  /** 与 source 同次 normalization 的 authored sites */
  authoringSites: ReadonlyArray<VanillaAuthoringSite>;
}>;

/** 丢弃 direct compile 专属 trace，构造 session-lifetime Core Program options */
const toCoreProgramOptions = (options: CommonOptions): CoreProgramOptions<ReadonlyArray<AnyCompositeDefinition>> => {
  const { trace, ...coreOptions } = options.compile ?? {};
  void trace;
  return {
    ...coreOptions,
  };
};

const EMPTY_AUTHORING_SITES: ReadonlyArray<VanillaAuthoringSite> = Object.freeze([]);

/** 把 IR / plain spec 规范化为 retained session 的 Core owner 输入 */
export const prepareRetainedInput = (input: RetainedRenderInput, options: CommonOptions): PreparedRetainedInput => {
  if ('primitives' in (input as object)) {
    throw new RetainedRenderError({
      code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
      cause: input,
    });
  }
  const coreOptions = toCoreProgramOptions(options);
  if (isVanillaFigureSpec(input)) {
    const normalized = normalizeFigureSpec(input, {
      adapters: options.adapters,
      composites: coreOptions.composites,
    });
    return Object.freeze({
      source: normalized.ir,
      runtimeMeta: normalized.runtimeMeta,
      authoringSites: normalized.authoringSites,
      coreOptions: {
        ...coreOptions,
        composites: normalized.composites,
      },
    });
  }
  return Object.freeze({
    source: input,
    runtimeMeta: createEmptyRuntimeMeta(),
    coreOptions,
    authoringSites: EMPTY_AUTHORING_SITES,
  });
};

/** 把 Vanilla layer hints 保守折叠为 Render cache policy */
const resolveCachePolicy = (runtimeMeta: VanillaRuntimeMeta): 'auto' | 'static' | 'dynamic' => {
  if (runtimeMeta.layers.some(layer => layer.cache === VanillaLayerCache.Dynamic)) return RenderCachePolicy.Dynamic;
  if (runtimeMeta.layers.length > 0 && runtimeMeta.layers.every(layer => layer.cache === VanillaLayerCache.Static)) {
    return RenderCachePolicy.Static;
  }
  return RenderCachePolicy.Auto;
};

type RetainedSessionState = Readonly<{
  /** 当前 committed 动画配置 */
  animation: VanillaAnimationOptions;
  /** 当前 committed Canvas 可变配置 */
  canvas: RetainedVanillaCanvasUpdateOptions;
  /** 当前 committed runtime metadata */
  runtimeMeta: VanillaRuntimeMeta;
}>;

/** Vanilla retained session controller 对外能力 */
export type RetainedSessionController<
  TUpdateOptions extends RetainedVanillaUpdateOptions = RetainedVanillaUpdateOptions,
> = Readonly<{
  /** 原子更新完整输入与可变 renderer 配置 */
  update: (next: RetainedRenderInput, options?: TUpdateOptions) => void;
  /** 向当前 committed Scene 注册 hydration handlers */
  hydrate: (options: HydrateOptions) => HydrationHandle;
  /** 释放 Session 与 renderer；失败 cleanup 可由重复调用重试 */
  dispose: () => void;
  /** 按队列顺序返回并清空 Runtime diagnostics */
  diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
  /** 读取当前 committed renderer Snapshot 与控制器 */
  read: () => RetainedRendererRead;
  /** 读取当前 committed Scene */
  scene: () => Scene;
  /** 读取当前 committed compile artifacts */
  artifacts: () => ReadonlyArray<CompileArtifact>;
  /** 读取当前 committed runtime metadata */
  runtimeMeta: () => VanillaRuntimeMeta;
}>;

type CreateSvgRetainedSessionOptions = Readonly<{
  /** 要创建的 renderer 后端 */
  backend: 'svg';
  /** retained renderer 独占的宿主根元素 */
  host: SVGSVGElement;
  /** 初始完整 IR 或 plain spec */
  input: RetainedRenderInput;
  /** session-lifetime mount 配置 */
  options: RetainedMountOptions;
  /** 已在宿主创建前校验并复制的 Runtime 配置 */
  runtimeOptions: VanillaRetainedRuntimeOptions;
  /** SSR 与资源引用共用的稳定 id 前缀 */
  idPrefix: string;
}>;

type CreateCanvasRetainedSessionOptions = Readonly<{
  /** 要创建的 renderer 后端 */
  backend: 'canvas';
  /** retained renderer 独占的宿主根元素 */
  host: HTMLCanvasElement;
  /** 初始完整 IR 或 plain spec */
  input: RetainedRenderInput;
  /** session-lifetime mount 配置 */
  options: RetainedMountCanvasOptions;
  /** 已在宿主创建前校验并复制的 Runtime 配置 */
  runtimeOptions: VanillaRetainedRuntimeOptions;
  /** SSR 与资源引用共用的稳定 id 前缀 */
  idPrefix: string;
  /** Canvas session-lifetime 设备像素比 */
  devicePixelRatio?: number;
}>;

type CreateRetainedSessionOptions = CreateSvgRetainedSessionOptions | CreateCanvasRetainedSessionOptions;

type CreateVanillaRetainedSession = {
  /** 创建 SVG retained session */
  (options: CreateSvgRetainedSessionOptions): RetainedSessionController<RetainedSvgUpdateOptions>;
  /** 创建 Canvas retained session */
  (options: CreateCanvasRetainedSessionOptions): RetainedSessionController<RetainedCanvasUpdateOptions>;
};

/** 捕获一次 revision 的 Render Runtime config */
const createRenderConfig = (
  state: RetainedSessionState,
  handlers: ReadonlyArray<RenderHandlerContribution>,
  canvasSize: RenderRuntimeConfigInput['canvas'],
): RenderRuntimeConfigInput => ({
  handlerContributions: handlers,
  animation: {
    enabled: resolveAnimationEnabled(state.animation.enabled, prefersReducedMotion()),
    ...(state.animation.snapshotAt === undefined ? {} : { snapshotAt: state.animation.snapshotAt }),
    ...(state.animation.easings === undefined ? {} : { easings: state.animation.easings }),
    ...(state.canvas.animationProperties === undefined ? {} : { properties: state.canvas.animationProperties }),
  },
  ...(canvasSize === undefined ? {} : { canvas: canvasSize }),
  cachePolicy: resolveCachePolicy(state.runtimeMeta),
});

/** 创建 Vanilla adapter 共用的 Core + Render retained Runtime session */
const createVanillaRetainedSessionImplementation = (
  options: CreateRetainedSessionOptions,
): RetainedSessionController => {
  const fixedOptions = captureRetainedMountOptions(options.options);
  const initial = prepareRetainedInput(options.input, fixedOptions);
  const compileDriver = fixedOptions.compileDriver ?? defaultVanillaCompileDriver;
  const hasCustomCompileDriver = fixedOptions.compileDriver !== undefined;
  const compileDriverInstance = Object.freeze({});
  const rendererFactory = options.runtimeOptions.rendererFactory ?? builtinRetainedRendererFactory;
  const { devicePixelRatio: _devicePixelRatio, ...initialCanvas } = fixedOptions.canvas ?? {};
  void _devicePixelRatio;
  const initialMutableOptions = captureRetainedUpdateOptions(
    {
      animation: fixedOptions.animation ?? {},
      ...(options.backend === 'canvas' ? { canvas: initialCanvas } : {}),
    },
    options.backend,
  );
  let state: RetainedSessionState = Object.freeze({
    animation: initialMutableOptions.animation ?? {},
    canvas: ('canvas' in initialMutableOptions ? initialMutableOptions.canvas : undefined) ?? {},
    runtimeMeta: initial.runtimeMeta,
  });
  let handlerContributions: ReadonlyArray<RenderHandlerContribution> = Object.freeze([]);
  let nextRegistration = 0;
  const canvasSize =
    options.backend === 'canvas'
      ? Object.freeze({
          ...(fixedOptions.output?.width === undefined ? {} : { width: fixedOptions.output.width }),
          ...(fixedOptions.output?.height === undefined ? {} : { height: fixedOptions.output.height }),
        })
      : undefined;
  const initialConfig = createRenderConfig(state, handlerContributions, canvasSize);

  /** 一组使用固定 Core Program options 的 Vanilla retained 执行资源 */
  type ActiveRetainedSession = {
    compositeDefinitions: ReturnType<typeof createRetainedCompositeDefinitions>;
    coreProgram: ReturnType<typeof createCoreProgram>;
    participant: ReturnType<typeof createRetainedRenderParticipant>;
    session: RuntimeSession;
    compositeRevision: number;
    compileDriverRevision: number;
    compileSession: VanillaCompileDriverSession;
    driverInput: VanillaCompileDriverInput;
    coreOutput: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>;
  };

  /** 创建并完整提交一组 retained session；失败由 Runtime 回滚宿主内容 */
  const createActiveSession = (
    prepared: PreparedRetainedInput,
    config: RenderRuntimeConfigInput,
  ): ActiveRetainedSession => {
    const compositeDefinitions = createRetainedCompositeDefinitions(prepared.coreOptions.composites);
    const driverInput: VanillaCompileDriverInput = Object.freeze({
      instance: compileDriverInstance,
      source: prepared.source,
      authoringSites: prepared.authoringSites,
      coreOptions: prepared.coreOptions,
    });
    const compileSession = createVanillaCompileDriverSession(compileDriver, driverInput);
    const coreProgram = createCoreProgram(
      { ...prepared.coreOptions, composites: compositeDefinitions.definitions },
      {
        invalidationOwners: [
          VanillaCompositeRevisionOwnerDefinition,
          ...(hasCustomCompileDriver ? [VanillaCompileDriverRevisionOwnerDefinition] : []),
        ],
        observers: compileSession.observers,
      },
    );
    const owners = createRuntimeOwnerRegistry({
      builtins: [
        CoreOwnerDefinition,
        RenderRuntimeOwnerDefinition,
        VanillaCompositeRevisionOwnerDefinition,
        VanillaCompileDriverRevisionOwnerDefinition,
      ],
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [coreProgram] });
    const participant =
      options.backend === 'svg'
        ? createRetainedRenderParticipant({
            backend: 'svg',
            host: options.host,
            rendererFactory,
            immutableOptions: { backend: 'svg', idPrefix: options.idPrefix },
            coreProgram,
            resolveReadonlyLayers: output => resolveVanillaCompileOutput(compileSession, output).layers,
          })
        : createRetainedRenderParticipant({
            backend: 'canvas',
            host: options.host,
            rendererFactory,
            immutableOptions: {
              backend: 'canvas',
              idPrefix: options.idPrefix,
              ...(options.devicePixelRatio === undefined ? {} : { devicePixelRatio: options.devicePixelRatio }),
            },
            coreProgram,
            resolveReadonlyLayers: output => resolveVanillaCompileOutput(compileSession, output).layers,
          });
    const session = createRuntimeSession({
      owners,
      programs,
      updateStrategy: options.runtimeOptions.updateStrategy,
      participants: [participant.participant],
      initialSnapshots: [
        createRuntimeOwnerInput(CoreOwnerDefinition, prepared.source),
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, config),
        createRuntimeOwnerInput(VanillaCompositeRevisionOwnerDefinition, 0),
        createRuntimeOwnerInput(VanillaCompileDriverRevisionOwnerDefinition, 0),
      ],
    });
    const coreOutput = session.artifact(coreProgram).value.output;
    commitVanillaCompileOutput(compileSession, resolveVanillaCompileOutput(compileSession, coreOutput));
    return {
      compositeDefinitions,
      coreProgram,
      participant,
      session,
      compositeRevision: 0,
      compileDriverRevision: 0,
      compileSession,
      driverInput,
      coreOutput,
    };
  };

  const active = createActiveSession(initial, initialConfig);
  let sessionDisposalStarted = false;

  const commitConfig = (
    nextState: RetainedSessionState,
    nextHandlers: ReadonlyArray<RenderHandlerContribution>,
  ): void => {
    active.session.update({
      baseRevision: active.session.revision(),
      owners: [
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, createRenderConfig(nextState, nextHandlers, canvasSize)),
      ],
    });
  };

  return Object.freeze({
    update: (next, updateOptions = {}) => {
      const capturedOptions = captureRetainedUpdateOptions(updateOptions, options.backend);
      const prepared = prepareRetainedInput(next, fixedOptions);
      const nextState = Object.freeze({
        animation: capturedOptions.animation ?? state.animation,
        canvas: ('canvas' in capturedOptions ? capturedOptions.canvas : undefined) ?? state.canvas,
        runtimeMeta: prepared.runtimeMeta,
      });
      const nextDriverInput: VanillaCompileDriverInput = Object.freeze({
        instance: compileDriverInstance,
        source: prepared.source,
        authoringSites: prepared.authoringSites,
        coreOptions: prepared.coreOptions,
      });
      const preparedDefinitions = active.compositeDefinitions.prepare(prepared.coreOptions.composites);
      const previousDriverInput = active.driverInput;
      /** 恢复失败 transaction 前的 driver runtime input，再重新抛出原始失败 */
      const rollbackDriverInput = (cause: unknown): never => {
        preparedDefinitions.rollback();
        try {
          const restored = createVanillaCompileDriverSession(compileDriver, previousDriverInput);
          if (restored !== active.compileSession) {
            throw new Error('Vanilla compile driver restore changed session identity');
          }
        } catch (restoreCause) {
          throw new RetainedRenderError({
            code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
            cause: { cause, restoreCause },
            message: 'Vanilla compile driver input rollback failed',
          });
        }
        throw cause;
      };
      let nextCompileSession: VanillaCompileDriverSession;
      try {
        nextCompileSession = createVanillaCompileDriverSession(compileDriver, nextDriverInput);
      } catch (cause) {
        return rollbackDriverInput(cause);
      }
      if (nextCompileSession !== active.compileSession) {
        return rollbackDriverInput(
          new RetainedRenderError({
            code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
            cause: nextCompileSession,
            message: 'Vanilla compile driver must preserve its session for a retained mount instance',
          }),
        );
      }
      const nextCompositeRevision = preparedDefinitions.changed
        ? active.compositeRevision + 1
        : active.compositeRevision;
      const nextCompileDriverRevision = hasCustomCompileDriver
        ? active.compileDriverRevision + 1
        : active.compileDriverRevision;
      if (!Number.isSafeInteger(nextCompositeRevision)) {
        return rollbackDriverInput(
          new RetainedRenderError({
            code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
            cause: nextCompositeRevision,
            message: 'Vanilla retained composite revision overflow',
          }),
        );
      }
      if (!Number.isSafeInteger(nextCompileDriverRevision)) {
        return rollbackDriverInput(
          new RetainedRenderError({
            code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
            cause: nextCompileDriverRevision,
            message: 'Vanilla compile driver revision overflow',
          }),
        );
      }
      try {
        active.session.update({
          baseRevision: active.session.revision(),
          owners: [
            createRuntimeOwnerUpdate(CoreOwnerDefinition, prepared.source),
            createRuntimeOwnerUpdate(
              RenderRuntimeOwnerDefinition,
              createRenderConfig(nextState, handlerContributions, canvasSize),
            ),
            ...(preparedDefinitions.changed
              ? [createRuntimeOwnerUpdate(VanillaCompositeRevisionOwnerDefinition, nextCompositeRevision)]
              : []),
            ...(hasCustomCompileDriver
              ? [createRuntimeOwnerUpdate(VanillaCompileDriverRevisionOwnerDefinition, nextCompileDriverRevision)]
              : []),
          ],
        });
      } catch (cause) {
        return rollbackDriverInput(cause);
      }
      preparedDefinitions.commit();
      active.compositeRevision = nextCompositeRevision;
      active.compileDriverRevision = nextCompileDriverRevision;
      active.driverInput = nextDriverInput;
      const coreOutput = active.session.artifact(active.coreProgram).value.output;
      if (coreOutput !== active.coreOutput) {
        active.coreOutput = coreOutput;
        commitVanillaCompileOutput(
          active.compileSession,
          resolveVanillaCompileOutput(active.compileSession, coreOutput),
        );
      }
      state = nextState;
    },
    hydrate: hydrateOptions => {
      const registration = nextRegistration;
      if (!Number.isSafeInteger(registration)) throw new Error('Vanilla retained hydration registration overflow');
      const contribution = Object.freeze({ registration, handlers: hydrateOptions.handlers });
      const nextHandlers = Object.freeze([...handlerContributions, contribution]);
      commitConfig(state, nextHandlers);
      handlerContributions =
        active.session.snapshot(RenderRuntimeOwnerDefinition).value.handlerContributions ?? Object.freeze([]);
      nextRegistration += 1;
      let disposed = false;
      return Object.freeze({
        dispose: () => {
          if (disposed) return;
          if (sessionDisposalStarted) {
            disposed = true;
            return;
          }
          const withoutContribution = Object.freeze(
            handlerContributions.filter(candidate => candidate.registration !== registration),
          );
          commitConfig(state, withoutContribution);
          handlerContributions =
            active.session.snapshot(RenderRuntimeOwnerDefinition).value.handlerContributions ?? Object.freeze([]);
          disposed = true;
        },
      });
    },
    dispose: () => {
      sessionDisposalStarted = true;
      active.session.dispose();
    },
    diagnostics: () => active.session.diagnostics(),
    read: () => active.participant.read(active.session),
    scene: () => active.participant.read(active.session).frame.primary.scene as Scene,
    artifacts: () => active.session.artifact(active.coreProgram).value.output.result.artifacts,
    runtimeMeta: () => state.runtimeMeta,
  });
};

/** 创建与后端匹配 update options 的 Vanilla retained session */
export const createVanillaRetainedSession = createVanillaRetainedSessionImplementation as CreateVanillaRetainedSession;
