/**
 * 文本原语；measuredWidth / Height 由 Scene 编译阶段算好，下游直接信任。
 *
 * 多行：`lines` 至少 1 行；renderer 把每行画为 `<tspan>`，按 `lineHeight` 堆叠，
 * 整块根据 `baseline` 在 (x, y) 锚点上下居中 / 顶 / 底对齐。
 */
export type TextPrim = {
  /** 类型判别符 */
  type: 'text';
  /** 锚点横坐标（具体含义由 align 决定）；多行下作为每行 `<tspan>` 的 x */
  x: number;
  /** 锚点纵坐标（具体含义由 baseline 决定） */
  y: number;
  /** 文本行（至少 1 行）；单行节点也用 `['Hello']` 形式 */
  lines: Array<string>;
  /** 字号 */
  fontSize: number;
  /** 字体族 */
  fontFamily?: string;
  /** 字重 */
  fontWeight?: string | number;
  /** 字形 */
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
  /** 文字颜色 */
  fill?: string;
  /** 整体透明度 0~1 */
  opacity?: number;
};
