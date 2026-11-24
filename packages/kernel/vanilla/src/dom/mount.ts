import type { IRScene } from '@retikz/core';

import type { InputScene } from '../normalize';
import { normalizeScene } from '../normalize';
import type { SceneInputBindings } from '../runtime';
import { mountCanvasView } from './mount-canvas';
import { mountSvgView } from './mount-svg';
import type { MountOptions, MountCanvasOptions, CanvasView, SvgView } from './types';

/** DOM 挂载使用的渲染后端 */
export type MountRenderer = 'svg' | 'canvas';

/** IR 和作者输入的挂载选项；缺省使用 SVG */
export type MountUnifiedOptions = MountCanvasOptions & { renderer?: MountRenderer };

/** 挂载完整 IR 并保留场景会话；首帧绑定不写入会话默认配置 */
const mountIR = (container: Element, ir: IRScene, options: MountUnifiedOptions, bindings?: SceneInputBindings) =>
  options.renderer === 'canvas'
    ? mountCanvasView(container, ir, options, bindings)
    : mountSvgView(container, ir, options, bindings);

/** 挂载完整 IR 并保留场景会话 */
export function mount(
  container: Element,
  ir: IRScene,
  options: MountUnifiedOptions & { renderer: 'canvas' },
): CanvasView;
export function mount(container: Element, ir: IRScene, options?: MountUnifiedOptions & { renderer?: 'svg' }): SvgView;
export function mount(container: Element, ir: IRScene, options: MountUnifiedOptions = {}): CanvasView | SvgView {
  return mountIR(container, ir, options);
}

/** 将作者输入归一化一次，并随 IR 传递本帧嵌入绑定 */
export function mountFromInput(
  container: Element,
  input: InputScene,
  options: MountUnifiedOptions & { renderer: 'canvas' },
): CanvasView;
export function mountFromInput(
  container: Element,
  input: InputScene,
  options?: MountUnifiedOptions & { renderer?: 'svg' },
): SvgView;
export function mountFromInput(
  container: Element,
  input: InputScene,
  options: MountUnifiedOptions = {},
): CanvasView | SvgView {
  const { ir, contributions, runtimeInputs } = normalizeScene(input);
  return mountIR(container, ir, options, { contributions, runtimeInputs });
}

/** 将完整 IR 挂载为 SVG 视图 */
export const mountSvg: (container: Element, ir: IRScene, options?: MountOptions) => SvgView = mountSvgView;

/** 将完整 IR 挂载为 Canvas 视图 */
export const mountCanvas: (container: Element, ir: IRScene, options?: MountCanvasOptions) => CanvasView =
  mountCanvasView;
