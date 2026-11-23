import type { IRScene, Scene } from '@retikz/core';
import type { CompileResult } from '@retikz/reconciler';
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
import { buildSvgDocument } from '@retikz/render/svg';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../error';
import type { InputScene } from '../normalize';
import { DEFAULT_ID_PREFIX } from '../runtime';
import { VanillaViewMode } from './constants';
import { calculateDisplaySize } from './display-size';
import { createRetainedProcessingController } from './retained';
import { resolveStaticMountScene, EMPTY_ARTIFACTS } from './static-scene';
import { applyAttrs, svgNodeToDom } from './svg-dom';
import type {
  HydrateOptions,
  HydrationHandle,
  MountOptions,
  RawStaticMountOptions,
  RetainedMountOptions,
  RetainedSvgView,
  StaticMountOptions,
  StaticRawSvgView,
  StaticSvgView,
  VanillaRetainedRuntimeOptions,
  VanillaView,
} from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 把 IR / Scene / InputScene 挂成真实 SVG DOM（无框架浏览器 runtime）
 * @description 输入会先归一成 Scene，再经 `@retikz/render/svg` 生成 SVG 描述并物化进稳定复用的 root `<svg>`
 */
const mountStaticSvg = (
  container: Element,
  input: Scene | InputScene | IRScene,
  options: StaticMountOptions | RawStaticMountOptions,
): StaticSvgView | StaticRawSvgView => {
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  const idPrefix = output.idPrefix ?? DEFAULT_ID_PREFIX;
  const root = document.createElementNS(SVG_NS, 'svg');
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());
  let animationControls: AnimationControls | undefined;
  let currentScene: Scene;
  let currentCompileResult: CompileResult | undefined;
  const liveHydrationDisposers = new Set<() => void>();

  const renderInto = (next: Scene | InputScene | IRScene): void => {
    const { scene, compileResult } = resolveStaticMountScene(next, options);
    currentScene = scene;
    currentCompileResult = compileResult;
    const doc = buildSvgDocument(scene, {
      idPrefix,
      animate,
      snapshotAt: animation.snapshotAt,
    });

    while (root.firstChild) root.removeChild(root.firstChild);

    for (const attr of [...root.attributes]) root.removeAttribute(attr.name);
    applyAttrs(root, doc);
    const size = calculateDisplaySize(scene.layout, output.width, output.height);
    root.setAttribute('width', String(size.width));
    root.setAttribute('height', String(size.height));

    for (const child of doc.children ?? []) {
      root.appendChild(typeof child === 'string' ? document.createTextNode(child) : svgNodeToDom(child));
    }

    animationControls?.dispose();
    animationControls = animate && sceneHasAnimations(scene) ? bindWaapiDescriptors(root) : undefined;
  };

  renderInto(input);
  container.appendChild(root);

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
    update(next: Scene | InputScene | IRScene) {
      if (disposed) throw new RetikzVanillaError(RetikzVanillaErrorCode.Dom, 'mountSvg: view already disposed.');
      renderInto(next);
    },
    hydrate,
    dispose() {
      if (disposed) return;

      disposed = true;

      for (const disposeHydration of liveHydrationDisposers) disposeHydration();
      animationControls?.dispose();
      root.remove();
    },
    get animation() {
      return animationControls;
    },
    get artifacts() {
      return currentCompileResult?.artifacts ?? EMPTY_ARTIFACTS;
    },
    get compileResult() {
      return currentCompileResult;
    },
  };
};

/** 把 IR / InputScene 挂成 retained SVG Runtime */
const mountRetainedSvg = (
  container: Element,
  input: InputScene | IRScene,
  options: RetainedMountOptions,
  runtimeOptions: VanillaRetainedRuntimeOptions,
): RetainedSvgView => {
  const root = document.createElementNS(SVG_NS, 'svg');
  const output = options.output ?? {};
  if (output.width !== undefined) root.setAttribute('width', String(output.width));
  if (output.height !== undefined) root.setAttribute('height', String(output.height));
  const processing = createRetainedProcessingController({
    backend: 'svg',
    host: root,
    input,
    options,
    runtimeOptions,
    idPrefix: output.idPrefix ?? DEFAULT_ID_PREFIX,
  });
  container.appendChild(root);
  let rootRemoved = false;

  return {
    mode: VanillaViewMode.Retained,
    root,
    update: processing.update,
    hydrate: processing.hydrate,
    dispose: () => {
      processing.dispose();
      if (!rootRemoved) {
        root.remove();
        rootRemoved = true;
      }
    },
    diagnostics: processing.diagnostics,
    get animation() {
      return processing.read().animation;
    },
    get artifacts() {
      return processing.result().compileResult.artifacts;
    },
    get compileResult() {
      return processing.result().compileResult;
    },
  };
};

/** `mountSvg` 的 static / retained 输入重载 */
type MountSvg = {
  (container: Element, input: Scene, options?: StaticMountOptions): StaticSvgView;
  (container: Element, input: InputScene | IRScene, options: RawStaticMountOptions): StaticRawSvgView;
  (container: Element, input: InputScene | IRScene, options?: RetainedMountOptions): RetainedSvgView;
};

/** 挂载 SVG 视图；预编译 Scene 只能走 static 路径 */
export const mountSvg: MountSvg = ((
  container: Element,
  input: Scene | InputScene | IRScene,
  options: StaticMountOptions | MountOptions = {},
): VanillaView => {
  if ('primitives' in input) {
    return mountStaticSvg(container, input, options as StaticMountOptions);
  }

  const runtimeOptions = options.runtime ?? { mode: VanillaViewMode.Retained };

  return runtimeOptions.mode === VanillaViewMode.Static
    ? mountStaticSvg(container, input, options as RawStaticMountOptions)
    : mountRetainedSvg(container, input, options as RetainedMountOptions, runtimeOptions);
}) as MountSvg;
