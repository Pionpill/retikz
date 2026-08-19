import type { AnyCompositeDefinition } from '@retikz/core';
import type { RenderHandlerContribution, RenderRuntimeConfigInput, RetainedRendererRead } from '@retikz/render/runtime';
import type { RuntimeDiagnostic } from '@retikz/runtime';

import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import {
  builtinRetainedRendererFactory,
  createRetainedRenderParticipant,
  RenderCachePolicy,
  RenderRuntimeOwnerDefinition,
} from '@retikz/render/runtime';
import { createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '@retikz/runtime';

import type { InputRuntimeMeta } from '../normalize';
import type {
  InternalProcessingController,
  ProcessingParticipantUpdateInput,
  ProcessingTransactionParticipant,
  ProcessingTransactionParticipantFactory,
} from '../processing/internal/types';
import type { ProcessingOptions, ProcessingResult } from '../processing/types';
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
  VanillaAnimationOptions,
  VanillaRetainedRuntimeOptions,
} from '../runtime/types';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import { InputLayerCache } from '../normalize';
import { createEmptyInputRuntimeMetaSnapshot } from '../normalize/scene/runtime-meta';
import { createDomProcessingController } from '../processing/internal/controller';
import { captureRetainedUpdateOptions } from '../runtime/retained-update-options';

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
  const adapters = options.adapters?.map(adapter => Object.freeze({ kind: adapter.kind, lower: adapter.lower }));
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

/** 把 Vanilla layer hints 保守折叠为 Render cache policy */
const resolveCachePolicy = (runtimeMeta: InputRuntimeMeta): 'auto' | 'static' | 'dynamic' => {
  if (runtimeMeta.layers.some(layer => layer.cache === InputLayerCache.Dynamic)) return RenderCachePolicy.Dynamic;
  if (runtimeMeta.layers.length > 0 && runtimeMeta.layers.every(layer => layer.cache === InputLayerCache.Static)) {
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
  runtimeMeta: InputRuntimeMeta;
}>;

type CreateSvgRetainedSessionOptions = Readonly<{
  /** 要创建的 renderer 后端 */
  backend: 'svg';
  /** retained renderer 独占的宿主根元素 */
  host: SVGSVGElement;
  /** 初始完整 IR 或 InputScene */
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
  /** 初始完整 IR 或 InputScene */
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

type CreateRetainedProcessingController = {
  /** 创建 SVG retained processing controller */
  (options: CreateSvgRetainedSessionOptions): DomRetainedProcessingController<RetainedSvgUpdateOptions>;
  /** 创建 Canvas retained processing controller */
  (options: CreateCanvasRetainedSessionOptions): DomRetainedProcessingController<RetainedCanvasUpdateOptions>;
};

/** DOM 子入口使用的 retained processing 控制面 */
type DomRetainedProcessingController<TUpdateOptions extends RetainedSvgUpdateOptions | RetainedCanvasUpdateOptions> =
  Readonly<{
    /** 原子提交下一份 InputScene 或 Source IR 与 renderer 可变配置 */
    update: (source: RetainedRenderInput, options?: TUpdateOptions) => void;
    /** 向当前提交帧注册 hydration handlers */
    hydrate: (options: HydrateOptions) => HydrationHandle;
    /** 释放 processing session 与已挂载 renderer */
    dispose: () => void;
    /** 读取并清空 Runtime 诊断 */
    diagnostics: () => ReadonlyArray<RuntimeDiagnostic>;
    /** 读取当前 committed renderer 状态 */
    read: () => RetainedRendererRead;
    /** 读取当前 committed processing result */
    result: () => ProcessingResult;
  }>;

/** 移除 direct compile 专属 trace，构造 session-lifetime processing options */
const toProcessingOptions = (
  options: CommonOptions,
  updateStrategy: VanillaRetainedRuntimeOptions['updateStrategy'],
): ProcessingOptions => {
  const { trace, ...compile } = options.compile ?? {};
  void trace;
  return {
    compile,
    adapters: options.adapters,
    compileDriver: options.compileDriver,
    updateStrategy,
  };
};

/** 复制并冻结 hydration handlers，避免调用方 mutation 改写已提交配置 */
const captureHydrationHandlers = (handlers: HydrateOptions['handlers']): HydrateOptions['handlers'] =>
  Object.freeze(
    Object.fromEntries(Object.entries(handlers).map(([identity, events]) => [identity, Object.freeze({ ...events })])),
  );

/** 将当前 retained state 收敛为 Render Runtime config */
const createRenderConfig = (
  state: RetainedSessionState,
  handlers: ReadonlyArray<RenderHandlerContribution>,
  canvas: RenderRuntimeConfigInput['canvas'],
): RenderRuntimeConfigInput => ({
  handlerContributions: handlers,
  animation: {
    enabled: resolveAnimationEnabled(state.animation.enabled, prefersReducedMotion()),
    ...(state.animation.snapshotAt === undefined ? {} : { snapshotAt: state.animation.snapshotAt }),
    ...(state.animation.easings === undefined ? {} : { easings: state.animation.easings }),
    ...(state.canvas.animationProperties === undefined ? {} : { properties: state.canvas.animationProperties }),
  },
  ...(canvas === undefined ? {} : { canvas }),
  cachePolicy: resolveCachePolicy(state.runtimeMeta),
});

/** 创建 DOM 子入口固定注入的 Render participant factory */
const createRenderParticipantFactory = (
  options: CreateRetainedSessionOptions,
  initialState: RetainedSessionState,
  canvas: RenderRuntimeConfigInput['canvas'],
  state: () => RetainedSessionState,
  handlers: () => ReadonlyArray<RenderHandlerContribution>,
): Readonly<{
  factory: ProcessingTransactionParticipantFactory;
  read: () => RetainedRendererRead;
  updateConfig: (input: ProcessingParticipantUpdateInput) => ReadonlyArray<ReturnType<typeof createRuntimeOwnerUpdate>>;
}> => {
  let lease: ReturnType<typeof createRetainedRenderParticipant>['lease'] | undefined;
  let active:
    | Readonly<{
        read: () => RetainedRendererRead;
        updateConfig: (
          input: ProcessingParticipantUpdateInput,
        ) => ReadonlyArray<ReturnType<typeof createRuntimeOwnerUpdate>>;
      }>
    | undefined;
  const factory: ProcessingTransactionParticipantFactory = context => {
    const rendererFactory = options.runtimeOptions.rendererFactory ?? builtinRetainedRendererFactory;
    const renderer =
      options.backend === 'svg'
        ? createRetainedRenderParticipant({
            backend: 'svg',
            host: options.host,
            rendererFactory,
            immutableOptions: { backend: 'svg', idPrefix: options.idPrefix },
            coreProgram: context.coreProgram,
            resolveReadonlyLayers: context.resolveReadonlyLayers,
            ...(lease === undefined ? {} : { rendererLease: lease }),
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
            coreProgram: context.coreProgram,
            resolveReadonlyLayers: context.resolveReadonlyLayers,
            ...(lease === undefined ? {} : { rendererLease: lease }),
          });
    let current = Object.freeze({ ...initialState, runtimeMeta: context.initial.runtimeMeta });
    let currentHandlers = handlers();
    const updateConfig = (
      input: ProcessingParticipantUpdateInput,
    ): ReadonlyArray<ReturnType<typeof createRuntimeOwnerUpdate>> => {
      current =
        input.kind === 'source' ? Object.freeze({ ...state(), runtimeMeta: input.prepared.runtimeMeta }) : state();
      currentHandlers = handlers();
      return Object.freeze([
        createRuntimeOwnerUpdate(RenderRuntimeOwnerDefinition, createRenderConfig(current, currentHandlers, canvas)),
      ]);
    };
    return Object.freeze({
      owners: Object.freeze([RenderRuntimeOwnerDefinition]),
      initialSnapshots: Object.freeze([
        createRuntimeOwnerInput(RenderRuntimeOwnerDefinition, createRenderConfig(current, currentHandlers, canvas)),
      ]),
      participant: renderer.participant,
      update: input => updateConfig(input),
      connect: nextSession => {
        lease = renderer.lease;
        active = Object.freeze({
          read: () => renderer.read(nextSession),
          updateConfig,
        });
      },
      updateParticipant: revision =>
        updateConfig({
          prepared: context.initial,
          revision,
          kind: 'participant',
        }),
    }) satisfies ProcessingTransactionParticipant;
  };
  return Object.freeze({
    factory,
    read: () => {
      if (active === undefined)
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Dom, 'Vanilla DOM retained renderer is unavailable');
      return active.read();
    },
    updateConfig: input => active?.updateConfig(input) ?? Object.freeze([]),
  });
};

/** 创建 DOM 子入口使用的 retained processing controller */
const createRetainedProcessingControllerImplementation = (
  options: CreateRetainedSessionOptions,
): DomRetainedProcessingController<RetainedSvgUpdateOptions | RetainedCanvasUpdateOptions> => {
  const fixedOptions = captureRetainedMountOptions(options.options);
  const { devicePixelRatio: _devicePixelRatio, ...initialCanvas } = fixedOptions.canvas ?? {};
  void _devicePixelRatio;
  const initialMutableOptions = captureRetainedUpdateOptions({
    animation: fixedOptions.animation ?? {},
    ...(options.backend === 'canvas' ? { canvas: initialCanvas } : {}),
  });
  let state: RetainedSessionState = Object.freeze({
    animation: initialMutableOptions.animation ?? {},
    canvas: ('canvas' in initialMutableOptions ? initialMutableOptions.canvas : undefined) ?? {},
    runtimeMeta: createEmptyInputRuntimeMetaSnapshot(),
  });
  let handlerContributions: ReadonlyArray<RenderHandlerContribution> = Object.freeze([]);
  let nextRegistration = 0;
  const canvas =
    options.backend === 'canvas'
      ? Object.freeze({
          ...(fixedOptions.output?.width === undefined ? {} : { width: fixedOptions.output.width }),
          ...(fixedOptions.output?.height === undefined ? {} : { height: fixedOptions.output.height }),
        })
      : undefined;
  const render = createRenderParticipantFactory(
    options,
    state,
    canvas,
    () => state,
    () => handlerContributions,
  );
  const processing: InternalProcessingController = createDomProcessingController(
    options.input,
    toProcessingOptions(fixedOptions, options.runtimeOptions.updateStrategy),
    render.factory,
  );
  state = Object.freeze({ ...state, runtimeMeta: processing.read().runtimeMeta });

  return Object.freeze({
    update: (next, updateOptions = {}) => {
      const captured = captureRetainedUpdateOptions(updateOptions);
      const previousState = state;
      state = Object.freeze({
        animation: captured.animation ?? state.animation,
        canvas: ('canvas' in captured ? captured.canvas : undefined) ?? state.canvas,
        runtimeMeta: state.runtimeMeta,
      });
      try {
        processing.update(next);
        state = Object.freeze({ ...state, runtimeMeta: processing.read().runtimeMeta });
      } catch (cause) {
        state = previousState;
        throw cause;
      }
    },
    hydrate: (hydrateOptions: HydrateOptions): HydrationHandle => {
      const registration = nextRegistration;
      if (!Number.isSafeInteger(registration))
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Dom, 'Vanilla retained hydration registration overflow');
      const contribution = Object.freeze({ registration, handlers: captureHydrationHandlers(hydrateOptions.handlers) });
      const previousHandlers = handlerContributions;
      handlerContributions = Object.freeze([...handlerContributions, contribution]);
      try {
        processing.updateParticipant();
      } catch (cause) {
        handlerContributions = previousHandlers;
        throw cause;
      }
      nextRegistration += 1;
      let disposed = false;
      return Object.freeze({
        dispose: () => {
          if (disposed) return;
          const handlersBeforeDispose = handlerContributions;
          handlerContributions = Object.freeze(
            handlerContributions.filter(candidate => candidate.registration !== registration),
          );
          try {
            processing.updateParticipant();
          } catch (cause) {
            handlerContributions = handlersBeforeDispose;
            throw cause;
          }
          disposed = true;
        },
      });
    },
    dispose: processing.dispose,
    diagnostics: processing.diagnostics as () => ReadonlyArray<RuntimeDiagnostic>,
    read: () => render.read(),
    result: processing.read,
  });
};

/** 创建与后端匹配 update options 的 retained processing controller */
export const createRetainedProcessingController =
  createRetainedProcessingControllerImplementation as CreateRetainedProcessingController;
