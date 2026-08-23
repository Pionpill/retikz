/**
 * 字段测量类型关键字。
 * @description 字段测量种类；驱动 lowering 的缺省推断、type-driven scale 选型与 guide 格式化
 */
export const DataFieldType = {
  /** 连续：可度量、间距有意义的数值（销量 / 温度 / 价格 / 占比），默认 linear scale */
  Continuous: 'continuous',
  /** 分类：离散类别标签（国家 / 颜色名 / 评级），只判等不取间距，默认 band scale */
  Categorical: 'categorical',
  /** 时间：日期 / 时间戳，走 time scale */
  Temporal: 'temporal',
} as const;

/** 分类字段顺序策略 */
export const FieldOrderMode = {
  /** 按绑定数据里的首次出现顺序排列分类值；对应 IR 字面量仍为 `data` */
  Appearance: 'appearance',
  /** 按分类值升序排列；数值用数值比较，其余用字符串比较 */
  Ascending: 'ascending',
  /** 按分类值降序排列；数值用数值比较，其余用字符串比较 */
  Descending: 'descending',
} as const;

/** 内置字段值解析格式名 */
export const DataFieldFormat = {
  /** temporal：严格 ISO（默认，等价不写 format） */
  Iso: 'iso',
  /** temporal：数值 / 数值串按 epoch 秒换算为毫秒 */
  EpochSeconds: 'epochSeconds',
  /** temporal：数值 / 数值串按 epoch 毫秒 */
  EpochMillis: 'epochMillis',
  /** temporal：严格 YYYY/MM/DD 斜杠日期 */
  SlashDate: 'slashDate',
  /** continuous：宽松数字串 */
  NumberString: 'numberString',
  /** continuous：百分比串 */
  Percent: 'percent',
} as const;
