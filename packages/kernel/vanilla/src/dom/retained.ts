import type { IRScene } from '@retikz/core';
import type { ReconcilerResult } from '@retikz/reconciler';
import { ReconcilerMode } from '@retikz/reconciler';
import type { ReconcilerDiagnostic } from '@retikz/reconciler';
import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import type { RenderHandlerContribution, InputRenderRuntimeConfig, RetainedRendererRead } from '@retikz/render/runtime';
import { builtinRetainedRendererFactory, createRetainedRenderTarget } from '@retikz/render/runtime';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputScene } from '../normalize';
import { isInputScene } from '../normalize';
import { SceneRuntime } from '../runtime';
import { calculateDisplaySize } from './display-size';
import type {
  CommonOptions,
  HydrateOptions,
  HydrationHandle,
  RetainedCanvasUpdateOptions,
  RetainedMountCanvasOptions,
  RetainedMountOptions,
  RetainedSvgUpdateOptions,
  VanillaRetainedRuntimeOptions,
} from './types';

type SvgRetainedRuntimeOptions = Readonly<{
  /** 要创建的 renderer 后端 */
  backend: 'svg';
  /** retained renderer 独占的宿主根元素 */
  host: SVGSVGElement;
  /** 初始完整 IR 或 InputScene */
  input: InputScene | IRScene;
  /** runtime-lifetime mount 配置 */
  options: RetainedMountOptions;
  /** 本次挂载使用的 retained Runtime 配置 */
  runtimeOptions: VanillaRetainedRuntimeOptions;
  /** SSR 与资源引用共用的稳定 id 前缀 */
  idPrefix: string;
}>;

type CanvasRetainedRuntimeOptions = Readonly<{
  /** 要创建的 renderer 后端 */
  backend: 'canvas';
  /** retained renderer 独占的宿主根元素 */
  host: HTMLCanvasElement;
  /** 初始完整 IR 或 InputScene */
  input: InputScene | IRScene;
  /** runtime-lifetime mount 配置 */
  options: RetainedMountCanvasOptions;
  /** 本次挂载使用的 retained Runtime 配置 */
  runtimeOptions: VanillaRetainedRuntimeOptions;
  /** SSR 与资源引用共用的稳定 id 前缀 */
  idPrefix: string;
  /** Canvas runtime-lifetime 设备像素比 */
  devicePixelRatio?: number;
}>;

type RetainedRuntimeOptions = SvgRetainedRuntimeOptions | CanvasRetainedRuntimeOptions;

type RetainedProcessingControllerFactory = {
  /** 创建 SVG retained processing controller */
  (options: SvgRetainedRuntimeOptions): DomRetainedProcessingController<RetainedSvgUpdateOptions>;
  /** 创建 Canvas retained processing controller */
  (options: CanvasRetainedRuntimeOptions): DomRetainedProcessingController<RetainedCanvasUpdateOptions>;
};

/** DOM 子入口使用的 retained processing 控制面 */
type DomRetainedProcessingController<TUpdateOptions extends RetainedSvgUpdateOptions | RetainedCanvasUpdateOptions> =
  Readonly<{
    /** 原子提交下一份 InputScene 或 Source IR 与 renderer 可变配置 */
    update: (source: InputScene | IRScene, options?: TUpdateOptions) => void;
    /** 向当前提交帧注册 hydration handlers */
    hydrate: (options: HydrateOptions) => HydrationHandle;
    /** 释放 processing runtime 与已挂载 renderer */
    dispose: () => void;
    /** 读取并清空 Runtime 诊断 */
    diagnostics: () => ReadonlyArray<ReconcilerDiagnostic>;
    /** 读取当前 committed renderer 状态 */
    read: () => RetainedRendererRead;
    /** 读取当前 committed processing result */
    result: () => ReconcilerResult;
  }>;

/** 将当前 retained state 收敛为 Render Runtime config */
const createRenderConfig = (
  animation: NonNullable<CommonOptions['animation']>,
  handlers: ReadonlyArray<RenderHandlerContribution>,
  canvas: InputRenderRuntimeConfig['canvas'],
): InputRenderRuntimeConfig => {
  return {
    handlerContributions: handlers,
    animation: {
      enabled: resolveAnimationEnabled(animation.enabled, prefersReducedMotion()),
      ...(animation.snapshotAt === undefined ? {} : { snapshotAt: animation.snapshotAt }),
    },
    ...(canvas === undefined ? {} : { canvas }),
  };
};

/** 按宿主后端创建单个保留式渲染目标 */
const createRenderTarget = (options: RetainedRuntimeOptions, configuration: () => InputRenderRuntimeConfig) => {
  const rendererFactory = options.runtimeOptions.rendererFactory ?? builtinRetainedRendererFactory;
  return options.backend === 'svg'
    ? createRetainedRenderTarget({
        backend: 'svg',
        host: options.host,
        rendererFactory,
        immutableOptions: { backend: 'svg', idPrefix: options.idPrefix },
        configuration,
      })
    : createRetainedRenderTarget({
        backend: 'canvas',
        host: options.host,
        rendererFactory,
        immutableOptions: {
          backend: 'canvas',
          idPrefix: options.idPrefix,
          ...(options.devicePixelRatio === undefined ? {} : { devicePixelRatio: options.devicePixelRatio }),
        },
        configuration,
      });
};

/** 创建 DOM 子入口使用的 retained processing controller */
const createRetainedProcessingControllerImplementation = (
  options: RetainedRuntimeOptions,
): DomRetainedProcessingController<RetainedSvgUpdateOptions | RetainedCanvasUpdateOptions> => {
  const { animation, compile, output } = options.options;
  const { width, height } = output ?? {};
  let currentAnimation = animation ?? {};
  let handlerContributions: ReadonlyArray<RenderHandlerContribution> = [];
  let nextRegistration = 0;

  const canvas =
    options.backend === 'canvas'
      ? {
          ...(width === undefined ? {} : { width }),
          ...(height === undefined ? {} : { height }),
        }
      : undefined;

  let render: ReturnType<typeof createRenderTarget>;
  const processOptions = {
    compile,
    reconciler: { mode: ReconcilerMode.Incremental, updateStrategy: options.runtimeOptions.updateStrategy },
    createTarget: () => {
      render = createRenderTarget(options, () => createRenderConfig(currentAnimation, handlerContributions, canvas));
      return render.target;
    },
  };
  const processing = isInputScene(options.input)
    ? SceneRuntime.fromInput(options.input, processOptions)
    : new SceneRuntime(options.input, processOptions);

  // 只在 processing 成功发布后同步宿主尺寸，失败事务保留原显示尺寸
  const updateHostSize = (): void => {
    const size = calculateDisplaySize(processing.current.compilation.result.scene.layout, width, height);
    if (options.backend === 'svg') {
      options.host.setAttribute('width', String(size.width));
      options.host.setAttribute('height', String(size.height));
    } else {
      options.host.style.width = `${size.width}px`;
      options.host.style.height = `${size.height}px`;
    }
  };

  updateHostSize();

  return {
    update: (next, updateOptions = {}) => {
      const previousAnimation = currentAnimation;
      currentAnimation = updateOptions.animation ?? currentAnimation;
      try {
        if (isInputScene(next)) processing.replaceInput(next);
        else processing.replace(next);
        updateHostSize();
      } catch (cause) {
        currentAnimation = previousAnimation;
        throw cause;
      }
    },
    hydrate: (hydrateOptions: HydrateOptions): HydrationHandle => {
      const registration = nextRegistration;
      if (!Number.isSafeInteger(registration))
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Dom, 'Vanilla retained hydration registration overflow');

      const contribution = { registration, handlers: hydrateOptions.handlers };
      const previousHandlers = handlerContributions;
      handlerContributions = [...handlerContributions, contribution];

      try {
        processing.updateTarget();
      } catch (cause) {
        handlerContributions = previousHandlers;
        throw cause;
      }

      nextRegistration += 1;
      let disposed = false;

      return {
        dispose: () => {
          if (disposed) return;

          const handlersBeforeDispose = handlerContributions;
          handlerContributions = handlerContributions.filter(candidate => candidate.registration !== registration);

          try {
            processing.updateTarget();
          } catch (cause) {
            handlerContributions = handlersBeforeDispose;
            throw cause;
          }

          disposed = true;
        },
      };
    },
    dispose: () => processing.dispose(),
    diagnostics: () => processing.diagnostics() as ReadonlyArray<ReconcilerDiagnostic>,
    read: () => render.read(),
    result: () => processing.current,
  };
};

/** 创建与后端匹配 update options 的 retained processing controller */
export const createRetainedProcessingController =
  createRetainedProcessingControllerImplementation as RetainedProcessingControllerFactory;
