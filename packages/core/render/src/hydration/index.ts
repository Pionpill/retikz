/** @retikz/render/hydration 公开 API：renderer 无关的事件绑定 runtime */
export {
  HYDRATION_EVENTS,
  EVENT_DOM_TYPE,
} from './events';
export type {
  EventName,
  ElementHandlers,
  HydrationHandlers,
  Locate,
} from './events';
export type { HydrationController } from './controller';
export { createHydrationController } from './controller';
export { locateSvg } from './locateSvg';
