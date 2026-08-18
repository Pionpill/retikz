import { isFiniteNumber } from '@retikz/math';

import type { FieldFormatDefinition } from '../../contract';

import { defineFieldFormat } from '../../contract';
import { RetikzDataError } from '../../error';
import { DataFieldType } from '../../schemas';
import { createReadonlyMap } from '../../shared/collections';
import { coerceValue } from '../data';
import { freezeDefinitions } from '../shared';
import { DataFieldFormat } from './constants';

/** 严格 YYYY/MM/DD 斜杠日期：四位年 / 两位月 / 两位日，分隔符必须是 `/` */
const SLASH_DATE_RE = /^(\d{4})\/(\d{2})\/(\d{2})$/;

/** 将严格 slashDate 转为 UTC 零点 epoch ms；布局或日历日期非法时返回 NaN */
const parseSlashDate = (raw: unknown): number => {
  if (typeof raw !== 'string') return NaN;
  const match = SLASH_DATE_RE.exec(raw.trim());
  if (!match) return NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(0, 0, 0, 0);
  const stamp = date.getTime();
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? stamp : NaN;
};

/** 将数值 / 数值串解析为有限数值；epoch 秒 / 毫秒格式共用，非有限或空串返回 NaN */
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

/** 宽松数字串：去前后空白并移除千分位逗号后 Number；空串 / 非数字 -> NaN */
const parseNumberString = (raw: unknown): number => {
  if (typeof raw === 'number') return isFiniteNumber(raw) ? raw : NaN;
  if (typeof raw !== 'string') return NaN;
  const cleaned = raw.trim().replace(/,/g, '');
  if (cleaned === '') return NaN;
  const parsed = Number(cleaned);
  return isFiniteNumber(parsed) ? parsed : NaN;
};

/** 百分比串 '50%' -> 0.5；必须带 `%`，非法值 -> NaN */
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

/** ISO temporal 内置格式；复用默认 temporal coercion */
const isoFormat = defineFieldFormat({
  name: DataFieldFormat.Iso,
  impliedType: DataFieldType.Temporal,
  parse: raw => coerceValue(raw, DataFieldType.Temporal),
});

/** epochSeconds temporal 内置格式；把秒级时间戳放大为 epoch ms */
const epochSecondsFormat = defineFieldFormat({
  name: DataFieldFormat.EpochSeconds,
  impliedType: DataFieldType.Temporal,
  parse: raw => toEpochNumber(raw) * 1000,
});

/** epochMillis temporal 内置格式；把有限数值直接视为 epoch ms */
const epochMillisFormat = defineFieldFormat({
  name: DataFieldFormat.EpochMillis,
  impliedType: DataFieldType.Temporal,
  parse: raw => toEpochNumber(raw),
});

/** slashDate temporal 内置格式；只接受 YYYY/MM/DD 并按 UTC 零点解释 */
const slashDateFormat = defineFieldFormat({
  name: DataFieldFormat.SlashDate,
  impliedType: DataFieldType.Temporal,
  parse: parseSlashDate,
});

/** numberString continuous 内置格式；接受带千分位逗号的宽松数字串 */
const numberStringFormat = defineFieldFormat({
  name: DataFieldFormat.NumberString,
  impliedType: DataFieldType.Continuous,
  parse: parseNumberString,
});

/** percent continuous 内置格式；把百分比字面量转换为比例数值 */
const percentFormat = defineFieldFormat({
  name: DataFieldFormat.Percent,
  impliedType: DataFieldType.Continuous,
  parse: parsePercent,
});

/** 内置字段解析格式 definition 列表；内置 6 个与自定义格式共享同一 registry 分派流程 */
export const BUILTIN_FORMATS: ReadonlyArray<FieldFormatDefinition> = freezeDefinitions([
  isoFormat,
  epochSecondsFormat,
  epochMillisFormat,
  slashDateFormat,
  numberStringFormat,
  percentFormat,
]);

/** 默认格式 registry 的私有稳定索引；公开只读视图与每次 resolver 副本均从此生成 */
const BUILTIN_FORMAT_REGISTRY = new Map(BUILTIN_FORMATS.map(def => [def.name, def] as const));

/**
 * 按 name 索引的内置格式 definition 只读视图。
 * @description 供诊断与测试确认内置覆盖；默认 resolver 使用私有稳定索引，自定义 definition 不写入此视图
 */
export const BUILTIN_FORMAT_DEFINITIONS_BY_NAME: ReadonlyMap<string, FieldFormatDefinition> =
  createReadonlyMap(BUILTIN_FORMAT_REGISTRY);

/**
 * 解析字段格式 registry。
 * @description 内置格式总是先注册；用户自定义 definition 不能覆盖内置格式名，也不能彼此重复
 */
export const resolveFormatRegistry = (
  custom?: ReadonlyArray<FieldFormatDefinition>,
): Map<string, FieldFormatDefinition> => {
  const registry = new Map(BUILTIN_FORMAT_REGISTRY);
  for (const def of custom ?? []) {
    if (def.name.length === 0) {
      throw new RetikzDataError('data: field format name must be a non-empty string');
    }
    if (registry.has(def.name)) {
      throw new RetikzDataError(`data: duplicate field format registration: "${def.name}"`);
    }
    registry.set(def.name, def);
  }
  return registry;
};
