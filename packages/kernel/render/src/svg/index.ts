/*
 * @retikz/render/svg 公开 API —— framework-neutral SVG descriptor
 *
 * 纯函数，零框架运行时：Scene → `SvgNode` 描述树（`buildSvgDocument` / `buildSvgFragment`）
 * 或直接产字符串（`renderToSvgString`，SSR / 构建期）。
 * 字符串 / Vanilla / 多框架逐字消费 attrs（SVG 真名）；React 唯一需把呈现属性 kebab→camelCase。
 *
 * 公开 API 白名单（受 semver 约束）由本入口裁剪：builders 还供包内复用只读层组装，
 * 因此这里只显式转发公开 builder
 */

// ============ 描述树类型 ============
export * from './types';

// ============ builder（总装入口 + 粒度化）/ 字符串序列化 ============
export {
  buildArrowMarker,
  buildClipDef,
  buildPaintDef,
  buildPrim,
  buildSvgDocument,
  buildSvgFragment,
  buildSvgFrameDocument,
} from './builders';
export type { SvgDocumentOptions, SvgPrimitiveBuildContext } from './builders';
export * from './serialize';

// ============ renderer-neutral 几何 / 字符串工具（src 下扁平文件，本就与框架无关，多 renderer 共用） ============
export * from './path-d-builder';
export * from './transform-builder';
export * from './view-box';

// ============ 动画播放（SVG 后端）：CSS @keyframes + WAAPI 描述类型 ============
export type { CubicBezier, EasingFn } from '../animation';
export * from '../trace';
export * from './animation';
