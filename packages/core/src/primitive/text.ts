/**
 * 行级字段——`<tspan>` 上可独立指定的属性。
 * 块级（TextPrim 顶层）属性是默认值；行级未填字段走块级默认。
 */
export type TextLine = {
  /** 行内容（必填） */
  text: string;
  /** 行字号；未填走 TextPrim.fontSize */
  fontSize?: number;
  /** 行字体族；未填走 TextPrim.fontFamily */
  fontFamily?: string;
  /** 行字重；未填走 TextPrim.fontWeight */
  fontWeight?: string | number;
  /** 行字形；未填走 TextPrim.fontStyle */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** 行颜色；未填走 TextPrim.fill */
  fill?: string;
  /** 行透明度 0~1；未填走 TextPrim.opacity */
  opacity?: number;
};

/**
 * 文本原语；measuredWidth / Height 由 Scene 编译阶段算好，下游直接信任。
 *
 * 多行：`lines` 至少 1 行；renderer 把每行画为 `<tspan>`，按 `lineHeight` 堆叠，
 * 整块根据 `baseline` 在 (x, y) 锚点上下居中 / 顶 / 底对齐。
 *
 * 顶层 `fontSize` / `fontFamily` / `fontWeight` / `fontStyle` / `fill` / `opacity` 是默认值；
 * 单行可在 `TextLine` 上覆盖（仅生效于该行 `<tspan>`）。
 */
export type TextPrim = {
  /** 类型判别符 */
  type: 'text';
  /** 锚点横坐标（具体含义由 align 决定）；多行下作为每行 `<tspan>` 的 x */
  x: number;
  /** 锚点纵坐标（具体含义由 baseline 决定） */
  y: number;
  /** 文本行（至少 1 行）；单行节点也用 `[{ text: 'Hello' }]` 形式 */
  lines: Array<TextLine>;
  /** 块级默认字号 */
  fontSize: number;
  /** 块级默认字体族 */
  fontFamily?: string;
  /** 块级默认字重 */
  fontWeight?: string | number;
  /** 块级默认字形 */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** 水平对齐：start / middle / end 锚点位置 */
  align: 'start' | 'middle' | 'end';
  /** 垂直基线对齐方式 */
  baseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
  /** 行高（user units）；多行下相邻 `<tspan>` 的垂直距离 */
  lineHeight: number;
  /** 编译期算好的整块文字宽度（user units，= max line width） */
  measuredWidth: number;
  /** 编译期算好的整块文字高度（user units，≈ lines × lineHeight） */
  measuredHeight: number;
  /** 块级默认文字颜色 */
  fill?: string;
  /** 块级默认透明度 0~1 */
  opacity?: number;
};
