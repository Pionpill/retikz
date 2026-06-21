import type { ValueOf } from '@retikz/core';

/**
 * 字段类型关键字（暴露给用户；成员值即字段类型串，裸字面量 `'continuous'` 同样可用）
 * @description 字段测量种类；驱动 lowering 的缺省推断、type-driven scale 选型与 guide 格式化。
 */
export const PlotFieldType = {
  /** 连续：可度量、间距有意义的数值（销量 / 温度 / 价格 / 占比），默认 linear scale */
  Continuous: 'continuous',
  /** 分类：离散类别标签（国家 / 颜色名 / 评级），只判等不取间距，默认 band scale */
  Categorical: 'categorical',
  /** 时间：日期 / 时间戳，走 time scale */
  Temporal: 'temporal',
} as const;

/** 字段测量类型 */
export type PlotFieldTypeValue = ValueOf<typeof PlotFieldType>;
