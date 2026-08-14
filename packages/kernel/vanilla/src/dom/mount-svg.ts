import type { CompileArtifact, CompileResult, Scene } from '@retikz/core';
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
import { buildSvgFrameDocument } from '@retikz/render/svg';

import type { InputRuntimeMeta } from '../normalize';
import type {
  HydrateOptions,
  HydrationHandle,
  MountOptions,
  RawStaticMountOptions,
  RenderInput,
  RetainedMountOptions,
  RetainedRenderInput,
  RetainedSvgView,
  StaticMountOptions,
  StaticRawSvgView,
  StaticSvgView,
  VanillaRetainedRuntimeOptions,
  VanillaView,
} from '../runtime/types';

import { DEFAULT_ID_PREFIX, VanillaViewMode } from '../runtime/constants';
import { captureVanillaRuntimeOptions } from '../runtime/runtime-options';
import { assertStaticMountRuntimeExcluded } from '../runtime/static-mount-options';
import { createEmptyRuntimeMeta, toSceneResult } from '../runtime/to-scene';
import { createRetainedProcessingController } from './retained';
import { applyAttrs, svgNodeToDom } from './svg-dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 把 IR / Scene / InputScene 挂成真实 SVG DOM（无框架浏览器 runtime）
 * @description 输入会先归一成 Scene，再经 `@retikz/render/svg` 生成 SVG 描述并物化进稳定复用的 root `<svg>`
 */
const mountStaticSvg = (
  container: Element,
  input: RenderInput,
  options: StaticMountOptions | RawStaticMountOptions,
): StaticSvgView | StaticRawSvgView => {
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountSvg: container must be a DOM Element.');
  }
  const output = options.output ?? {};
  const animation = options.animation ?? {};
  const idPrefix = output.idPrefix ?? DEFAULT_ID_PREFIX;
  const root = document.createElementNS(SVG_NS, 'svg');
  const animate = resolveAnimationEnabled(animation.enabled, prefersReducedMotion());
  let animationControls: AnimationControls | undefined;
  let currentScene: Scene;
  let currentArtifacts: ReadonlyArray<CompileArtifact> = Object.freeze([]);
  let currentCompileResult: CompileResult | undefined;
  let currentRuntimeMeta: InputRuntimeMeta = createEmptyRuntimeMeta();
  const liveHydrationDisposers = new Set<() => void>();

  const renderInto = (next: RenderInput): void => {
    const { scene, artifacts, compileResult, layers, runtimeMeta } = toSceneResult(next, options);
    currentScene = scene;
    currentArtifacts = artifacts;
    currentCompileResult = compileResult;
    currentRuntimeMeta = runtimeMeta;
    const doc = buildSvgFrameDocument(
      { primary: scene, layers },
      {
        idPrefix,
        animate,
        snapshotAt: animation.snapshotAt,
        easings: animation.easings,
      },
    );
    while (root.firstChild) root.removeChild(root.firstChild);
    for (const attr of [...root.attributes]) root.removeAttribute(attr.name);
    applyAttrs(root, doc);
    if (output.width !== undefined) root.setAttribute('width', String(output.width));
    if (output.height !== undefined) root.setAttribute('height', String(output.height));
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
    update(next: RenderInput) {
      if (disposed) throw new Error('mountSvg: view already disposed.');
      renderInto(next);
    },
    hydrate,
    dispose() {
      if (disposed) return;
      disposed = true;
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
    get compileResult() {
      return currentCompileResult;
    },
  };
};

/** 把 IR / InputScene 挂成 retained SVG Runtime session */
const mountRetainedSvg = (
  container: Element,
  input: RetainedRenderInput,
  options: RetainedMountOptions,
  runtimeOptions: VanillaRetainedRuntimeOptions,
): RetainedSvgView => {
  if (typeof Element === 'undefined' || !(container instanceof Element)) {
    throw new Error('mountSvg: container must be a DOM Element.');
  }
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
  return {
    mode: VanillaViewMode.Retained,
    root,
    update: processing.update,
    hydrate: processing.hydrate,
    dispose: processing.dispose,
    diagnostics: processing.diagnostics,
    get animation() {
      return processing.read().animation;
    },
    get runtimeMeta() {
      return processing.result().runtimeMeta;
    },
    get artifacts() {
      return processing.result().artifacts;
    },
    get compileResult() {
      return processing.result().compileResult;
    },
  };
};

/** `mountSvg` 的 static / retained 输入重载 */
type MountSvg = {
  (container: Element, input: Scene, options?: StaticMountOptions): StaticSvgView;
  (container: Element, input: RetainedRenderInput, options: RawStaticMountOptions): StaticRawSvgView;
  (container: Element, input: RetainedRenderInput, options?: RetainedMountOptions): RetainedSvgView;
};

/** 挂载 SVG 视图；预编译 Scene 只能走 static 路径 */
export const mountSvg: MountSvg = ((
  container: Element,
  input: RenderInput,
  options: StaticMountOptions | MountOptions = {},
): VanillaView => {
  if ('primitives' in input) {
    assertStaticMountRuntimeExcluded(options);
    return mountStaticSvg(container, input, options as StaticMountOptions);
  }
  const runtimeOptions = captureVanillaRuntimeOptions(options);
  return runtimeOptions.mode === VanillaViewMode.Static
    ? mountStaticSvg(container, input, options as RawStaticMountOptions)
    : mountRetainedSvg(container, input, options as RetainedMountOptions, runtimeOptions);
}) as MountSvg;
