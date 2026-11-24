import type { IRScene } from '@retikz/core';
import type { InputRendererFactory, RendererHost } from '@retikz/render/runtime';

import type { InputScene } from '../normalize';
import { isInputScene, normalizeScene } from '../normalize';
import type { SceneInputBindings } from '../runtime';
import { DEFAULT_ID_PREFIX } from '../runtime';
import type { MountOptions } from './types';
import { SceneView } from './view';

/** 从作者输入或完整 IR 挂载场景视图，默认使用 SVG */
export function mountSceneView(
  container: Element,
  source: InputScene | IRScene,
  options: MountOptions & { renderer: 'canvas' },
): SceneView<HTMLCanvasElement>;
export function mountSceneView(
  container: Element,
  source: InputScene | IRScene,
  options?: MountOptions & { renderer?: 'svg' },
): SceneView<SVGSVGElement>;
export function mountSceneView(
  container: Element,
  source: InputScene | IRScene,
  options: MountOptions = {},
): SceneView {
  let ir: IRScene;
  let bindings: SceneInputBindings | undefined;
  if (isInputScene(source)) {
    const normalized = normalizeScene(source);
    ir = normalized.ir;
    bindings = { contributions: normalized.contributions, runtimeInputs: normalized.runtimeInputs };
  } else {
    ir = source;
  }

  const { width, height, idPrefix = DEFAULT_ID_PREFIX } = options.output ?? {};
  let renderer: InputRendererFactory;
  if (options.renderer === 'canvas') {
    const host = document.createElement('canvas');
    if (width !== undefined) host.style.width = `${width}px`;
    if (height !== undefined) host.style.height = `${height}px`;
    host.style.objectFit = 'contain';

    let devicePixelRatio = options.canvas?.devicePixelRatio;
    if (devicePixelRatio === undefined || !Number.isFinite(devicePixelRatio) || devicePixelRatio <= 0) {
      const ratio = globalThis.devicePixelRatio;
      devicePixelRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
    }
    renderer = { backend: 'canvas', host, immutableOptions: { backend: 'canvas', idPrefix, devicePixelRatio } };
  } else {
    const host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    if (width !== undefined) host.setAttribute('width', String(width));
    if (height !== undefined) host.setAttribute('height', String(height));
    renderer = { backend: 'svg', host, immutableOptions: { backend: 'svg', idPrefix } };
  }

  const view = new SceneView<RendererHost>(ir, options, renderer, bindings);
  container.appendChild(view.root);
  return view;
}
