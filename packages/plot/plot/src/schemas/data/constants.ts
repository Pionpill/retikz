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

/**
 * 字段值解析格式关键字（暴露给用户；成员值即格式串，裸字面量 `'percent'` 同样可用）
 * @description 声明式（进 IR、可序列化）的内置解析覆盖；每个格式唯一绑定一个 type（temporal / continuous），
 *   省略 type 时由格式蕴含 type；解析优先级 resolveField.parse > FieldDef.format > 内置默认 coerce。
 */
export const PlotFieldFormat = {
  /** temporal：严格 ISO（默认，等价不写 format） */
  Iso: 'iso',
  /** temporal：数值 / 数值串按 epoch 秒 -> 毫秒（*1000） */
  EpochSeconds: 'epochSeconds',
  /** temporal：数值 / 数值串按 epoch 毫秒 */
  EpochMillis: 'epochMillis',
  /** temporal：严格 YYYY/MM/DD 斜杠日期，按 UTC 零点转 epoch ms（不收 D/M/Y、M/D/Y 等地区歧义布局） */
  SlashDate: 'slashDate',
  /** continuous：宽松数字串（容前后空白 / 千分位逗号），默认仅严格数字串 */
  NumberString: 'numberString',
  /** continuous：百分比串 '50%' -> 0.5 */
  Percent: 'percent',
} as const;

/** 字段值解析格式 */
export type PlotFieldFormatValue = ValueOf<typeof PlotFieldFormat>;

/** 内置格式名集合；自定义格式不得与之重名，内置与自定义经同一 resolveFormatRegistry 分派。 */
export const BUILTIN_FIELD_FORMATS: ReadonlySet<string> = new Set<string>(Object.values(PlotFieldFormat));

/** 是否内置格式名（收窄到 PlotFieldFormatValue，供按内置 / 自定义分支处理）。 */
export const isBuiltinFieldFormat = (format: string): format is PlotFieldFormatValue => BUILTIN_FIELD_FORMATS.has(format);
