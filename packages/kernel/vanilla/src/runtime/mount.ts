import type { Scene } from '@retikz/core';

import type {
  CanvasView,
  MountCanvasOptions,
  MountOptions,
  RenderInput,
  RetainedCanvasView,
  RetainedRenderInput,
  RetainedSvgView,
  StaticCanvasView,
  StaticMountCanvasOptions,
  StaticMountOptions,
  StaticSvgView,
  VanillaView,
} from './types';

import { mountCanvas } from './mount-canvas';
import { mountSvg } from './mount-svg';

/** Vanilla mount renderer selector. */
export type MountRenderer = 'svg' | 'canvas';

/** 统一 mount 入口选项 */
export type MountUnifiedOptions = (MountOptions | MountCanvasOptions) & {
  /** 渲染后端；缺省使用 SVG */
  renderer?: MountRenderer;
};

/** 统一 static mount 入口选项 */
export type StaticMountUnifiedOptions = (StaticMountOptions | StaticMountCanvasOptions) & {
  /** 渲染后端；缺省使用 SVG */
  renderer?: MountRenderer;
};

/** 按 renderer 选择 SVG 或 Canvas runtime 挂载 */
type MountFn = {
  (container: Element, input: Scene, options: StaticMountUnifiedOptions & { renderer: 'canvas' }): StaticCanvasView;
  (
    container: Element,
    input: RetainedRenderInput,
    options: MountUnifiedOptions & { renderer: 'canvas' },
  ): RetainedCanvasView;
  (container: Element, input: Scene, options?: StaticMountUnifiedOptions & { renderer?: 'svg' }): StaticSvgView;
  (
    container: Element,
    input: RetainedRenderInput,
    options?: MountUnifiedOptions & { renderer?: 'svg' },
  ): RetainedSvgView;
};

/** 按 renderer 把输入挂载为 SVG 或 Canvas view；缺省使用 SVG */
export const mount: MountFn = ((
  container: Element,
  input: RenderInput,
  options: StaticMountUnifiedOptions | MountUnifiedOptions = {},
): VanillaView | CanvasView => {
  if ('primitives' in input) {
    const staticOptions = options as StaticMountUnifiedOptions;
    if (staticOptions.renderer === 'canvas') return mountCanvas(container, input, staticOptions);
    return mountSvg(container, input, staticOptions);
  }
  const retainedOptions = options as MountUnifiedOptions;
  if (retainedOptions.renderer === 'canvas') return mountCanvas(container, input, retainedOptions);
  return mountSvg(container, input, retainedOptions);
}) as MountFn;
