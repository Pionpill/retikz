/**
 * @retikz/vanilla 公开 API —— framework-free runtime / SSR 入口 + plain spec helpers
 *
 * 无框架 / SSR 的 runtime 门面：组合 `@retikz/render/svg`（descriptor / 字符串）与 `@retikz/render/canvas`（后置），
 * 不自维护第二套 Scene→输出内核。`renderToSvgString` 走 SSR（零 DOM）；`mount` / `mountSvg` / `mountCanvas`
 * 走浏览器挂载。`figure` / `layer` / `node` / `path` / `coordinate` / `scope` / `embed` 是 plain spec helper；
 * 旧命令式 builder 仅以 `legacyFigure` / `draw` 形态保留迁移入口。
 * 模块顶层不触碰任何 DOM 全局——`import` 在纯 Node 下安全。
 */
export * from './hydrate';
export * from './mount';
export * from './mount-canvas';
export * from './mount-svg';
export * from './render-to-svg-string';
// 透传 render 层水合 runtime 类型，方便 vanilla 用户单包 import（事件名 / 注册表 / handler context 类型）
export type {
  HydrationAnimationControls,
  HydrationContext,
  HydrationGeometry,
  HydrationHandler,
  HydrationHandlers,
  RetikzEventValue,
} from '@retikz/render/hydration';
export * from './builder';
export * from './figure';
export * from './spec';
export * from './types';
export type {
  AnimationPropertyDefinition,
  AnimationPropertyRegistry,
  CubicBezier,
  EasingFn,
  EasingRegistry,
} from '@retikz/render/animation';
