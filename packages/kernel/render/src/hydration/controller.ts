import { runtimeIdentityEquals } from '@retikz/runtime';

import type { BuildContext, HydrationContext } from './context';
import type { ElementHandlers, HydrationHandlers, Locate, RetikzEventValue } from './events';
import type { HydrationTarget } from './events';

import { noopAnimationControls } from './context';
import { EVENT_DOM_TYPE, RetikzEvent } from './events';

/** 水合控制器：根级委托 + enter/leave 合成 + dispose 解绑 */
export type HydrationController = {
  /** 解绑所有根级 listener，之后事件不再触发 */
  dispose: () => void;
};

/** Hydration controller 注册失败且初次清理也失败时的可恢复错误 */
class HydrationControllerSetupError extends Error {
  /** 原始 listener 注册失败 */
  override readonly cause: unknown;

  /** 初次反向清理失败 */
  readonly cleanupCause: unknown;

  /** 保留尚未解绑任务的 controller，供 owner rollback / dispose 重试 */
  readonly controller: HydrationController;

  /** 创建保留 primary setup cause 与可重试 controller 的错误 */
  constructor(cause: unknown, cleanupCause: unknown, controller: HydrationController) {
    super('Hydration controller setup and cleanup failed', { cause });
    this.name = 'HydrationControllerSetupError';
    this.cause = cause;
    this.cleanupCause = cleanupCause;
    this.controller = controller;
  }
}

/** 收集 handlers 注册表中实际用到的 RetikzEventValue 集合（决定要在 root 上挂哪些 DOM listener） */
const collectUsedEvents = (handlers: HydrationHandlers): Set<RetikzEventValue> => {
  const used = new Set<RetikzEventValue>();
  for (const id of Object.keys(handlers)) {
    for (const name of Object.keys(handlers[id]) as Array<RetikzEventValue>) {
      if (handlers[id][name] !== undefined) used.add(name);
    }
  }
  return used;
};

/** 命中 id 但调用方未提供 buildContext 时的最小 context（renderer 按实际后端传入；animation no-op） */
const minimalContext = (root: EventTarget, id: string, renderer: 'svg' | 'canvas'): HydrationContext => ({
  id,
  renderer,
  element: null,
  root: root as Element,
  point: null,
  animation: noopAnimationControls,
});

/** 查某 id 的某事件 handler 并以 `(event, context)` 调用（缺 handler 静默；context 恒构造） */
const invoke = (
  handlers: HydrationHandlers,
  id: string | null,
  name: RetikzEventValue,
  event: Event,
  root: EventTarget,
  buildContext: BuildContext | undefined,
  renderer: 'svg' | 'canvas',
): void => {
  if (id === null || !Object.hasOwn(handlers, id)) return;
  const handler: ElementHandlers[RetikzEventValue] = handlers[id][name];
  if (handler === undefined) return;
  const context = buildContext ? buildContext(event, id) : minimalContext(root, id, renderer);
  handler(event, context);
};

const publicIdOf = (target: string | HydrationTarget | null): string | null =>
  typeof target === 'string' ? target : (target?.publicId ?? null);

const hydrationTargetEquals = (
  left: string | HydrationTarget | null,
  right: string | HydrationTarget | null,
): boolean => {
  if (typeof left === 'string' || typeof right === 'string') return left === right;
  if (left === null || right === null) return left === right;
  return runtimeIdentityEquals(left.semanticOwner, right.semanticOwner);
};

/** 执行 listener teardown；成功项立即移除，失败项保留以允许后续重试 */
const runTeardowns = (teardowns: Array<() => void>, reverse = false): void => {
  const pending = reverse ? [...teardowns].reverse() : [...teardowns];
  let failed = false;
  let firstCause: unknown;
  for (const teardown of pending) {
    try {
      teardown();
      const index = teardowns.indexOf(teardown);
      if (index !== -1) teardowns.splice(index, 1);
    } catch (cause) {
      if (!failed) {
        failed = true;
        firstCause = cause;
      }
    }
  }
  if (failed) throw firstCause;
};

/** 判断 root 是否为可挂 pointerleave/pointerout 的 EventTarget（dispatcher 只需 addEventListener，故恒成立） */
const hasContains = (target: EventTarget): target is Node => typeof (target as Partial<Node>).contains === 'function';

/**
 * 创建水合控制器：在 root 上挂根级委托，把命中图元 id 的事件分发给 handlers
 * @description renderer 无关上层。直接委托的事件（click / rightClick / pointerMove 等）对每个用到的 RetikzEventValue 在
 *   root 注册一个 EVENT_DOM_TYPE 监听器，事件到来时经 locate 定位到图元 id、查 handlers 触发。
 *   pointerEnter / pointerLeave 不直接监听、由 pointermove + 「上一帧命中 id」状态机合成（renderer 无关、经
 *   同一 locate）：仅当 handlers 含任一 enter/leave 时才在 root 挂 pointermove；每次 move 解析 current target，
 *   与 last target 的 RuntimeIdentity 不同则先 fire 旧 public id 的 leave、再 fire 新 public id 的 enter。离开整图
 *   （root pointerleave，或 pointerout 且 relatedTarget 在 root 外）→ fire last target 的 leave 并清空。SVG 与 Canvas
 *   （hitTest 坐标命中）共用此实现 → 双模等价。返回 { dispose } 解绑全部 listener。
 *
 *   命中 id 后恒以 `handler(event, buildContext(event, id))` 调用——`context` 永远传入（绝不 undefined）。
 *   `buildContext` 由各 runtime（vanilla / react）提供，携 Scene / renderer / 动画句柄构造富 context；省略时退回
 *   最小 context（id + root，meta / geometry / scene 缺省、animation no-op），现有 `(event) => …` handler 忽略 context 照常。
 *   `renderer` 指明实际后端（缺省 svg）：仅在退回最小 context 时用于如实填 `context.renderer`，Canvas 路径应传 `'canvas'`
 */
export const createHydrationController = (
  root: EventTarget,
  handlers: HydrationHandlers,
  locate: Locate,
  buildContext?: BuildContext,
  renderer: 'svg' | 'canvas' = 'svg',
): HydrationController => {
  const used = collectUsedEvents(handlers);
  const teardowns: Array<() => void> = [];
  const controller = Object.freeze({
    dispose: () => {
      runTeardowns(teardowns);
    },
  });

  const listen = (domType: string, listener: (event: Event) => void): void => {
    root.addEventListener(domType, listener);
    teardowns.push(() => root.removeEventListener(domType, listener));
  };

  try {
    // 直接委托的事件（enter/leave 除外，它们走 pointermove 合成）：locate(event) → 查 handler → 调用。
    for (const name of used) {
      if (name === RetikzEvent.PointerEnter || name === RetikzEvent.PointerLeave) continue;
      listen(EVENT_DOM_TYPE[name], event =>
        invoke(handlers, publicIdOf(locate(event)), name, event, root, buildContext, renderer),
      );
    }

    // enter/leave 合成：仅当注册表里有 enter 或 leave handler 时，才挂 pointermove + 离开整图监听
    const hasEnter = used.has(RetikzEvent.PointerEnter);
    const hasLeave = used.has(RetikzEvent.PointerLeave);
    if (hasEnter || hasLeave) {
      let lastTarget: string | HydrationTarget | null = null;

      // pointermove：按 semantic owner 比较当前 target；变化时旧 public id fire leave、新 public id fire enter，各一次
      // 先推进 lastTarget 再 invoke，避免 callback 抛出污染命中配对
      listen('pointermove', event => {
        const currentTarget = locate(event);
        if (hydrationTargetEquals(currentTarget, lastTarget)) return;
        const previousId = publicIdOf(lastTarget);
        const currentId = publicIdOf(currentTarget);
        lastTarget = currentTarget;
        if (previousId !== null)
          invoke(handlers, previousId, RetikzEvent.PointerLeave, event, root, buildContext, renderer);
        if (currentId !== null)
          invoke(handlers, currentId, RetikzEvent.PointerEnter, event, root, buildContext, renderer);
      });

      // 离开整图：清空命中态、把 last target 的 leave 补一次（同样先清状态再 invoke）
      const leaveWhole = (event: Event): void => {
        if (lastTarget === null) return;
        const previousId = publicIdOf(lastTarget);
        lastTarget = null;
        if (previousId === null) return;
        invoke(handlers, previousId, RetikzEvent.PointerLeave, event, root, buildContext, renderer);
      };
      // pointerleave 不冒泡、只在指针真正离开 root 时触发——最干净的「离开整图」信号
      listen('pointerleave', leaveWhole);
      // 退化兜底：某些环境 pointerleave 缺失，用 pointerout 且 relatedTarget 落在 root 外判定离开整图
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
  } catch (cause) {
    try {
      runTeardowns(teardowns, true);
    } catch (cleanupCause) {
      throw new HydrationControllerSetupError(cause, cleanupCause, controller);
    }
    throw cause;
  }

  return controller;
};
