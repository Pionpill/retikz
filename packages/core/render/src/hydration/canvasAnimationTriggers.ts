import type { Scene, ScenePrimitive } from '@retikz/core';
import type { HydrationHandlers, RetikzEventName } from './events';
import { RetikzEvent } from './events';
import { geometryOf } from './context';

const EVENT_NAMES = new Set<string>(Object.values(RetikzEvent));

const isRetikzEventName = (event: string): event is RetikzEventName => EVENT_NAMES.has(event);

const walkPrimitives = (primitives: ReadonlyArray<ScenePrimitive>, visit: (primitive: ScenePrimitive) => void): void => {
  for (const primitive of primitives) {
    visit(primitive);
    if (primitive.type === 'group') walkPrimitives(primitive.children, visit);
  }
};

/** Scene 中含 canvas `{ onEvent }` trigger 的 id → 事件名集合 */
export const collectCanvasAnimationEventTriggers = (scene: Scene): Map<string, Set<RetikzEventName>> => {
  const triggers = new Map<string, Set<RetikzEventName>>();
  walkPrimitives(scene.primitives, primitive => {
    if (primitive.id === undefined || primitive.animations === undefined) return;
    for (const track of primitive.animations) {
      const trigger = track.trigger;
      if (typeof trigger !== 'object') continue;
      if (!isRetikzEventName(trigger.onEvent)) continue;
      const set = triggers.get(primitive.id) ?? new Set<RetikzEventName>();
      set.add(trigger.onEvent);
      triggers.set(primitive.id, set);
    }
  });
  return triggers;
};

/** 合并用户 handlers 与 canvas onEvent 动画内部 handler：命中时先 restart 该 id，再调用用户 handler */
export const withCanvasAnimationEventHandlers = (
  scene: Scene,
  handlers: HydrationHandlers | undefined,
): HydrationHandlers => {
  const merged: HydrationHandlers = {};
  for (const [id, elementHandlers] of Object.entries(handlers ?? {})) {
    merged[id] = { ...elementHandlers };
  }
  for (const [id, events] of collectCanvasAnimationEventTriggers(scene)) {
    const target = merged[id] ?? {};
    for (const eventName of events) {
      const userHandler = target[eventName];
      target[eventName] = (event, context) => {
        context.animation.restart(id);
        userHandler?.(event, context);
      };
    }
    merged[id] = target;
  }
  return merged;
};

/** Scene 中含 `visible` trigger 的 id 集合 */
export const collectCanvasVisibleAnimationIds = (scene: Scene): Set<string> => {
  const ids = new Set<string>();
  walkPrimitives(scene.primitives, primitive => {
    if (primitive.id === undefined || primitive.animations === undefined) return;
    if (primitive.animations.some(track => track.trigger === 'visible')) ids.add(primitive.id);
  });
  return ids;
};

/** 判断某 id 的 Scene 聚合 bbox 投到 canvas client rect 后是否与 viewport 相交 */
export const isCanvasAnimationIdVisible = (canvas: HTMLCanvasElement, scene: Scene, id: string): boolean => {
  if (typeof window === 'undefined') return false;
  const geometry = geometryOf(scene, id);
  if (!geometry) return false;
  const rect = canvas.getBoundingClientRect();
  const { layout } = scene;
  const scale = Math.min(rect.width / layout.width, rect.height / layout.height);
  if (!Number.isFinite(scale) || scale <= 0) return false;
  const offsetX = (rect.width - layout.width * scale) / 2;
  const offsetY = (rect.height - layout.height * scale) / 2;
  const left = rect.left + offsetX + (geometry.bbox.x - layout.x) * scale;
  const top = rect.top + offsetY + (geometry.bbox.y - layout.y) * scale;
  const right = left + geometry.bbox.width * scale;
  const bottom = top + geometry.bbox.height * scale;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  return right >= 0 && bottom >= 0 && left <= viewportWidth && top <= viewportHeight;
};
