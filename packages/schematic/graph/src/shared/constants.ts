/** Graph 复合元素的命名空间 */
export const GRAPH_NAMESPACE = 'graph' as const;

/** GraphFrame 和内容外壳使用的中性样式默认值 */
export const GraphNeutralStyle = {
  /** 默认不填充外壳 */
  fill: 'transparent',
  /** 默认使用当前文本颜色绘制轮廓 */
  stroke: 'currentColor',
  /** 默认轮廓宽度 */
  strokeWidth: 1,
  /** 默认完全不透明 */
  opacity: 1,
} as const;

/** 内容驱动的双轴尺寸默认值 */
export const GraphContentSizeDefault = {
  /** 水平方向由内容决定尺寸 */
  x: { kind: 'content' },
  /** 垂直方向由内容决定尺寸 */
  y: { kind: 'content' },
} as const;

/** Graph 正式元素的稳定判别值 */
export const GraphElementType = {
  /** 包含分区内容的图框架 */
  GraphFrame: 'graphFrame',
  /** 表示图中具有关系语义的节点 */
  GraphNode: 'graphNode',
  /** 表示图式元素间关系的连接线 */
  GraphConnector: 'graphConnector',
} as const;
