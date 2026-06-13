import type { Scene } from '@retikz/core';
import { buildSvgDocument } from '@retikz/render/svg';
import { type AnimationControls, bindWaapiDescriptors, prefersReducedMotion, sceneHasAnimations } from '@retikz/render/animation';
import {
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  locateSvg,
  resolvePointViaLayout,
  resolveSvgElement,
} from '@retikz/render/hydration';
import { isFigure } from './builder/isFigure';
import { DEFAULT_ID_PREFIX } from './constants';
import { applyAttrs, svgNodeToDom } from './svgNodeToDom';
import { toScene } from './toScene';
import type { HydrateOptions, HydrationHandle, MountOptions, RenderInput, VanillaView } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 把 IR / Scene / Figure 挂成真实 SVG DOM（无框架浏览器 runtime）
 * @description 收 `Figure` 时 delegate 给 `figure.mount`（Figure 自持 config，call-site options 覆盖）。收
 *   IR/Scene 时：`toScene`（收 ir 时 compile）→ `buildSvgDocument`（`@retikz/render/svg`）→ 物化进**稳定复用**的 root
 *   `<svg>`；`width`/`height` 若给则写回根（`@retikz/render/svg` 只产 viewBox，显示尺寸是 adapter 本分）。`update`
 *   原地重渲染、root 元素 identity 跨 update 不变、不失效。DOM 仅在调用时惰性触碰，`import` 本模块不碰 DOM——守 SSR 导入安全。
 */
export const mountSvg = (container: Element, input: RenderInput, options: MountOptions = {}): VanillaView => {
  if (isFigure(input)) return input.mount(container, options);
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountSvg: container must be a DOM Element.');
  }
  const idPrefix = options.idPrefix ?? DEFAULT_ID_PREFIX;
  const root = document.createElementNS(SVG_NS, 'svg');
  // 动画总关：{animate:false} 或 prefers-reduced-motion → 渲染 base 静态（不 emit CSS/WAAPI）
  const animate = options.animate !== false && !prefersReducedMotion();
  let animationControls: AnimationControls | undefined;
  let currentScene: Scene;
  // 存活水合的解绑句柄：view.dispose 时统一解绑（未手动 dispose 的水合也随 view 卸载干净）
  const liveHydrationDisposers = new Set<() => void>();

  const renderInto = (next: RenderInput): void => {
    if (isFigure(next)) {
      throw new Error('mountSvg: view.update does not accept a Figure; pass figure.ir instead.');
    }
    const scene: Scene = toScene(next, options);
    currentScene = scene;
    const doc = buildSvgDocument(scene, { idPrefix, animate, snapshotAt: options.snapshotAt, easings: options.easings });
    // 清空 root（子节点 + 自身 attrs），再写新 doc → root 元素复用、引用不失效
    while (root.firstChild) root.removeChild(root.firstChild);
    for (const attr of [...root.attributes]) root.removeAttribute(attr.name);
    applyAttrs(root, doc);
    if (options.width !== undefined) root.setAttribute('width', String(options.width));
    if (options.height !== undefined) root.setAttribute('height', String(options.height));
    for (const child of doc.children ?? []) {
      root.appendChild(typeof child === 'string' ? document.createTextNode(child) : svgNodeToDom(child));
    }
    // load track 已由 CSS 自播；交互 track（visible / manual / onEvent）经 WAAPI 桥按 trigger 接驱动
    animationControls?.dispose();
    animationControls = animate && sceneHasAnimations(scene) ? bindWaapiDescriptors(root) : undefined;
  };

  renderInto(input);
  container.appendChild(root);

  /**
   * 把 handler 绑到本 view 的 `<svg>`，handler 收 `(event, context)` 富上下文
   * @description `buildContext` 读 live `currentScene`（`update` 后自动反映新图）：meta / geometry 经 Scene 按 id
   *   聚合查询，element 经 `closest('[data-retikz-id]')`，point 逆 meet-fit，动画控制经 `data-retikz-id` /
   *   `data-retikz-animation-owner` 双查 `getAnimations()` per-id 控制。
   */
  const hydrate = (hydrateOptions: HydrateOptions): HydrationHandle => {
    const buildContext = createContextBuilder({
      renderer: 'svg',
      root,
      scene: () => currentScene,
      resolveElement: resolveSvgElement,
      resolvePoint: event => resolvePointViaLayout(root, currentScene.layout)(event),
      makeAnimation: id => createSvgAnimationControls(root, id),
    });
    const controller = createHydrationController(root, hydrateOptions.handlers, locateSvg, buildContext);
    const dispose = (): void => {
      controller.dispose();
      liveHydrationDisposers.delete(dispose);
    };
    liveHydrationDisposers.add(dispose);
    return { dispose };
  };

  let disposed = false;
  return {
    root,
    update(next) {
      if (disposed) throw new Error('mountSvg: view already disposed.');
      renderInto(next);
    },
    hydrate,
    dispose() {
      if (disposed) return;
      disposed = true;
      // 统一解绑未手动 dispose 的水合（与文档「解绑水合」一致），再清动画 / 移除 root
      for (const disposeHydration of [...liveHydrationDisposers]) disposeHydration();
      animationControls?.dispose();
      root.remove();
    },
    get animation() {
      return animationControls;
    },
  };
};
