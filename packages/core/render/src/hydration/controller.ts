import type { ElementHandlers, HydrationHandlers, Locate, RetikzEventName } from './events';
import { EVENT_DOM_TYPE, RetikzEvent } from './events';

/** 水合控制器：根级委托 + enter/leave 合成 + dispose 解绑 */
export type HydrationController = {
  /** 解绑所有根级 listener，之后事件不再触发 */
  dispose: () => void;
};

/** 收集 handlers 注册表中实际用到的 RetikzEventName 集合（决定要在 root 上挂哪些 DOM listener） */
const collectUsedEvents = (handlers: HydrationHandlers): Set<RetikzEventName> => {
  const used = new Set<RetikzEventName>();
  for (const id of Object.keys(handlers)) {
    for (const name of Object.keys(handlers[id]) as Array<RetikzEventName>) {
      if (handlers[id][name] !== undefined) used.add(name);
    }
  }
  return used;
};

/** 查某 id 的某事件 handler 并以原生 event 调用（缺 handler 静默） */
const invoke = (
  handlers: HydrationHandlers,
  id: string | null,
  name: RetikzEventName,
  event: Event,
): void => {
  if (id === null || !Object.hasOwn(handlers, id)) return;
  const handler: ElementHandlers[RetikzEventName] = handlers[id][name];
  if (handler !== undefined) handler(event);
};

/** 判断 root 是否为可挂 pointerleave/pointerout 的 EventTarget（dispatcher 只需 addEventListener，故恒成立） */
const hasContains = (target: EventTarget): target is Node =>
  typeof (target as Partial<Node>).contains === 'function';

/**
 * 创建水合控制器：在 root 上挂根级委托，把命中图元 id 的事件分发给 handlers
 * @description renderer 无关上层。直接委托的事件（click / rightClick / pointerMove 等）对每个用到的 RetikzEventName 在
 *   root 注册一个 EVENT_DOM_TYPE 监听器，事件到来时经 locate 定位到图元 id、查 handlers 触发。
 *   pointerEnter / pointerLeave 不直接监听、由 pointermove + 「上一帧命中 id」状态机合成（renderer 无关、经
 *   同一 locate）：仅当 handlers 含任一 enter/leave 时才在 root 挂 pointermove；每次 move 算 currentId = locate(event)，
 *   与 lastHitId 不同则先 fire 旧 id 的 leave、再 fire 新 id 的 enter，更新 lastHitId。离开整图（root pointerleave，
 *   或 pointerout 且 relatedTarget 在 root 外）→ fire lastHitId 的 leave 并清空。SVG（closest）与 Canvas
 *   （hitTest 坐标命中）共用此实现 → 双模等价。返回 { dispose } 解绑全部 listener。
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

  // 直接委托的事件（enter/leave 除外，它们走 pointermove 合成）：locate(event) → 查 handler → 调用。
  for (const name of used) {
    if (name === RetikzEvent.PointerEnter || name === RetikzEvent.PointerLeave) continue;
    listen(EVENT_DOM_TYPE[name], event => invoke(handlers, locate(event), name, event));
  }

  // enter/leave 合成：仅当注册表里有 enter 或 leave handler 时，才挂 pointermove + 离开整图监听。
  const hasEnter = used.has(RetikzEvent.PointerEnter);
  const hasLeave = used.has(RetikzEvent.PointerLeave);
  if (hasEnter || hasLeave) {
    let lastHitId: string | null = null;

    // pointermove：算当前命中 id；与上次不同 → 旧 id fire leave、新 id fire enter，各一次。
    // 先推进 lastHitId 再 invoke：某个 handler 抛出也不会污染命中配对（避免重复 enter / 漏 leave / 卡死）。
    listen('pointermove', event => {
      const currentId = locate(event);
      if (currentId === lastHitId) return;
      const previousId = lastHitId;
      lastHitId = currentId;
      if (previousId !== null) invoke(handlers, previousId, RetikzEvent.PointerLeave, event);
      if (currentId !== null) invoke(handlers, currentId, RetikzEvent.PointerEnter, event);
    });

    // 离开整图：清空命中态、把 lastHitId 的 leave 补一次（同样先清状态再 invoke）。
    const leaveWhole = (event: Event): void => {
      if (lastHitId === null) return;
      const previousId = lastHitId;
      lastHitId = null;
      invoke(handlers, previousId, RetikzEvent.PointerLeave, event);
    };
    // pointerleave 不冒泡、只在指针真正离开 root 时触发——最干净的「离开整图」信号。
    listen('pointerleave', leaveWhole);
    // 退化兜底：某些环境 pointerleave 缺失，用 pointerout 且 relatedTarget 落在 root 外判定离开整图。
    listen('pointerout', event => {
      const related = (event as MouseEvent).relatedTarget;
      const stillInside =
        related !== null &&
        related instanceof Node &&
        hasContains(root) &&
        (root === related || root.contains(related));
      if (!stillInside) leaveWhole(event);
    });
  }

  return {
    dispose: () => {
      for (const teardown of teardowns.splice(0)) teardown();
    },
  };
};
