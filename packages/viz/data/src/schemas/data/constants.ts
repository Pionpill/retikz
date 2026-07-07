import type { ValueOf } from '@retikz/core';

/**
 * 字段测量类型关键字。
 * @description 字段测量种类；驱动 lowering 的缺省推断、type-driven scale 选型与 guide 格式化。
 */
export const DataFieldType = {
  /** 连续：可度量、间距有意义的数值（销量 / 温度 / 价格 / 占比），默认 linear scale */
  Continuous: 'continuous',
  /** 分类：离散类别标签（国家 / 颜色名 / 评级），只判等不取间距，默认 band scale */
  Categorical: 'categorical',
  /** 时间：日期 / 时间戳，走 time scale */
  Temporal: 'temporal',
} as const;

/** 字段测量类型取值。 */
export type DataFieldTypeValue = ValueOf<typeof DataFieldType>;

/**
 * 分类字段顺序策略。
 * @description `data` 保留首次出现顺序；ascending / descending 对分类值排序；显式数组顺序由 schema 字段承载。
 */
export const FieldOrderMode = {
  Data: 'data',
  Ascending: 'ascending',
  Descending: 'descending',
} as const;

/** 分类字段顺序策略取值。 */
export type FieldOrderModeValue = ValueOf<typeof FieldOrderMode>;
