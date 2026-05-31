/**
 * @retikz/vanilla 公开 API —— framework-free runtime / SSR 入口
 *
 * 无框架 / SSR 的 runtime 门面：组合 `@retikz/svg`（descriptor / 字符串）与 `@retikz/canvas`（后置），
 * 不自维护第二套 Scene→输出内核。`renderToSvgString` 走 SSR（零 DOM）；`mountSvg` 走浏览器 DOM 挂载。
 * 模块顶层不触碰任何 DOM 全局——`import` 在纯 Node 下安全。
 */
export { renderToSvgString } from './renderToSvgString';
export { mountSvg } from './mountSvg';
export type { RenderInput, CommonOptions, MountOptions, RenderToStringOptions, VanillaView } from './types';
