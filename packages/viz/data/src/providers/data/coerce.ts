import { isFiniteNumber } from '@retikz/math';

import type { DataFieldTypeValue } from '../../schemas';

import { DataFieldType } from '../../schemas';
import { isIsoDateString } from './field';

/** 严格数字串：trimmed 十进制 / 科学计数；拒空串、Infinity、NaN、hex、带单位串 */
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** 校验 ISO 字符串日期部分是否为真实日历日期，避免 Date.parse 自动滚动非法日期 */
const isValidIsoCalendarDate = (value: string): boolean => {
  const [yearText, monthText, dayText] = value.slice(0, 10).split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

/** 数值 coercion：number 原样，safe-integer bigint 转 number，严格数字串转 number，其余转 NaN */
export const coerceNumber = (value: unknown): number => {
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

/** 分类 coercion：string / finite number 原样，boolean 转字符串，其余跳过 */
export const coerceCategory = (value: unknown): string | number | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return isFiniteNumber(value) ? value : undefined;
  if (typeof value === 'boolean') return String(value);
  return undefined;
};

/** 字段值转 epoch ms：Date / finite number / ISO string 可解析，其余返回 null */
export const coerceTimestamp = (value: unknown): number | null => {
  if (value instanceof Date) {
    const stamp = value.getTime();
    return Number.isNaN(stamp) ? null : stamp;
  }
  if (typeof value === 'number') return isFiniteNumber(value) ? value : null;
  if (typeof value === 'string') {
    if (!isIsoDateString(value) || !isValidIsoCalendarDate(value)) return null;
    const parsed = Date.parse(value.replace(' ', 'T'));
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

/**
 * 按字段测量类型把原始 JS 值转成运行时规范值。
 * @description continuous -> number；temporal -> epoch ms；categorical -> string|number。非法值返回 NaN / undefined
 */
export const coerceValue = (value: unknown, type: DataFieldTypeValue): string | number | undefined => {
  if (type === DataFieldType.Temporal) {
    const stamp = coerceTimestamp(value);
    return stamp === null ? NaN : stamp;
  }
  if (type === DataFieldType.Categorical) {
    return coerceCategory(value);
  }
  return coerceNumber(value);
};
