/** @retikz/render/hydration 公开 API：renderer 无关的事件绑定 runtime */
export {
  collectCanvasAnimationEventTriggers,
  collectCanvasVisibleAnimationIds,
  isCanvasAnimationIdVisible,
  withCanvasAnimationEventHandlers,
} from './canvas-animation-triggers';
export type {
  BuildContext,
  CanvasIdControlsDeps,
  ContextSources,
  HydrationAnimationControls,
  HydrationContext,
  HydrationGeometry,
} from './context';
export {
  createCanvasIdAnimationControls,
  createClockAnimationControls,
  createContextBuilder,
  createSvgAnimationControls,
  geometryOf,
  metaOf,
  noopAnimationControls,
  resolvePointViaLayout,
  resolveSvgElement,
  resolveSvgPointViaCtm,
} from './context';
export type { HydrationController } from './controller';
export { createHydrationController } from './controller';
export type { ElementHandlers, HydrationHandler, HydrationHandlers, Locate, RetikzEventValue } from './events';
export { EVENT_DOM_TYPE, RetikzEvent } from './events';
export { locateSvg } from './locate-svg';
