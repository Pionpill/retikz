import type { CompileArtifact, Scene } from '@retikz/core';
import type { AnimationControls } from '@retikz/render/animation';

import {
  bindWaapiDescriptors,
  prefersReducedMotion,
  resolveAnimationEnabled,
  sceneHasAnimations,
} from '@retikz/render/animation';
import {
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  locateSvg,
  resolvePointViaLayout,
  resolveSvgElement,
} from '@retikz/render/hydration';
import { RetainedRenderError, RetainedRenderErrorCode } from '@retikz/render/runtime';
import { buildSvgDocument } from '@retikz/render/svg';

import type { VanillaRuntimeMeta } from '../spec';
import type {
  HydrateOptions,
  HydrationHandle,
  MountOptions,
  RetainedRenderInput,
  RetainedSvgView,
  StaticSvgView,
  VanillaView,
} from './types';

import { DEFAULT_ID_PREFIX, VanillaViewMode } from './constants';
import { createVanillaRetainedSession } from './retained-session';
import { applyAttrs, svgNodeToDom } from './svg-dom';
import { createEmptyRuntimeMeta, toSceneResult } from './to-scene';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 把 IR / Scene / plain spec 挂成真实 SVG DOM（无框架浏览器 runtime）
 * @description 输入会先归一成 Scene，再经 `@retikz/render/svg` 生成 SVG 描述并物化进**稳定复用**的 root
 *   `<svg>`；`output.width` / `output.height` 若给则写回根（`@retikz/render/svg` 只产 viewBox，显示尺寸是 adapter 本分）。`update`
 *   原地重渲染、root 元素 identity 跨 update 不变、不失效。DOM 仅在调用时惰性触碰，`import` 本模块不碰 DOM——守 SSR 导入安全
 */
const mountStaticSvg = (container: Element, input: Scene, options: MountOptions): StaticSvgView => {
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountSvg: container must be a DOM Element.');
  }
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  const idPrefix = output.idPrefix ?? DEFAULT_ID_PREFIX;
  const root = document.createElementNS(SVG_NS, 'svg');
  // 未显式配置时跟随系统偏好；显式 enabled 值覆盖系统偏好。
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());
  let animationControls: AnimationControls | undefined;
  let currentScene: Scene;
  let currentArtifacts: ReadonlyArray<CompileArtifact> = Object.freeze([]);
  let currentRuntimeMeta: VanillaRuntimeMeta = createEmptyRuntimeMeta();
  // 存活水合的解绑句柄：view.dispose 时统一解绑（未手动 dispose 的水合也随 view 卸载干净）
  const liveHydrationDisposers = new Set<() => void>();

  const renderInto = (next: Scene): void => {
    const { scene, artifacts, runtimeMeta } = toSceneResult(next, options);
    currentScene = scene;
    currentArtifacts = artifacts;
    currentRuntimeMeta = runtimeMeta;
    const doc = buildSvgDocument(scene, {
      idPrefix,
      animate,
      snapshotAt: animation.snapshotAt,
      easings: animation.easings,
    });
    // 清空 root（子节点 + 自身 attrs），再写新 doc → root 元素复用、引用不失效
    while (root.firstChild) root.removeChild(root.firstChild);
    for (const attr of [...root.attributes]) root.removeAttribute(attr.name);
    applyAttrs(root, doc);
    if (output.width !== undefined) root.setAttribute('width', String(output.width));
    if (output.height !== undefined) root.setAttribute('height', String(output.height));
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
   *   `data-retikz-animation-owner` 双查 `getAnimations()` per-id 控制
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
    mode: VanillaViewMode.Static,
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
    get runtimeMeta() {
      return currentRuntimeMeta;
    },
    get artifacts() {
      return currentArtifacts;
    },
  };
};

/** 把 IR / plain spec 挂成 retained SVG Runtime session */
const mountRetainedSvg = (container: Element, input: RetainedRenderInput, options: MountOptions): RetainedSvgView => {
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountSvg: container must be a DOM Element.');
  }
  const root = document.createElementNS(SVG_NS, 'svg');
  const output = options.output ?? {};
  if (output.width !== undefined) root.setAttribute('width', String(output.width));
  if (output.height !== undefined) root.setAttribute('height', String(output.height));
  const runtime = createVanillaRetainedSession({
    backend: 'svg',
    host: root,
    input,
    options,
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
  });
  container.appendChild(root);
  let disposed = false;
  return {
    mode: VanillaViewMode.Retained,
    root,
    update: (next, updateOptions) => runtime.update(next, updateOptions),
    hydrate: hydrateOptions => runtime.hydrate(hydrateOptions),
    diagnostics: () => runtime.diagnostics(),
    dispose: () => {
      if (disposed) return;
      disposed = true;
      runtime.dispose();
      root.remove();
    },
    get animation() {
      return runtime.read().animation;
    },
    get runtimeMeta() {
      return runtime.runtimeMeta();
    },
    get artifacts() {
      return runtime.artifacts();
    },
  };
};

/** `mountSvg` 的 static / retained 输入重载 */
type MountSvg = {
  (container: Element, input: Scene, options?: MountOptions): StaticSvgView;
  (container: Element, input: RetainedRenderInput, options?: MountOptions): RetainedSvgView;
};

/** 按输入是否已编译，创建 static 或 retained SVG view */
export const mountSvg: MountSvg = ((
  container: Element,
  input: Scene | RetainedRenderInput,
  options: MountOptions = {},
): VanillaView => {
  if ('primitives' in input) {
    if (options.runtime?.rendererFactory !== undefined) {
      throw new RetainedRenderError({
        code: RetainedRenderErrorCode.RetainedRuntimeInputInvalid,
        cause: input,
      });
    }
    return mountStaticSvg(container, input, options);
  }
  return mountRetainedSvg(container, input, options);
}) as MountSvg;
