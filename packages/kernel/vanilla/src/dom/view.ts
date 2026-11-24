import type { IRScene } from '@retikz/core';
import { ReconcilerMode } from '@retikz/reconciler';
import type { ReconcilerDiagnostic } from '@retikz/reconciler';
import { prefersReducedMotion, resolveAnimationEnabled } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type {
  RenderHandlerContribution,
  InputRendererFactory,
  InputRenderRuntimeConfig,
  RenderTarget,
  RendererHost,
} from '@retikz/render/runtime';
import { builtinRendererFactory, computeDisplaySize, createRenderTarget } from '@retikz/render/runtime';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputScene } from '../normalize';
import type { SceneInputBindings, RenderOptions } from '../runtime';
import { SceneRuntime } from '../runtime';
import type { MountOptions } from './types';

/** 与下一帧场景一起提交的动画配置；Canvas 宿主选项在挂载时确定 */
export type ViewUpdateOptions = Readonly<{ animation?: RenderOptions['animation'] }>;

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

/** 管理一个 DOM 视图的编译、渲染与事件注册会话 */
export class SceneView<TRoot extends RendererHost = RendererHost> {
  private readonly runtime: SceneRuntime;
  private readonly renderer: InputRendererFactory & { readonly host: TRoot };
  private readonly size: Readonly<{ width?: number; height?: number }>;
  // SceneRuntime 创建首帧时同步建立渲染目标
  private render!: RenderTarget;
  private currentAnimation: NonNullable<RenderOptions['animation']>;
  private handlerContributions: ReadonlyArray<RenderHandlerContribution> = [];
  private nextRegistration = 0;
  private rootRemoved = false;

  /** 视图挂载的根元素 */
  get root(): TRoot {
    return this.renderer.host;
  }

  /** 最近一次成功提交的编译结果 */
  get compileResult() {
    return this.runtime.current.compilation.result;
  }

  /** 当前帧可用的动画控制 */
  get animation() {
    return this.render.read().animation;
  }

  constructor(
    ir: IRScene,
    mountOptions: MountOptions,
    renderer: InputRendererFactory & { readonly host: TRoot },
    bindings?: SceneInputBindings,
  ) {
    const { animation, compile, output, runtime } = mountOptions;
    this.renderer = renderer;
    this.update = this.update.bind(this);
    this.updateInput = this.updateInput.bind(this);
    this.hydrate = this.hydrate.bind(this);
    this.diagnostics = this.diagnostics.bind(this);
    this.dispose = this.dispose.bind(this);
    const { width, height } = output ?? {};
    this.size = {
      ...(width === undefined ? {} : { width }),
      ...(height === undefined ? {} : { height }),
    };
    this.currentAnimation = animation ?? {};
    const canvas = renderer.backend === 'canvas' ? this.size : undefined;

    this.runtime = new SceneRuntime(ir, {
      compile,
      bindings,
      reconciler: { mode: ReconcilerMode.Incremental, updateStrategy: runtime?.updateStrategy },
      createTarget: () => {
        this.render = createRenderTarget({
          ...renderer,
          rendererFactory: runtime?.rendererFactory ?? builtinRendererFactory,
          configuration: () => createRenderConfig(this.currentAnimation, this.handlerContributions, canvas),
        });
        return this.render.target;
      },
    });
    this.updateHostSize();
  }

  /** 提交下一份 IR 与可选动画配置 */
  update(ir: IRScene, options?: ViewUpdateOptions) {
    return this.commitUpdate(() => this.runtime.replace(ir), options);
  }

  /** 归一化作者输入并提交更新 */
  updateInput(input: InputScene, options?: ViewUpdateOptions) {
    return this.commitUpdate(() => this.runtime.replaceInput(input), options);
  }

  /** 注册事件处理函数，返回仅用于解除本次注册的句柄 */
  hydrate({ handlers }: { handlers: HydrationHandlers }) {
    const registration = this.nextRegistration;
    if (!Number.isSafeInteger(registration))
      throw new RetikzVanillaError(RetikzVanillaErrorCode.Dom, 'Vanilla DOM hydration registration overflow');

    this.commitHandlers([...this.handlerContributions, { registration, handlers }]);
    this.nextRegistration += 1;
    let disposed = false;
    return {
      dispose: () => {
        if (disposed) return;
        this.commitHandlers(this.handlerContributions.filter(candidate => candidate.registration !== registration));
        disposed = true;
      },
    };
  }

  /** 读取并清空会话诊断 */
  diagnostics() {
    return this.runtime.diagnostics() as ReadonlyArray<ReconcilerDiagnostic>;
  }

  /** 释放会话资源并移除根元素，重复调用不再卸载 */
  dispose() {
    this.runtime.dispose();
    if (this.rootRemoved) return;
    this.root.remove();
    this.rootRemoved = true;
  }

  /** 仅在编译结果成功提交后同步宿主尺寸 */
  private updateHostSize() {
    const { width, height } = this.size;
    const displaySize = computeDisplaySize(this.compileResult.scene.layout, width, height);
    const { renderer } = this;
    if (renderer.backend === 'svg') {
      renderer.host.setAttribute('width', String(displaySize.width));
      renderer.host.setAttribute('height', String(displaySize.height));
    } else {
      renderer.host.style.width = `${displaySize.width}px`;
      renderer.host.style.height = `${displaySize.height}px`;
    }
  }

  /** 随场景更新应用动画配置，失败时恢复旧配置 */
  private commitUpdate(replace: () => void, options?: ViewUpdateOptions) {
    const previousAnimation = this.currentAnimation;
    this.currentAnimation = options?.animation ?? previousAnimation;
    try {
      replace();
      this.updateHostSize();
    } catch (cause) {
      this.currentAnimation = previousAnimation;
      throw cause;
    }
  }

  /** 将事件注册或解绑提交给渲染目标，失败时保留原注册 */
  private commitHandlers(next: ReadonlyArray<RenderHandlerContribution>) {
    const previous = this.handlerContributions;
    this.handlerContributions = next;
    try {
      this.runtime.updateTarget();
    } catch (cause) {
      this.handlerContributions = previous;
      throw cause;
    }
  }
}
