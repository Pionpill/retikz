import { isFiniteNumber } from '@retikz/math';
import { type ExternalRow, PlotFieldType, type PlotFieldTypeValue } from '../../schemas';
import { coerceValue } from './coerce';
import type { ParsedFieldValue } from '../../contract';
import { resolveFieldPath } from './field';

const asParsedValue = (value: ParsedFieldValue): ParsedFieldValue =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

/**
 * ingest 归一化：把每行用户源字段按 fieldMap 解析，再按 PlotFieldTypeValue coerce 成 canonical 行。
 * @description 下游 transform / scale / mark / locator 统一读取 canonical 字段，避免二次 coercion。
 */
export const normalizeRows = (
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, PlotFieldTypeValue>,
  fieldMap?: Record<string, string>,
  parsers?: Map<string, (raw: unknown) => ParsedFieldValue>,
): Array<ExternalRow> =>
  rows.map(row => {
    const canonical: ExternalRow = { ...row };
    for (const [logical, type] of fieldTypes) {
      const physical = fieldMap?.[logical] ?? logical;
      const raw = resolveFieldPath(row, physical);
      const parse = parsers?.get(logical);
      canonical[logical] = parse ? asParsedValue(parse(raw)) : coerceValue(raw, type);
    }
    return canonical;
  });

const isMissingRaw = (raw: unknown): boolean => raw === undefined || raw === null;

/**
 * 抽样校验绑定数据：每个用户源字段在样本里至少有一个可 coercion 的值，否则 fail-loud。
 * @description validateData 开启时调用，用字段级 invalid / missing 计数解释空图原因。
 */
export const validateBoundData = (rows: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>, sampleRows: number): void => {
  const limit = Math.min(rows.length, sampleRows);
  if (limit === 0) return;
  for (const [logical, type] of fieldTypes) {
    let valid = false;
    let invalidCount = 0;
    let missingCount = 0;
    for (let index = 0; index < limit; index++) {
      const raw = resolveFieldPath(rows[index], logical);
      if (isCoercedValid(coerceValue(raw, type), type)) {
        valid = true;
        break;
      }
      if (isMissingRaw(raw)) missingCount += 1;
      else invalidCount += 1;
    }
    if (!valid) {
      throw new Error(
        `lowerPlots: field "${logical}" has no valid values in the sampled data: ${invalidCount}/${limit} invalid, ${missingCount}/${limit} missing (check fieldMaps / dataset)`,
      );
    }
  }
};

/**
 * 全量严格校验 normalized canonical 值，任一坏值即 fail-loud。
 * @description invalid:'error' 使用；读取已过 parser / coerce 的 canonical 值。
 */
export const assertAllValuesValid = (normalized: Array<ExternalRow>, fieldTypes: Map<string, PlotFieldTypeValue>): void => {
  for (const [logical, type] of fieldTypes) {
    for (let index = 0; index < normalized.length; index++) {
      const value = normalized[index][logical];
      if (isCoercedValid(value, type)) continue;
      const shown = isMissingRaw(value) || (typeof value === 'number' && Number.isNaN(value)) ? 'missing or invalid' : `invalid value ${JSON.stringify(value)}`;
      throw new Error(`lowerPlots: field "${logical}" has ${shown} at row ${index} (invalid:'error')`);
    }
  }
};

const isCoercedValid = (value: unknown, type: PlotFieldTypeValue): boolean => {
  if (type === PlotFieldType.Categorical) return value !== undefined && value !== null;
  return isFiniteNumber(value);
};
