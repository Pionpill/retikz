/** 一条按整数索引枚举出的格点位置 */
export type LatticeValue = {
  /** 用户坐标中的位置 */
  value: number;
  /** 相对于 origin 的整数格点索引。补入的边界位置没有索引 */
  index?: number;
};

/** 枚举单轴格点时使用的输入 */
export type LatticeOptions = {
  /** 闭区间最小值 */
  min: number;
  /** 闭区间最大值 */
  max: number;
  /** 正的格点间距 */
  spacing: number;
  /** 格点对齐原点 */
  origin: number;
  /** 是否补入未命中的区间边界 */
  includeBoundary: boolean;
};
