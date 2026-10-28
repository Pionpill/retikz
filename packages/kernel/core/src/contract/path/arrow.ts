import type { MarkDefinition } from './mark';

/** 增加端点接触与截断几何的箭头定义 */
export type ArrowDefinition = Omit<MarkDefinition, 'anchor'> & {
  /** 局部几何沿箭头轴向的包络后缘，必须不晚于线接触点 */
  backX: number;
  /** 线接触点，决定路径截断与端点定位 */
  lineContactX: number;
  /**
   * 外轮廓补偿量；省略时空心定义使用已解析线宽的一半，实心定义使用 0
   * @default resolveArrowMark
   */
  outerInset?: number;
  /**
   * 尖端横坐标；省略时使用已解析的 baseSize，沿线放置时以尖端为锚点
   * @default resolveArrowMark
   */
  tipX?: number;
};

/** 声明端点箭头定义 */
export const defineArrow = (definition: ArrowDefinition): ArrowDefinition => definition;
