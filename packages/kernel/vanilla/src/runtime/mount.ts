import type { CanvasView, MountCanvasOptions, MountOptions, RenderInput, VanillaView } from './types';

import { mountCanvas } from './mount-canvas';
import { mountSvg } from './mount-svg';

/** Vanilla mount renderer selector. */
export type MountRenderer = 'svg' | 'canvas';

/** 统一 mount 入口选项 */
export type MountUnifiedOptions = (MountOptions | MountCanvasOptions) & {
  /** 渲染后端；缺省使用 SVG */
  renderer?: MountRenderer;
};

/** 按 renderer 选择 SVG 或 Canvas runtime 挂载 */
type MountFn = {
  (container: Element, input: RenderInput, options: MountUnifiedOptions & { renderer: 'canvas' }): CanvasView;
  (container: Element, input: RenderInput, options?: MountUnifiedOptions): VanillaView;
};

/** 按 renderer 把输入挂载为 SVG 或 Canvas view；缺省使用 SVG */
export const mount: MountFn = ((
  container: Element,
  input: RenderInput,
  options: MountUnifiedOptions = {},
): VanillaView | CanvasView => {
  if (options.renderer === 'canvas') return mountCanvas(container, input, options);
  return mountSvg(container, input, options);
}) as MountFn;
