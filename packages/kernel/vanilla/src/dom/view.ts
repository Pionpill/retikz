import type { IRScene } from '@retikz/core';
import { ReconcilerMode } from '@retikz/reconciler';
import type { ReconcilerDiagnostic } from '@retikz/reconciler';
import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type { RenderHandlerContribution, InputRenderRuntimeConfig } from '@retikz/render/runtime';
import { builtinRetainedRendererFactory, computeDisplaySize, createRetainedRenderTarget } from '@retikz/render/runtime';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputScene } from '../normalize';
import type { SceneInputBindings, RenderOptions } from '../runtime';
import { SceneRuntime } from '../runtime';
import type { MountOptions, ViewUpdateOptions } from './types';

/** 会话输入与所选后端的宿主参数 */
type ViewOptions = Readonly<{
  ir: IRScene;
  bindings?: SceneInputBindings;
  mountOptions: MountOptions;
  idPrefix: string;
}> &
  (
    | Readonly<{ backend: 'svg'; host: SVGSVGElement }>
    | Readonly<{ backend: 'canvas'; host: HTMLCanvasElement; devicePixelRatio?: number }>
  );

/** 根据当前动画、事件和 Canvas 选项构造渲染配置 */
const createRenderConfig = (
  animation: NonNullable<RenderOptions['animation']>,
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
const createViewTarget = (options: ViewOptions, configuration: () => InputRenderRuntimeConfig) => {
  const rendererFactory = options.mountOptions.runtime?.rendererFactory ?? builtinRetainedRendererFactory;
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

/** 创建 SVG 和 Canvas 视图共用的会话操作 */
export const createView = (options: ViewOptions) => {
  const { animation, compile, output } = options.mountOptions;
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

  let render: ReturnType<typeof createViewTarget>;
  const processOptions = {
    compile,
    bindings: options.bindings,
    reconciler: { mode: ReconcilerMode.Incremental, updateStrategy: options.mountOptions.runtime?.updateStrategy },
    createTarget: () => {
      render = createViewTarget(options, () => createRenderConfig(currentAnimation, handlerContributions, canvas));
      return render.target;
    },
  };
  const processing = new SceneRuntime(options.ir, processOptions);

  // 只在 processing 成功发布后同步宿主尺寸，失败事务保留原显示尺寸
  const updateHostSize = (): void => {
    const size = computeDisplaySize(processing.current.compilation.result.scene.layout, width, height);
    if (options.backend === 'svg') {
      options.host.setAttribute('width', String(size.width));
      options.host.setAttribute('height', String(size.height));
    } else {
      options.host.style.width = `${size.width}px`;
      options.host.style.height = `${size.height}px`;
    }
  };

  updateHostSize();

  const commitUpdate = (replace: () => void, updateOptions?: ViewUpdateOptions) => {
    const previousAnimation = currentAnimation;
    currentAnimation = updateOptions?.animation ?? currentAnimation;
    try {
      replace();
      updateHostSize();
    } catch (cause) {
      currentAnimation = previousAnimation;
      throw cause;
    }
  };

  return {
    update: (ir: IRScene, updateOptions?: ViewUpdateOptions) =>
      commitUpdate(() => processing.replace(ir), updateOptions),
    updateInput: (input: InputScene, updateOptions?: ViewUpdateOptions) =>
      commitUpdate(() => processing.replaceInput(input), updateOptions),
    hydrate: ({ handlers }: { handlers: HydrationHandlers }) => {
      const registration = nextRegistration;
      if (!Number.isSafeInteger(registration))
        throw new RetikzVanillaError(RetikzVanillaErrorCode.Dom, 'Vanilla DOM hydration registration overflow');

      const contribution = { registration, handlers };
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
    result: () => processing.current.compilation.result,
  };
};
