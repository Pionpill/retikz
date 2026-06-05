import type { ReactNode } from 'react';
import type { HydrationHandlers } from '@retikz/render/hydration';

/**
 * 与 `buildIR` 同源遍历 children，按元素 `id` 收集水合 handler props
 * @description 穿透 `Fragment`、同步展开 Sugar（与 builder 的 `readSceneChildren` 一致），把各 Kernel 元素上的
 *   `on<Event>` props 按其 `id` 收成 `{ [id]: { click, pointerEnter, ... } }`（prop 名经 `EVENT_PROP_TO_NAME`
 *   翻译为 EventName）。规则：带 handler 但无 `id` → dev warn + 跳过；重复 `id` → dev warn，同 id 合并不同事件、
 *   同事件后者覆盖；Sugar 元素的 handler 归到其展开后承载 `id` 的 Kernel 元素。函数 / handler 绝不进 IR，
 *   只活在 runtime 注册表。
 *
 * @remarks stub：收集逻辑留待 Impl 实装，当前恒返回空注册表（相关测试此刻预期 fail）。
 */
export const collectHydrationHandlers = (children: ReactNode): HydrationHandlers => {
  void children;
  return {};
};
