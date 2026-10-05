import type { PropertiesHyphen, SvgPropertiesHyphen } from 'csstype';

/**
 * SVG 结构 / 几何属性表（手工维护，用 SVG 真实拼写）
 * @description 键名一律用 SVG 真名：几何 / defs 属性裸 SVG 本就是 camelCase（`viewBox` / `refX` /
 *   `markerWidth`...），故照写。`data-*` 是水合挂点（如 `data-retikz-id`）
 */
export type SvgStructuralAttrs = {
  /** 元素 id（marker / clipPath / paint server 等被 `url(#id)` 引用） */
  id?: string;
  /** CSS class（动画播放：load track 的 `@keyframes` 经 class 挂到元素） */
  class?: string;
  /** 归一化弧长（pathDraw 动画：`pathLength=1` 让 stroke-dasharray/offset 按 0..1 揭示） */
  pathLength?: number | string;
  // —— 基本几何 ——
  /** 元素的横向位置，按对应 SVG 元素的坐标语义解释 */
  x?: number | string;
  /** 元素的纵向位置，按对应 SVG 元素的坐标语义解释 */
  y?: number | string;
  /** 元素或资源视口的宽度 */
  width?: number | string;
  /** 元素或资源视口的高度 */
  height?: number | string;
  /** 圆、椭圆或径向渐变中心的横坐标 */
  cx?: number | string;
  /** 圆、椭圆或径向渐变中心的纵坐标 */
  cy?: number | string;
  /** 圆或径向渐变的半径 */
  r?: number | string;
  /** 椭圆的横向半径或矩形的横向圆角半径 */
  rx?: number | string;
  /** 椭圆的纵向半径或矩形的纵向圆角半径 */
  ry?: number | string;
  /** 文本相对纵向位移或滤镜的纵向偏移 */
  dy?: number | string;
  /** 序列化的 SVG 路径命令字符串 */
  d?: string;
  /** 多边形顶点的 SVG 坐标列表字符串 */
  points?: string;
  /** 作用于元素及其内容的 SVG 变换序列 */
  transform?: string;
  // —— 通用结构 ——
  /** 按 x、y、宽、高顺序描述的局部可见坐标范围 */
  viewBox?: string;
  /** 视框映射到视口时的对齐与宽高比策略 */
  preserveAspectRatio?: string;
  /** 内容超出元素视口时的显示或裁剪方式 */
  overflow?: string;
  /** 图片或其它 SVG 引用资源的地址 */
  href?: string;
  /** 渐变色标在渐变轴上的位置，可用数值或百分比 */
  offset?: number | string;
  /** 标记朝向，可指定角度或按路径方向自动定向 */
  orient?: string;
  // —— marker ——
  /** 标记局部坐标中与路径端点对齐的横向参考位置 */
  refX?: number | string;
  /** 标记局部坐标中与路径端点对齐的纵向参考位置 */
  refY?: number | string;
  /** 标记视口的宽度，由 markerUnits 确定单位 */
  markerWidth?: number | string;
  /** 标记视口的高度，由 markerUnits 确定单位 */
  markerHeight?: number | string;
  /** 标记尺寸采用用户坐标还是描边宽度倍率 */
  markerUnits?: string;
  // —— gradient ——
  /** 线段或线性渐变起点的横坐标 */
  x1?: number | string;
  /** 线段或线性渐变起点的纵坐标 */
  y1?: number | string;
  /** 线段或线性渐变终点的横坐标 */
  x2?: number | string;
  /** 线段或线性渐变终点的纵坐标 */
  y2?: number | string;
  /** 渐变坐标采用对象包围盒还是用户坐标系 */
  gradientUnits?: string;
  /** 额外作用于渐变坐标系的变换 */
  gradientTransform?: string;
  // —— pattern ——
  /** 图案平铺位置与尺寸采用的坐标系 */
  patternUnits?: string;
  /** 图案单元内部几何采用的坐标系 */
  patternContentUnits?: string;
  /** 额外作用于图案坐标系的变换 */
  patternTransform?: string;
  // —— filter / feDropShadow ——
  /** filter region 坐标系（`userSpaceOnUse` 取 viewBox 区域，避免默认 objectBoundingBox 裁掉投影） */
  filterUnits?: string;
  /** 文本相对横向位移或滤镜的横向偏移 */
  dx?: number | string;
  /** 滤镜高斯模糊的标准差 */
  stdDeviation?: number | string;
  /** 水合挂点：builder 从 Scene 稳定 id 写入 `data-retikz-id`（命中定位 / per-id 动画用） */
  [k: `data-${string}`]: string | number | undefined;
};

/**
 * SVG 呈现属性表（kebab SVG 真名，值放宽到 `string | number`）
 * @description 手工小表（retikz 实际只用 ~20 个）。**不直接用 `csstype` 的 `SvgPropertiesHyphen` 作值类型**：
 *   csstype 把 SVG 呈现属性按 CSS 语义收得过死——`font-size` 等不收纯 number（SVG attribute 接受数字）、
 *   `dominant-baseline` 不含 SVG 专有值 `text-before-edge` / `text-after-edge`。故手工放宽，强类型靠 builder
 *   读 Scene 那端守。`csstype` 仍用于 `SvgStyle`（inline style）
 */
export type SvgPresentationAttrs = {
  /** 填充颜色、资源引用或 none */
  fill?: string;
  /** 描边颜色、资源引用或 none */
  stroke?: string;
  /** 元素及其内容整体的不透明度 */
  opacity?: number | string;
  /** 仅作用于填充区域的不透明度 */
  'fill-opacity'?: number | string;
  /** 路径内部区域采用非零环绕或奇偶规则判定 */
  'fill-rule'?: 'nonzero' | 'evenodd';
  /** 裁剪路径内部区域采用的填充判定规则 */
  'clip-rule'?: 'nonzero' | 'evenodd';
  /** 仅作用于描边的不透明度 */
  'stroke-opacity'?: number | string;
  /** 描边宽度，可使用 SVG 长度表达式 */
  'stroke-width'?: number | string;
  /** 描边的实线段与间隔长度序列 */
  'stroke-dasharray'?: number | string;
  /** 虚线序列相对路径起点的相位偏移 */
  'stroke-dashoffset'?: number | string;
  /** 开放路径端点的线帽形状 */
  'stroke-linecap'?: 'butt' | 'round' | 'square';
  /** 相邻路径段拐角处的描边连接形状 */
  'stroke-linejoin'?: 'miter' | 'round' | 'bevel';
  /** 元素是否参与指针命中 */
  'pointer-events'?: string;
  /** 元素及其后代是否从无障碍树中隐藏 */
  'aria-hidden'?: 'true' | 'false';
  /** 文本字号，可使用 SVG 长度表达式 */
  'font-size'?: number | string;
  /** 文本字体族或按优先级排列的字体族列表 */
  'font-family'?: string;
  /** 文本字重关键字或数值 */
  'font-weight'?: number | string;
  /** 文本的正常、斜体或倾斜字形 */
  'font-style'?: string;
  /** 文本起点、中点或终点与定位坐标的对齐方式 */
  'text-anchor'?: 'start' | 'middle' | 'end';
  /** 用于文本纵向对齐的主基线 */
  'dominant-baseline'?: string;
  /** 渐变色标的颜色 */
  'stop-color'?: string;
  /** 渐变色标的不透明度 */
  'stop-opacity'?: number | string;
  /** 应用到当前元素的裁剪路径资源引用 */
  'clip-path'?: string;
  /** 在路径起点绘制的标记资源引用 */
  'marker-start'?: string;
  /** 在路径终点绘制的标记资源引用 */
  'marker-end'?: string;
  /** drop shadow 滤镜引用（`url(#shadowId)`，指向去重注册的 `<filter><feDropShadow></filter>`） */
  filter?: string;
  /** feDropShadow flood-color（阴影颜色） */
  'flood-color'?: string;
  /** feDropShadow flood-opacity（阴影不透明度，相乘到有效 alpha） */
  'flood-opacity'?: number | string;
};

/** `SvgNode.attrs` 类型：呈现属性（kebab SVG 真名）+ 手工结构表 */
export type SvgAttrs = SvgStructuralAttrs & SvgPresentationAttrs;

/**
 * `SvgNode.style` 类型：仅承载含 `var()` 的颜色值（SVG attribute 不解析 CSS var，必须落 inline style）
 * @description 键用 CSS kebab 拼写（`fill` / `stroke`）；标准 CSS 属性走 `PropertiesHyphen`，SVG 呈现属性
 *   （`fill` / `stroke`）走 `SvgPropertiesHyphen`
 */
export type SvgStyle = PropertiesHyphen & Partial<SvgPropertiesHyphen>;

/** retikz 实际产出的 SVG 标签集（窄联合，让 builder 笔误编译期暴露） */
export type SvgTag =
  | 'svg'
  | 'defs'
  | 'style'
  | 'g'
  | 'line'
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
  | 'stop'
  | 'filter'
  | 'feDropShadow';

/**
 * framework-neutral SVG 描述节点（`@retikz/render/svg` 的核心产物）
 * @description 公开但非持久化：第三方框架 adapter（Vue / Svelte / Solid）消费它，受 semver 约束；但它不是
 *   IR，不写盘、不进 core。`attrs` 的 key 一律用 SVG 真名（呈现属性 kebab、结构属性规范拼写），于是字符串 /
 *   Vanilla / 多框架逐字输出零转换，唯有 React 需把呈现属性 kebab→camelCase
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
