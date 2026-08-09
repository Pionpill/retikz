/** Notation 复合元素的命名空间 */
export const NOTATION_NAMESPACE = 'notation' as const;

/** LogicFrame 和内容外壳使用的中性样式默认值 */
export const LogicNeutralStyle = {
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
export const LogicContentSizeDefault = {
  /** 水平方向由内容决定尺寸 */
  x: { kind: 'content' },
  /** 垂直方向由内容决定尺寸 */
  y: { kind: 'content' },
} as const;

/** Notation 正式元素的稳定判别值 */
export const NotationElementType = {
  /** 包含分区内容的逻辑框架 */
  LogicFrame: 'logicFrame',
  /** 表示流程起点或终点的基础单元 */
  Terminal: 'terminal',
  /** 表示流程处理或动作的基础单元 */
  Stage: 'stage',
  /** 表示条件或分支的基础单元 */
  Decision: 'decision',
  /** 表示分叉、汇合或延续点的基础单元 */
  Junction: 'junction',
  /** 表示图式元素间关系的连接线 */
  Connector: 'connector',
  /** 依附目标的说明标注 */
  Callout: 'callout',
} as const;
