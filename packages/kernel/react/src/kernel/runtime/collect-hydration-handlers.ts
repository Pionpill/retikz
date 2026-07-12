import type { ElementHandlers, HydrationHandler, HydrationHandlers } from '@retikz/render/hydration';
import type { ReactNode } from 'react';

import { Children, Fragment, isValidElement } from 'react';

import type { EmbeddableTier2Adapter } from '../protocol';
import type { HydrationEventPropName } from '../protocol';

import { getDisplayName, TIKZ_COORDINATE, TIKZ_NODE, TIKZ_PATH, TIKZ_SCOPE } from '../protocol';
import { resolveEmbeddableAdapter } from '../protocol';
import { EVENT_PROP_TO_NAME } from '../protocol';

/** 从一个元素 props 读出 `on<Event>` handler，翻译成 RetikzEventValue → handler 的 ElementHandlers（无 handler 返回空对象） */
const readElementHandlers = (props: Record<string, unknown>): ElementHandlers => {
  const handlers: ElementHandlers = {};
  for (const propName of Object.keys(EVENT_PROP_TO_NAME) as Array<HydrationEventPropName>) {
    const handler = props[propName];
    if (typeof handler === 'function') {
      handlers[EVENT_PROP_TO_NAME[propName]] = handler as HydrationHandler;
    }
  }
  return handlers;
};

/**
 * 把一个元素的 id + handlers 合并进注册表（处理无 id / 重复 id 规则）
 * @description 有 handler 但无 `id` → dev warn + 跳过；有 `id`：重复 id 时合并不同事件、同事件后者覆盖（并 dev warn）。
 *   无 handler 的元素（即使有 id）不进注册表——注册表只收真正绑了 handler 的挂点。
 */
const mergeElement = (registry: Map<string, ElementHandlers>, id: unknown, handlers: ElementHandlers): void => {
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
  const existing = registry.get(id);
  if (existing === undefined) {
    registry.set(id, { ...handlers });
    return;
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[retikz] 水合：重复 id "${id}"——合并各元素的事件 handler，同一事件以后出现者覆盖先出现者。`);
  }
  Object.assign(existing, handlers);
};

/**
 * 从 React DSL children 收集元素事件 handler
 * @description 带 `id` 且声明了 `on<Event>` 的元素会注册为水合事件挂点；`<Scope>` 和普通函数式 Sugar 会继续读取子元素。
 *   带 handler 但无 `id` 的元素会在开发环境告警并跳过；重复 `id` 会合并不同事件，同一事件以后出现者覆盖。
 */
const visit = (
  registry: Map<string, ElementHandlers>,
  children: ReactNode,
  embeddables?: ReadonlyArray<EmbeddableTier2Adapter>,
): void => {
  Children.forEach(children, child => {
    if (!isValidElement(child)) return;
    const props = child.props as Record<string, unknown>;
    if (child.type === Fragment) {
      visit(registry, props.children as ReactNode, embeddables);
      return;
    }
    const handlers = readElementHandlers(props);
    mergeElement(registry, props.id, handlers);
    const name = getDisplayName(child);
    switch (name) {
      case TIKZ_SCOPE:
        // 容器：递归子级（与 builder 的 buildScopeFromProps → readSceneChildren 同源）。
        visit(registry, props.children as ReactNode, embeddables);
        return;
      case TIKZ_NODE:
      case TIKZ_PATH:
      case TIKZ_COORDINATE:
        // Kernel 叶子：children 是 Step / Text / Label，无事件挂点，不递归。
        return;
    }
    if (typeof child.type === 'function') {
      // 可嵌入 Tier2：自身 id + handler 已被上方 mergeElement 捕获；其内部由 composite lowering 管理，
      // 绝不调用 / 递归该组件。resolveEmbeddableAdapter 在「标记但缺 adapter」时 fail-loud throw（与 builder 一致）。
      const adapter = resolveEmbeddableAdapter(child.type, getDisplayName(child), embeddables);
      if (adapter) return;
      // 其余函数式组件（Sugar / 自定义 wrapper）：同步展开后递归，捕获展开后的 id-bearing Kernel 元素。
      const expanded = (child.type as (props: unknown) => ReactNode)(props);
      visit(registry, expanded, embeddables);
    }
  });
};

/**
 * 按元素 `id` 收集水合 handler props
 * @description 返回 `{ [id]: { click, pointerEnter, ... } }` 注册表，供 `<Layout>` 在渲染后绑定事件。
 *   带 handler 但无 `id` 会跳过并在开发环境告警；重复 `id` 会合并不同事件，同一事件以后出现者覆盖。
 */
export const collectHydrationHandlers = (
  children: ReactNode,
  embeddables?: ReadonlyArray<EmbeddableTier2Adapter>,
): HydrationHandlers => {
  const registry = new Map<string, ElementHandlers>();
  visit(registry, children, embeddables);
  return Object.fromEntries(registry);
};
