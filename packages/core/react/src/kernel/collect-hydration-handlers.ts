import { Children, Fragment, type ReactNode, isValidElement } from 'react';
import type { ElementHandlers, HydrationHandler, HydrationHandlers } from '@retikz/render/hydration';
import { EVENT_PROP_TO_NAME, type HydrationEventPropName } from './event-props';
import { type EmbeddableTier2Adapter, resolveEmbeddableAdapter } from './embeddable';
import {
  TIKZ_COORDINATE,
  TIKZ_NODE,
  TIKZ_PATH,
  TIKZ_SCOPE,
  getDisplayName,
} from './_displayNames';

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
 * @description 与 builder 的 `readSceneChildren` 逐分支对齐：穿透 `Fragment`；`<Scope>` 是容器，递归其 children
 *   捕获内层 id-bearing 元素；`<Node>` / `<Path>` / `<Coordinate>` 是叶子（children 为 Step / Text / Label，无事件
 *   挂点），不递归；其余函数式组件视为 Sugar / wrapper，同步展开后递归（覆盖带 displayName 的自定义 wrapper）。
 *   id + handler props 始终读自**元素自身**——Sugar 的 `on<Event>` 写在 Sugar 元素上（不向展开后的 Kernel 透传），
 *   `id` 则经 pickPathVisual 透传给底层挂点，故事件归属与挂点 id 一致；展开后的内层元素无 handler、不重复注册。
 *   可嵌入 Tier2 子组件先在上方 `mergeElement` 捕获其自身的 id + `on<Event>`，但其内部由 composite lowering 管理，
 *   绝不调用 / 递归该组件（避免 render 阶段触发其 hook / 副作用——这正是本特性要修的崩溃）。非元素静默跳过。
 */
const visit = (
  registry: HydrationHandlers,
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
 * 与 `buildIR` 同源遍历 children，按元素 `id` 收集水合 handler props
 * @description 穿透 `Fragment`、同步展开 Sugar（与 builder 的 `readSceneChildren` 一致），把各元素上的
 *   `on<Event>` props 按其 `id` 收成 `{ [id]: { click, pointerEnter, ... } }`（prop 名经 `EVENT_PROP_TO_NAME`
 *   翻译为 RetikzEventValue）。规则：带 handler 但无 `id` → dev warn + 跳过；重复 `id` → dev warn，同 id 合并不同事件、
 *   同事件后者覆盖；Sugar 元素的 handler 归到其承载 `id` 的挂点。可嵌入 Tier2 子组件只捕获其自身挂点的
 *   handler、不被调用 / 递归（与 builder 同源）。函数 / handler 绝不进 IR，只活在 runtime 注册表。
 */
export const collectHydrationHandlers = (
  children: ReactNode,
  embeddables?: ReadonlyArray<EmbeddableTier2Adapter>,
): HydrationHandlers => {
  const registry: HydrationHandlers = {};
  visit(registry, children, embeddables);
  return registry;
};
