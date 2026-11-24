import type { Scene } from '@retikz/core';
import type { HydrationController, HydrationContextBuilder, HydrationHandlers } from '@retikz/render/hydration';
import {
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  locateSvg,
  noopAnimationControls,
  resolvePointViaLayout,
  resolveSvgElement,
  resolveSvgPointViaCtm,
} from '@retikz/render/hydration';

/** 为已有 SVG 注册事件的选项 */
export type HydrateOptions = {
  /** 按图元 id 和事件名登记的处理函数 */
  handlers: HydrationHandlers;
  /** 用于提供图元元数据、几何和动画上下文的场景 */
  scene?: Scene;
};

/** 把用户 handler 水合到已挂的根 `<svg>` */
export const hydrate = (root: SVGSVGElement, options: HydrateOptions): HydrationController => {
  const scene = options.scene;
  const buildContext: HydrationContextBuilder = createContextBuilder({
    renderer: 'svg',
    root,
    scene,
    resolveElement: resolveSvgElement,
    resolvePoint: scene ? resolvePointViaLayout(root, scene.layout) : resolveSvgPointViaCtm(root),
    makeAnimation: scene ? id => createSvgAnimationControls(root, id) : () => noopAnimationControls,
  });
  return createHydrationController(root, options.handlers, locateSvg, buildContext);
};
