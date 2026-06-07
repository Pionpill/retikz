import {
  type BuildContext,
  createContextBuilder,
  createHydrationController,
  createSvgAnimationControls,
  locateSvg,
  noopAnimationControls,
  resolvePointViaLayout,
  resolveSvgElement,
  resolveSvgPointViaCtm,
} from '@retikz/render/hydration';
import type { HydrateOptions, HydrationHandle } from './types';

/**
 * 把用户 handler 水合到容器内已挂的 `<svg>`（SSR 后的独立 SVG 水合入口）
 * @description SSR / `mountSvg` 先渲染出含 `data-retikz-id` 的图，本入口再把 handler 绑回图元——不重建 DOM、
 *   不接管状态，只做「图元 id ↔ 用户函数」绑定。用 `createHydrationController(root, handlers, locateSvg, buildContext)`
 *   在 `root` 上挂根级委托：事件经 `closest('[data-retikz-id]')` 反查图元 id，命中即以 `(event, ctx)` 触发对应
 *   handler；`pointerEnter` / `pointerLeave` 由控制器经 `pointermove` + 命中 id 状态机合成。返回 `{ dispose }` 解绑。
 *
 *   **ctx 能力分两档**：传 `options.scene`（可经 `toScene(ir)` 得到）→ 富 ctx——`meta` / `geometry` 经 Scene 按 id
 *   聚合查询、`point` 逆 meet-fit、`animation` 经 `data-retikz-id` / `data-retikz-animation-owner` 双查
 *   `getAnimations()` per-id 控制；不传 → 最小 ctx——`id` + `element` + `root` + `renderer`，`point` 退 `getScreenCTM`
 *   （浏览器有效、jsdom 为 null），`meta` / `geometry` / `scene` undefined、`animation` no-op。SSR 后要富 ctx 须把
 *   `scene` 一并传入。
 */
export const hydrate = (root: Element, options: HydrateOptions): HydrationHandle => {
  const renderer = options.renderer ?? 'svg';
  const scene = options.scene;
  const buildContext: BuildContext = createContextBuilder({
    renderer,
    root,
    scene,
    resolveElement: resolveSvgElement,
    resolvePoint: scene ? resolvePointViaLayout(root, scene.layout) : resolveSvgPointViaCtm(root),
    makeAnimation: scene ? id => createSvgAnimationControls(root, id) : () => noopAnimationControls,
  });
  const controller = createHydrationController(root, options.handlers, locateSvg, buildContext);
  return { dispose: controller.dispose };
};
