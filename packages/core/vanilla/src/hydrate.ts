import { createHydrationController, locateSvg } from '@retikz/render/hydration';
import type { HydrateOptions, HydrationHandle } from './types';

/**
 * 把用户 handler 水合到容器内已挂的 `<svg>`（无框架 SVG 水合入口）
 * @description SSR / `mountSvg` 先渲染出含 `data-retikz-id` 的图，本入口再把 handler 绑回图元——不重建 DOM、
 *   不接管状态，只做「图元 id ↔ 用户函数」绑定。用 `@retikz/render/hydration` 的 `createHydrationController(root,
 *   handlers, locateSvg)` 在 `root` 上挂根级委托：事件经 `closest('[data-retikz-id]')` 反查图元 id，命中即触发
 *   对应 handler；`pointerEnter` / `pointerLeave` 由控制器据 `relatedTarget` 合成。返回 `{ dispose }` 解绑。
 */
export const hydrate = (root: Element, options: HydrateOptions): HydrationHandle => {
  void root;
  void options;
  void createHydrationController;
  void locateSvg;
  // stub：Impl Agent 接 createHydrationController(root, options.handlers, locateSvg) 并回传其 { dispose }
  return { dispose() {} };
};
