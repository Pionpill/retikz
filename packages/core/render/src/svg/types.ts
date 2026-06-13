import type { PropertiesHyphen, SvgPropertiesHyphen } from 'csstype';

/**
 * SVG 结构 / 几何属性表（手工维护，用 SVG 真实拼写）
 * @description 键名一律用 SVG 真名：几何 / defs 属性裸 SVG 本就是 camelCase（`viewBox` / `refX` /
 *   `markerWidth`...），故照写。`data-*` 是水合挂点（如 `data-retikz-id`）。
 */
export type SvgStructuralAttrs = {
  /** 元素 id（marker / clipPath / paint server 等被 `url(#id)` 引用） */
  id?: string;
  /** CSS class（动画播放：load track 的 `@keyframes` 经 class 挂到元素） */
  class?: string;
  /** 归一化弧长（pathDraw 动画：`pathLength=1` 让 stroke-dasharray/offset 按 0..1 揭示） */
  pathLength?: number | string;
  // —— 基本几何 ——
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  cx?: number | string;
  cy?: number | string;
  r?: number | string;
  rx?: number | string;
  ry?: number | string;
  dy?: number | string;
  d?: string;
  points?: string;
  transform?: string;
  // —— 通用结构 ——
  viewBox?: string;
  preserveAspectRatio?: string;
  overflow?: string;
  href?: string;
  offset?: number | string;
  orient?: string;
  // —— marker ——
  refX?: number | string;
  refY?: number | string;
  markerWidth?: number | string;
  markerHeight?: number | string;
  markerUnits?: string;
  // —— gradient ——
  x1?: number | string;
  y1?: number | string;
  x2?: number | string;
  y2?: number | string;
  gradientUnits?: string;
  gradientTransform?: string;
  // —— pattern ——
  patternUnits?: string;
  patternContentUnits?: string;
  patternTransform?: string;
  /** 水合挂点：builder 从 Scene 稳定 id 写入 `data-retikz-id`（命中定位 / per-id 动画用） */
  [k: `data-${string}`]: string | number | undefined;
};

/**
 * SVG 呈现属性表（kebab SVG 真名，值放宽到 `string | number`）
 * @description 手工小表（retikz 实际只用 ~20 个）。**不直接用 `csstype` 的 `SvgPropertiesHyphen` 作值类型**：
 *   csstype 把 SVG 呈现属性按 CSS 语义收得过死——`font-size` 等不收纯 number（SVG attribute 接受数字）、
 *   `dominant-baseline` 不含 SVG 专有值 `text-before-edge` / `text-after-edge`。故手工放宽，强类型靠 builder
 *   读 Scene 那端守。`csstype` 仍用于 `SvgStyle`（inline style）。
 */
export type SvgPresentationAttrs = {
  fill?: string;
  stroke?: string;
  opacity?: number | string;
  'fill-opacity'?: number | string;
  'fill-rule'?: 'nonzero' | 'evenodd';
  'stroke-opacity'?: number | string;
  'stroke-width'?: number | string;
  'stroke-dasharray'?: number | string;
  'stroke-dashoffset'?: number | string;
  'stroke-linecap'?: 'butt' | 'round' | 'square';
  'stroke-linejoin'?: 'miter' | 'round' | 'bevel';
  'font-size'?: number | string;
  'font-family'?: string;
  'font-weight'?: number | string;
  'font-style'?: string;
  'text-anchor'?: 'start' | 'middle' | 'end';
  'dominant-baseline'?: string;
  'stop-color'?: string;
  'stop-opacity'?: number | string;
  'clip-path'?: string;
  'marker-start'?: string;
  'marker-end'?: string;
};

/** `SvgNode.attrs` 类型：呈现属性（kebab SVG 真名）+ 手工结构表 */
export type SvgAttrs = SvgStructuralAttrs & SvgPresentationAttrs;

/**
 * `SvgNode.style` 类型：仅承载含 `var()` 的颜色值（SVG attribute 不解析 CSS var，必须落 inline style）
 * @description 键用 CSS kebab 拼写（`fill` / `stroke`）；标准 CSS 属性走 `PropertiesHyphen`，SVG 呈现属性
 *   （`fill` / `stroke`）走 `SvgPropertiesHyphen`。
 */
export type SvgStyle = PropertiesHyphen & Partial<SvgPropertiesHyphen>;

/** retikz 实际产出的 SVG 标签集（窄联合，让 builder 笔误编译期暴露） */
export type SvgTag =
  | 'svg'
  | 'defs'
  | 'style'
  | 'g'
  | 'rect'
  | 'ellipse'
  | 'circle'
  | 'path'
  | 'text'
  | 'tspan'
  | 'polygon'
  | 'marker'
  | 'clipPath'
  | 'linearGradient'
  | 'radialGradient'
  | 'pattern'
  | 'image'
  | 'stop';

/**
 * framework-neutral SVG 描述节点（`@retikz/render/svg` 的核心产物）
 * @description 公开但非持久化：第三方框架 adapter（Vue / Svelte / Solid）消费它，受 semver 约束；但它不是
 *   IR，不写盘、不进 core。`attrs` 的 key 一律用 SVG 真名（呈现属性 kebab、结构属性规范拼写），于是字符串 /
 *   Vanilla / 多框架逐字输出零转换，唯有 React 需把呈现属性 kebab→camelCase。
 */
export type SvgNode = {
  /** 标签名 */
  tag: SvgTag;
  /** 属性（键 = SVG 真名） */
  attrs: SvgAttrs;
  /** inline style（仅含 `var()` 的颜色值） */
  style?: SvgStyle;
  /** 子节点（`string` 给 tspan / 文本内容） */
  children?: Array<SvgNode | string>;
};
