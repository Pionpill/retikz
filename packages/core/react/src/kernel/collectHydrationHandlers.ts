import {
  Children,
  Fragment,
  type ReactElement,
  type ReactNode,
  isValidElement,
} from 'react';
import type { ElementHandlers, HydrationHandlers } from '@retikz/render/hydration';
import { EVENT_PROP_TO_NAME, type HydrationEventPropName } from './eventProps';

/** 取 React 元素 type 上的 displayName；type 为字符串时直接返回（与 builder 同源识别 Kernel/Sugar 组件） */
const getDisplayName = (element: ReactElement): string | undefined => {
  const type = element.type as { displayName?: string } | string;
  if (typeof type === 'string') return type;
  return type.displayName;
};

/** 从一个元素 props 读出 `on<Event>` handler，翻译成 EventName → handler 的 ElementHandlers（无 handler 返回空对象） */
const readElementHandlers = (props: Record<string, unknown>): ElementHandlers => {
  const handlers: ElementHandlers = {};
  for (const propName of Object.keys(EVENT_PROP_TO_NAME) as Array<HydrationEventPropName>) {
    const handler = props[propName];
    if (typeof handler === 'function') {
      handlers[EVENT_PROP_TO_NAME[propName]] = handler as (event: Event) => void;
    }
  }
  return handlers;
};

/**
 * 把一个元素的 id + handlers 合并进注册表（处理无 id / 重复 id 规则）
 * @description 有 handler 但无 `id` → dev warn + 跳过；有 `id`：重复 id 时合并不同事件、同事件后者覆盖（并 dev warn）。
 *   无 handler 的元素（即使有 id）不进注册表——注册表只收真正绑了 handler 的挂点。
 */
const mergeElement = (
  registry: HydrationHandlers,
  id: unknown,
  handlers: ElementHandlers,
): void => {
  const eventNames = Object.keys(handlers);
  if (eventNames.length === 0) return;
  if (typeof id !== 'string' || id.length === 0) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[retikz] 水合：元素带事件 handler 但缺少 `id`，无法定位挂点——该元素的 handler 被跳过。给它加一个 `id` 即可绑定。',
      );
    }
    return;
  }
  if (!Object.hasOwn(registry, id)) {
    registry[id] = { ...handlers };
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      `[retikz] 水合：重复 id "${id}"——合并各元素的事件 handler，同一事件以后出现者覆盖先出现者。`,
    );
  }
  Object.assign(registry[id], handlers);
};

/**
 * 与 `readSceneChildren` 同源遍历 children，按各元素自身的 id 收 handler
 * @description 穿透 `Fragment`、对函数式（Sugar）组件递归其同步展开结果（与 builder 一致），但 id + handler props
 *   始终读自**元素自身**——Sugar 把 `id` / `on<Event>` 写在 Sugar 元素上（不向展开后的 Kernel 透传），故归属
 *   仍落到承载该 id 的挂点。非元素 / 非 id 元素静默跳过。
 */
const visit = (registry: HydrationHandlers, children: ReactNode): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const props = child.props as Record<string, unknown>;
    if (child.type === Fragment) {
      visit(registry, props.children as ReactNode);
      return;
    }
    const handlers = readElementHandlers(props);
    mergeElement(registry, props.id, handlers);
    // Sugar（函数式组件）：递归其同步展开，捕获展开后可能新增的 id-bearing Kernel 元素（与 builder 同源）。
    // Kernel marker（Node / Path / Coordinate / Scope）自身不渲染、无需展开。
    const name = getDisplayName(child);
    if (
      name === undefined &&
      typeof child.type === 'function'
    ) {
      const expanded = (child.type as (props: unknown) => ReactNode)(props);
      visit(registry, expanded);
    }
  });
};

/**
 * 与 `buildIR` 同源遍历 children，按元素 `id` 收集水合 handler props
 * @description 穿透 `Fragment`、同步展开 Sugar（与 builder 的 `readSceneChildren` 一致），把各元素上的
 *   `on<Event>` props 按其 `id` 收成 `{ [id]: { click, pointerEnter, ... } }`（prop 名经 `EVENT_PROP_TO_NAME`
 *   翻译为 EventName）。规则：带 handler 但无 `id` → dev warn + 跳过；重复 `id` → dev warn，同 id 合并不同事件、
 *   同事件后者覆盖；Sugar 元素的 handler 归到其承载 `id` 的挂点。函数 / handler 绝不进 IR，只活在 runtime 注册表。
 */
export const collectHydrationHandlers = (children: ReactNode): HydrationHandlers => {
  const registry: HydrationHandlers = {};
  visit(registry, children);
  return registry;
};
