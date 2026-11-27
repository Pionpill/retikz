import type { IRScene } from '@retikz/core';
import { prefersReducedMotion, resolveAnimationEnabled, subscribeReducedMotion } from '@retikz/render/animation';
import type { HydrationHandlers } from '@retikz/render/hydration';
import type {
  RenderHandlerContribution,
  InputRendererFactory,
  InputRenderRuntimeConfig,
  RenderTarget,
  RendererHost,
} from '@retikz/render/runtime';
import { computeDisplaySize } from '@retikz/render/runtime';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputScene } from '../normalize';
import type { SceneInputBindings, SceneViewOptions } from '../runtime';
import { SceneRuntime } from '../runtime';
import { createDomRenderTarget } from './target';
import type { MountOptions } from './types';

/** 与下一帧场景一起提交的动画配置；Canvas 宿主选项在挂载时确定 */
export type ViewUpdateOptions = Pick<SceneViewOptions, 'animate' | 'snapshotAt'>;

/** 根据当前动画、事件和 Canvas 选项构造渲染配置 */
const createRenderConfig = (
  animation: ViewUpdateOptions,
  handlers: ReadonlyArray<RenderHandlerContribution>,
  canvas: InputRenderRuntimeConfig['canvas'],
): InputRenderRuntimeConfig => {
  return {
    handlerContributions: handlers,
    animation: {
      enabled: resolveAnimationEnabled(animation.animate, prefersReducedMotion()),
      ...(animation.snapshotAt === undefined ? {} : { snapshotAt: animation.snapshotAt }),
    },
    ...(canvas === undefined ? {} : { canvas }),
  };
};

/** 管理一个 DOM 视图的编译、渲染与事件注册会话 */
export class SceneView<TRoot extends RendererHost = RendererHost> {
  private readonly runtime: SceneRuntime;
  private readonly renderer: InputRendererFactory & { readonly host: TRoot };
  private readonly size: Pick<SceneViewOptions, 'width' | 'height'>;
  // SceneRuntime 创建首帧时同步建立渲染目标
  private render!: RenderTarget;
  private currentAnimation: ViewUpdateOptions;
  private handlerContributions: ReadonlyArray<RenderHandlerContribution> = [];
  private nextRegistration = 0;
  private unsubscribeMotion?: () => void;
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
    const { animate, snapshotAt, compile, width, height, reconciler, rendererFactory, handlers } = mountOptions;
    this.renderer = renderer;
    this.size = { width, height };
    this.currentAnimation = { animate, snapshotAt };
    if (handlers !== undefined) this.handlerContributions = [{ registration: this.nextRegistration++, handlers }];
    const canvas =
      renderer.backend === 'canvas'
        ? {
            width: typeof width === 'number' ? width : undefined,
            height: typeof height === 'number' ? height : undefined,
          }
        : undefined;

    this.runtime = new SceneRuntime(ir, {
      compile,
      bindings,
      reconciler,
      createTarget: () => {
        this.render = createDomRenderTarget(
          renderer,
          () => createRenderConfig(this.currentAnimation, this.handlerContributions, canvas),
          rendererFactory,
        );
        return this.render.target;
      },
    });
    this.updateHostSize();
    this.syncMotionSubscription();
  }

  /** 用完整 IR 或作者输入替换场景，并原子应用本次动画配置 */
  replace(source: IRScene | InputScene, options?: ViewUpdateOptions) {
    const previousAnimation = this.currentAnimation;
    this.currentAnimation = options === undefined ? previousAnimation : { ...previousAnimation, ...options };
    try {
      this.runtime.replace(source);
      this.updateHostSize();
      this.syncMotionSubscription();
    } catch (cause) {
      this.currentAnimation = previousAnimation;
      throw cause;
    }
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
    return this.runtime.diagnostics();
  }

  /** 释放会话资源并移除根元素，重复调用不再卸载 */
  dispose() {
    this.unsubscribeMotion?.();
    this.unsubscribeMotion = undefined;
    this.runtime.dispose();
    if (this.rootRemoved) return;
    this.root.remove();
    this.rootRemoved = true;
  }

  private syncMotionSubscription() {
    if (this.currentAnimation.animate === undefined && this.currentAnimation.snapshotAt === undefined) {
      this.unsubscribeMotion ??= subscribeReducedMotion(() => this.runtime.updateTarget());
    } else {
      this.unsubscribeMotion?.();
      this.unsubscribeMotion = undefined;
    }
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
      renderer.host.style.width = typeof displaySize.width === 'number' ? `${displaySize.width}px` : displaySize.width;
      renderer.host.style.height =
        typeof displaySize.height === 'number' ? `${displaySize.height}px` : displaySize.height;
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
