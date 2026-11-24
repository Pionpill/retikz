import type { IRScene } from '@retikz/core';
import type { InputRendererFactory, RendererHost } from '@retikz/render/runtime';

import type { InputScene } from '../normalize';
import { normalizeScene } from '../normalize';
import type { SceneInputBindings } from '../runtime';
import { DEFAULT_ID_PREFIX } from '../runtime';
import type { MountOptions, MountCanvasOptions } from './types';
import { SceneView } from './view';

/** DOM 挂载使用的渲染后端 */
export type MountRenderer = 'svg' | 'canvas';

/** IR 和作者输入的挂载选项；缺省使用 SVG */
export type MountUnifiedOptions = MountCanvasOptions & { renderer?: MountRenderer };

/** 挂载完整 IR 并保留场景会话；首帧绑定不写入会话默认配置 */
const mountIR = (container: Element, ir: IRScene, options: MountUnifiedOptions, bindings?: SceneInputBindings) => {
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
};

/** 挂载完整 IR 并保留场景会话 */
export function mount(
  container: Element,
  ir: IRScene,
  options: MountUnifiedOptions & { renderer: 'canvas' },
): SceneView<HTMLCanvasElement>;
export function mount(
  container: Element,
  ir: IRScene,
  options?: MountUnifiedOptions & { renderer?: 'svg' },
): SceneView<SVGSVGElement>;
export function mount(container: Element, ir: IRScene, options: MountUnifiedOptions = {}): SceneView {
  return mountIR(container, ir, options);
}

/** 将作者输入归一化一次，并随 IR 传递本帧嵌入绑定 */
export function mountFromInput(
  container: Element,
  input: InputScene,
  options: MountUnifiedOptions & { renderer: 'canvas' },
): SceneView<HTMLCanvasElement>;
export function mountFromInput(
  container: Element,
  input: InputScene,
  options?: MountUnifiedOptions & { renderer?: 'svg' },
): SceneView<SVGSVGElement>;
export function mountFromInput(container: Element, input: InputScene, options: MountUnifiedOptions = {}): SceneView {
  const { ir, contributions, runtimeInputs } = normalizeScene(input);
  return mountIR(container, ir, options, { contributions, runtimeInputs });
}

/** 将完整 IR 挂载为 SVG 视图 */
export const mountSvg = (container: Element, ir: IRScene, options: MountOptions = {}) =>
  mount(container, ir, { ...options, renderer: 'svg' });

/** 将完整 IR 挂载为 Canvas 视图 */
export const mountCanvas = (container: Element, ir: IRScene, options: MountCanvasOptions = {}) =>
  mount(container, ir, { ...options, renderer: 'canvas' });
