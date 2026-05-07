/** 文本原语；measuredWidth/Height 由 Scene 编译阶段算好，下游直接信任 */
export type TextPrim = {
  /** 类型判别符 */
  type: 'text';
  /** 锚点横坐标（具体含义由 align 决定） */
  x: number;
  /** 锚点纵坐标（具体含义由 baseline 决定） */
  y: number;
  /** 文本内容 */
  content: string;
  /** 字号 */
  fontSize: number;
  /** 字体族 */
  fontFamily?: string;
  /** 字重 */
  fontWeight?: string | number;
  /** 字形 */
  fontStyle?: 'normal' | 'italic';
  /** 水平对齐：start / middle / end 锚点位置 */
  align: 'start' | 'middle' | 'end';
  /** 垂直基线对齐方式 */
  baseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
  /** 编译期算好的文字宽度（user units） */
  measuredWidth: number;
  /** 编译期算好的文字高度（user units） */
  measuredHeight: number;
  /** 文字颜色 */
  fill?: string;
  /** 整体透明度 0~1 */
  opacity?: number;
};
