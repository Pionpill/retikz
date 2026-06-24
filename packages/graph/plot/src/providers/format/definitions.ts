import { isFiniteNumber } from '@retikz/math';
import { type FieldFormatDefinition, defineFieldFormat } from '../../contract';
import { coerceValue } from '../data';
import { PlotFieldType } from '../../schemas';
import { PlotFieldFormat } from './constants';

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

const isoFormat = defineFieldFormat({
  name: PlotFieldFormat.Iso,
  impliedType: PlotFieldType.Temporal,
  parse: raw => coerceValue(raw, PlotFieldType.Temporal),
});

const epochSecondsFormat = defineFieldFormat({
  name: PlotFieldFormat.EpochSeconds,
  impliedType: PlotFieldType.Temporal,
  parse: raw => toEpochNumber(raw) * 1000,
});

const epochMillisFormat = defineFieldFormat({
  name: PlotFieldFormat.EpochMillis,
  impliedType: PlotFieldType.Temporal,
  parse: raw => toEpochNumber(raw),
});

const slashDateFormat = defineFieldFormat({
  name: PlotFieldFormat.SlashDate,
  impliedType: PlotFieldType.Temporal,
  parse: parseSlashDate,
});

const numberStringFormat = defineFieldFormat({
  name: PlotFieldFormat.NumberString,
  impliedType: PlotFieldType.Continuous,
  parse: parseNumberString,
});

const percentFormat = defineFieldFormat({
  name: PlotFieldFormat.Percent,
  impliedType: PlotFieldType.Continuous,
  parse: parsePercent,
});

/** 内置字段解析格式 definition 列表；内置 6 个与自定义格式共享同一 registry 分派流程。 */
export const BUILTIN_FORMATS: ReadonlyArray<FieldFormatDefinition> = [
  isoFormat,
  epochSecondsFormat,
  epochMillisFormat,
  slashDateFormat,
  numberStringFormat,
  percentFormat,
];

/**
 * 按 name 索引的内置格式 definition。
 * @description 作为 format registry 的内置初始化来源，也供诊断与测试确认内置覆盖；自定义 definition 不写入此表，而是在每次 lowering 时合并。
 */
export const BUILTIN_FORMAT_DEFINITIONS_BY_NAME: ReadonlyMap<string, FieldFormatDefinition> = new Map(BUILTIN_FORMATS.map(def => [def.name, def] as const));

/**
 * 解析字段格式 registry。
 * @description 内置格式总是先注册；用户自定义 definition 不能覆盖内置格式名，也不能彼此重复。
 */
export const resolveFormatRegistry = (custom?: ReadonlyArray<FieldFormatDefinition>): Map<string, FieldFormatDefinition> => {
  const registry = new Map(BUILTIN_FORMAT_DEFINITIONS_BY_NAME);
  for (const def of custom ?? []) {
    if (def.name.length === 0) {
      throw new Error('lowerPlots: field format name must be a non-empty string');
    }
    if (registry.has(def.name)) {
      throw new Error(`lowerPlots: duplicate field format registration: "${def.name}"`);
    }
    registry.set(def.name, def);
  }
  return registry;
};
