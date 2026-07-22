/** 一条按格点整数索引枚举出的网格线位置 */
export type GridLatticeValue = {
  /** 用户坐标中的线位置 */
  value: number;
  /** 相对于 origin 的整数格点索引。补入的边界线没有索引 */
  index?: number;
};

/** 枚举单轴网格线时使用的输入 */
export type GridLatticeOptions = {
  /** 闭区间最小值 */
  min: number;
  /** 闭区间最大值 */
  max: number;
  /** 正的网格间距 */
  spacing: number;
  /** 格点对齐原点 */
  origin: number;
  /** 是否补入未命中的区间边界 */
  includeBoundary: boolean;
};
