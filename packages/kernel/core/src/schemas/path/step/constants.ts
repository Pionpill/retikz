export const GeometryLabelPlacement = {
  Outside: 'outside',
  Inside: 'inside',
} as const;

/** path-like 几何标签沿段的位置关键字 */
export const GeometryLabelPosition = {
  /** 段起点 */
  AtStart: 'at-start',
  /** 非常靠近段起点 */
  VeryNearStart: 'very-near-start',
  /** 靠近段起点 */
  NearStart: 'near-start',
  /** 段中点 */
  Midway: 'midway',
  /** 靠近段终点 */
  NearEnd: 'near-end',
  /** 非常靠近段终点 */
  VeryNearEnd: 'very-near-end',
  /** 段终点 */
  AtEnd: 'at-end',
} as const;

export const FoldStepVia = {
  /** 先水平后垂直 */
  HorizontalThenVertical: '-|',
  /** 先垂直后水平 */
  VerticalThenHorizontal: '|-',
  /** 水平、垂直、水平三段连接 */
  HorizontalVerticalHorizontal: '-|-',
  /** 垂直、水平、垂直三段连接 */
  VerticalHorizontalVertical: '|-|',
} as const;

/** bend step 相对起终点方向的弯曲侧 */
export const BendDirection = {
  /** 向视觉左侧弯曲 */
  Left: 'left',
  /** 向视觉右侧弯曲 */
  Right: 'right',
} as const;

/** 圆 / 椭圆 path 局部弧段闭合方式 */
export const PathCloseMode = {
  /** 完整闭合路径 */
  Closed: 'closed',
  /** 以弦连接弧段两端 */
  Chord: 'chord',
  /** 保持弧段开放 */
  Open: 'open',
  /** 连接到圆心形成扇形 */
  Sector: 'sector',
} as const;
