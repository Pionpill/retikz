/** 行级字段（每行可独立指定），未填走块级 TextPrim 默认 */
export type TextLine = {
  /** 行文字内容 */
  text: string;
  /** 行级字号 override（user units）；缺省走块级 TextPrim.fontSize */
  fontSize?: number;
  /** 行级字体族 override（CSS font-family）；缺省走块级 */
  fontFamily?: string;
  /** 行级字重 override（CSS font-weight）；缺省走块级 */
  fontWeight?: string | number;
  /** 行级字形 override；缺省走块级 */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** 行级文字颜色 override；缺省走块级 TextPrim.fill */
  fill?: string;
  /** 行级透明度 0..1 override；缺省走块级 */
  opacity?: number;
};

/**
 * 文本原语（measuredWidth/Height 由 Scene 编译阶段算好）
 * @description 多行 lines 至少 1 行；renderer 按 lineHeight 堆叠每行、按 baseline 在 (x,y) 锚点上下对齐。顶层属性是块级默认，单行 TextLine 可覆盖
 */
export type TextPrim = {
  type: 'text';
  /** 锚点横坐标（具体含义由 align 决定） */
  x: number;
  /** 锚点纵坐标（具体含义由 baseline 决定） */
  y: number;
  /** 至少 1 行；单行节点也用 `[{ text: 'Hello' }]` */
  lines: Array<TextLine>;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  align: 'start' | 'middle' | 'end';
  baseline: 'top' | 'middle' | 'bottom' | 'alphabetic';
  /** 行高，多行下相邻行的垂直距离 */
  lineHeight: number;
  /** 编译期算好的整块文字宽度 = max line width */
  measuredWidth: number;
  /** 编译期算好的整块文字高度 ≈ lines × lineHeight */
  measuredHeight: number;
  fill?: string;
  /** 整体透明度 0~1 */
  opacity?: number;
};
