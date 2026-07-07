import type { ValueOf } from '@retikz/core';

/**
 * 内置字段值解析格式名。
 * @description 这些名字只声明内置 FieldFormatDefinition 的注册键；schema 只校验非空字符串，具体格式是否存在由 format registry 在 lowering 时解析。
 */
export const DataFieldFormat = {
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

/** 内置字段值解析格式名取值。 */
export type DataFieldFormatValue = ValueOf<typeof DataFieldFormat>;

/** 内置格式名集合；用于初始化 registry 与阻止自定义 definition 覆盖内置格式。 */
export const BUILTIN_FIELD_FORMATS: ReadonlySet<string> = new Set<string>(Object.values(DataFieldFormat));

/** 是否内置格式名（收窄到 DataFieldFormatValue）。 */
export const isBuiltinFieldFormat = (format: string): format is DataFieldFormatValue =>
  BUILTIN_FIELD_FORMATS.has(format);
