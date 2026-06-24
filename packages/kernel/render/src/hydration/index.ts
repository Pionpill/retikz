/** @retikz/render/hydration 公开 API：renderer 无关的事件绑定 runtime */
export {
  RetikzEvent,
  EVENT_DOM_TYPE,
} from './events';
export type {
  RetikzEventValue,
  ElementHandlers,
  HydrationHandler,
  HydrationHandlers,
  Locate,
} from './events';
export type { HydrationController } from './controller';
export { createHydrationController } from './controller';
export { locateSvg } from './locate-svg';
export type {
  HydrationContext,
  HydrationAnimationControls,
  HydrationGeometry,
  BuildContext,
  ContextSources,
  CanvasIdControlsDeps,
} from './context';
export {
  createContextBuilder,
  createSvgAnimationControls,
  createClockAnimationControls,
  createCanvasIdAnimationControls,
  noopAnimationControls,
  resolvePointViaLayout,
  resolveSvgPointViaCtm,
  resolveSvgElement,
  metaOf,
  geometryOf,
} from './context';
export {
  collectCanvasAnimationEventTriggers,
  collectCanvasVisibleAnimationIds,
  isCanvasAnimationIdVisible,
  withCanvasAnimationEventHandlers,
} from './canvas-animation-triggers';
