import type { BuildContext } from '@retikz/render/hydration';

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

import type { HydrateOptions, HydrationHandle } from './types';

/** 把用户 handler 水合到已挂的根 `<svg>` */
export const hydrate = (root: SVGSVGElement, options: HydrateOptions): HydrationHandle => {
  const scene = options.scene;
  const buildContext: BuildContext = createContextBuilder({
    renderer: 'svg',
    root,
    scene,
    resolveElement: resolveSvgElement,
    resolvePoint: scene ? resolvePointViaLayout(root, scene.layout) : resolveSvgPointViaCtm(root),
    makeAnimation: scene ? id => createSvgAnimationControls(root, id) : () => noopAnimationControls,
  });
  const controller = createHydrationController(root, options.handlers, locateSvg, buildContext);
  return { dispose: controller.dispose };
};
