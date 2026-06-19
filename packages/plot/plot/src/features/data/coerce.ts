import { isFiniteNumber } from '@retikz/math';
import { PlotFieldType, type PlotFieldTypeValue } from '../../schemas';
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
