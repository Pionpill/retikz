import type { ElementHandlers, EventName, HydrationHandlers, Locate } from './events';
import { EVENT_DOM_TYPE, HYDRATION_EVENTS } from './events';

/** 水合控制器：根级委托 + enter/leave 合成 + dispose 解绑 */
export type HydrationController = {
  /** 解绑所有根级 listener，之后事件不再触发 */
  dispose: () => void;
};

/** 收集 handlers 注册表中实际用到的 EventName 集合（决定要在 root 上挂哪些 DOM listener） */
const collectUsedEvents = (handlers: HydrationHandlers): Set<EventName> => {
  const used = new Set<EventName>();
  for (const id of Object.keys(handlers)) {
    for (const name of Object.keys(handlers[id]) as Array<EventName>) {
      if (handlers[id][name] !== undefined) used.add(name);
    }
  }
  return used;
};

/** 查某 id 的某事件 handler 并以原生 event 调用（缺 handler 静默） */
const invoke = (
  handlers: HydrationHandlers,
  id: string | null,
  name: EventName,
  event: Event,
): void => {
  if (id === null || !Object.hasOwn(handlers, id)) return;
  const handler: ElementHandlers[EventName] = handlers[id][name];
  if (handler !== undefined) handler(event);
};

/** 用给定 target 定位 id：locate 仅读 event.target，故包一层覆写 target 的代理事件供 relatedTarget 定位 */
const locateTarget = (locate: Locate, event: Event, target: EventTarget | null): string | null => {
  if (target === null) return null;
  const proxy = new Proxy(event, {
    get: (base, key) => (key === 'target' ? target : Reflect.get(base, key)),
  });
  return locate(proxy);
};

/**
 * 创建水合控制器：在 root 上挂根级委托，把命中图元 id 的事件分发给 handlers
 * @description renderer 无关上层。对每个用到的 EventName 在 root 注册一个 EVENT_DOM_TYPE 监听器，事件到来时
 *   经 locate 定位到图元 id，查 handlers 触发对应 handler；pointerEnter / pointerLeave 不直接监听、由
 *   pointerover / out + relatedTarget 在根层合成（跨子元素移动只在真正进 / 出图元时各触发一次）。
 *   返回 { dispose } 解绑全部 listener。
 */
export const createHydrationController = (
  root: EventTarget,
  handlers: HydrationHandlers,
  locate: Locate,
): HydrationController => {
  const used = collectUsedEvents(handlers);
  const teardowns: Array<() => void> = [];

  const listen = (domType: string, listener: (event: Event) => void): void => {
    root.addEventListener(domType, listener);
    teardowns.push(() => root.removeEventListener(domType, listener));
  };

  // 直接委托的事件（enter/leave 除外）：locate(event) → 查 handler → 调用。
  for (const name of used) {
    if (name === HYDRATION_EVENTS.pointerEnter || name === HYDRATION_EVENTS.pointerLeave) continue;
    listen(EVENT_DOM_TYPE[name], event => invoke(handlers, locate(event), name, event));
  }

  // pointerEnter 合成：pointerover 时进入图元 id 与（relatedTarget 解析的）来源 id 不同 → 触发一次。
  if (used.has(HYDRATION_EVENTS.pointerEnter)) {
    listen(EVENT_DOM_TYPE[HYDRATION_EVENTS.pointerEnter], event => {
      const entered = locate(event);
      const from = locateTarget(locate, event, (event as MouseEvent).relatedTarget);
      if (entered !== null && entered !== from) {
        invoke(handlers, entered, HYDRATION_EVENTS.pointerEnter, event);
      }
    });
  }

  // pointerLeave 合成：pointerout 时离开图元 id 与（relatedTarget 解析的）去向 id 不同 → 触发一次。
  if (used.has(HYDRATION_EVENTS.pointerLeave)) {
    listen(EVENT_DOM_TYPE[HYDRATION_EVENTS.pointerLeave], event => {
      const left = locate(event);
      const to = locateTarget(locate, event, (event as MouseEvent).relatedTarget);
      if (left !== null && left !== to) {
        invoke(handlers, left, HYDRATION_EVENTS.pointerLeave, event);
      }
    });
  }

  return {
    dispose: () => {
      for (const teardown of teardowns.splice(0)) teardown();
    },
  };
};
