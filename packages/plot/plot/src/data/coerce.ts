import { isFiniteNumber } from '@retikz/math';
import { PlotFieldFormat, type PlotFieldFormatValue, PlotFieldType, type PlotFieldTypeValue } from '../ir';
import { isIsoDateString } from './field';

/** 严格数字串：trimmed 十进制 / 科学计数；拒空串、Infinity、NaN、hex、带单位串。 */
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** 数值强制：number 原样，safe-integer bigint 转 number，严格数字串转 number，其余转 NaN。 */
const coerceNumber = (value: unknown): number => {
  if (typeof value === 'number') return isFiniteNumber(value) ? value : NaN;
  if (typeof value === 'bigint') {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) ? numeric : NaN;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return NUMERIC_RE.test(trimmed) ? Number(trimmed) : NaN;
  }
  return NaN;
};

/** 分类强制：string / finite number 原样，boolean 转字符串，其余跳过。 */
const coerceCategory = (value: unknown): string | number | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return isFiniteNumber(value) ? value : undefined;
  if (typeof value === 'boolean') return String(value);
  return undefined;
};

/**
 * 按 PlotFieldType 把原始 JS 值强制成规范值。
 * @description continuous -> number；temporal -> epoch ms；categorical -> string|number。非法值返回 NaN / undefined。
 */
export const coerceValue = (value: unknown, type: PlotFieldTypeValue): string | number | undefined => {
  if (type === PlotFieldType.Temporal) {
    const stamp = toTimestamp(value);
    return stamp === null ? NaN : stamp;
  }
  if (type === PlotFieldType.Categorical) {
    return coerceCategory(value);
  }
  return coerceNumber(value);
};

/** 字段值转 epoch ms：Date / finite number / ISO string 可解析，其余返回 null。 */
export const toTimestamp = (value: unknown): number | null => {
  if (value instanceof Date) {
    const stamp = value.getTime();
    return Number.isNaN(stamp) ? null : stamp;
  }
  if (typeof value === 'number') return isFiniteNumber(value) ? value : null;
  if (typeof value === 'string') {
    if (!isIsoDateString(value)) return null;
    const parsed = Date.parse(value.replace(' ', 'T'));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

/** 运行时 canonical 值，不含 boolean / null；coerceValue 与自定义 parse 的输出域。 */
export type ParsedFieldValue = string | number | undefined;

/** 每个声明式 format 唯一蕴含的字段测量类型，用于省略 type 时的覆盖与冲突校验。 */
const FORMAT_IMPLIED_TYPE: Record<PlotFieldFormatValue, PlotFieldTypeValue> = {
  [PlotFieldFormat.Iso]: PlotFieldType.Temporal,
  [PlotFieldFormat.EpochSeconds]: PlotFieldType.Temporal,
  [PlotFieldFormat.EpochMillis]: PlotFieldType.Temporal,
  [PlotFieldFormat.SlashDate]: PlotFieldType.Temporal,
  [PlotFieldFormat.NumberString]: PlotFieldType.Continuous,
  [PlotFieldFormat.Percent]: PlotFieldType.Continuous,
};

/** format -> 它蕴含的字段测量类型。 */
export const formatImpliedType = (format: PlotFieldFormatValue): PlotFieldTypeValue => FORMAT_IMPLIED_TYPE[format];

/** 严格 YYYY/MM/DD 斜杠日期：四位年 / 两位月 / 两位日，分隔符必须是 `/`。 */
const SLASH_DATE_RE = /^(\d{4})\/(\d{2})\/(\d{2})$/;

/** 严格 slashDate -> UTC 零点 epoch ms；不匹配严格布局 -> NaN。 */
const parseSlashDate = (raw: unknown): number => {
  if (typeof raw !== 'string') return NaN;
  const match = SLASH_DATE_RE.exec(raw.trim());
  if (!match) return NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return Date.UTC(year, month - 1, day);
};

/** 数值 / 数值串 -> number；epoch 秒 / 毫秒缩放共用，非有限或空串 -> NaN。 */
const toEpochNumber = (raw: unknown): number => {
  if (typeof raw === 'number') return isFiniteNumber(raw) ? raw : NaN;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed === '') return NaN;
    const parsed = Number(trimmed);
    return isFiniteNumber(parsed) ? parsed : NaN;
  }
  return NaN;
};

/** 宽松数字串：去前后空白并移除千分位逗号后 Number；空串 / 非数字 -> NaN。 */
const parseNumberString = (raw: unknown): number => {
  if (typeof raw === 'number') return isFiniteNumber(raw) ? raw : NaN;
  if (typeof raw !== 'string') return NaN;
  const cleaned = raw.trim().replace(/,/g, '');
  if (cleaned === '') return NaN;
  const parsed = Number(cleaned);
  return isFiniteNumber(parsed) ? parsed : NaN;
};

/** 百分比串 '50%' -> 0.5；必须带 `%`，非法值 -> NaN。 */
const parsePercent = (raw: unknown): number => {
  if (typeof raw === 'number') return isFiniteNumber(raw) ? raw / 100 : NaN;
  if (typeof raw !== 'string') return NaN;
  const trimmed = raw.trim();
  if (!trimmed.endsWith('%')) return NaN;
  const numeric = trimmed.slice(0, -1).trim();
  if (numeric === '') return NaN;
  const parsed = Number(numeric);
  return isFiniteNumber(parsed) ? parsed / 100 : NaN;
};

/**
 * 按声明式 format 选择内置 parser：原始值 -> canonical 值。
 * @description parser 结果进入 normalizeRows 的 per-field parser 槽。
 */
export const formatParser = (type: PlotFieldTypeValue, format: PlotFieldFormatValue): ((raw: unknown) => ParsedFieldValue) => {
  switch (format) {
    case PlotFieldFormat.Iso:
      return raw => coerceValue(raw, type);
    case PlotFieldFormat.EpochSeconds:
      return raw => toEpochNumber(raw) * 1000;
    case PlotFieldFormat.EpochMillis:
      return raw => toEpochNumber(raw);
    case PlotFieldFormat.SlashDate:
      return parseSlashDate;
    case PlotFieldFormat.NumberString:
      return parseNumberString;
    case PlotFieldFormat.Percent:
      return parsePercent;
  }
};
