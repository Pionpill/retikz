import { isFiniteNumber } from '@retikz/math';

import type { DataFieldTypeMap, ParsedFieldValue } from '../../contract';
import type { DataFieldTypeValue } from '../../schemas';
import type { ExternalRow } from '../../shared';

import { DataFieldType } from '../../schemas';
import { coerceValue } from './coerce';
import { resolveFieldPath } from './field';

/** 按最终字段类型把自定义 parser 输出收窄到 canonical 值域。 */
const asParsedValue = (value: ParsedFieldValue, type: DataFieldTypeValue): ParsedFieldValue => {
  if (type === DataFieldType.Categorical) {
    return typeof value === 'string' || isFiniteNumber(value) ? value : undefined;
  }
  if (typeof value !== 'number') return undefined;
  return isFiniteNumber(value) ? value : NaN;
};

/** 判断 coercion / parser 结果是否满足指定字段测量类型的有效值域。 */
const isCoercedValid = (value: unknown, type: DataFieldTypeValue): boolean => {
  if (type === DataFieldType.Categorical) return value !== undefined && value !== null;
  return isFiniteNumber(value);
};

/**
 * 归一化绑定数据行。
 * @description 每个逻辑字段先经 fieldMap 映射到物理路径，再通过自定义 parser 或内置 coercion 写回规范化字段；下游 transform / scale / mark / locator 统一读取规范化字段，避免二次 coercion。
 */
export const normalizeRows = (
  rows: Array<ExternalRow>,
  fieldTypes: DataFieldTypeMap,
  fieldMap?: Record<string, string>,
  parsers?: Map<string, (raw: unknown) => ParsedFieldValue>,
): Array<ExternalRow> =>
  rows.map(row => {
    const canonical: ExternalRow = { ...row };
    for (const [logical, type] of fieldTypes) {
      const physical = fieldMap?.[logical] ?? logical;
      const raw = resolveFieldPath(row, physical);
      const parse = parsers?.get(logical);
      canonical[logical] = parse ? asParsedValue(parse(raw), type) : coerceValue(raw, type);
    }
    return canonical;
  });

/** 判断原始数据值是否缺失；缺失与非法值在诊断中分别计数。 */
const isMissingRaw = (raw: unknown): boolean => raw === undefined || raw === null;

/**
 * 抽样校验绑定数据：每个用户源字段在样本里至少有一个可 coercion 的值，否则 fail-loud。
 * @description validateData 开启时调用，用字段级 invalid / missing 计数解释空图原因；该阶段读取原始绑定数据。
 */
export const validateBoundData = (rows: Array<ExternalRow>, fieldTypes: DataFieldTypeMap, sampleRows: number): void => {
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
        `data: field "${logical}" has no valid values in the sampled data: ${invalidCount}/${limit} invalid, ${missingCount}/${limit} missing (check fieldMaps / dataset)`,
      );
    }
  }
};

/**
 * 全量严格校验规范化字段值，任一坏值即 fail-loud。
 * @description invalid:'error' 使用；该阶段读取已过 parser / coercion 的规范化字段。
 */
export const assertAllValuesValid = (normalized: Array<ExternalRow>, fieldTypes: DataFieldTypeMap): void => {
  for (const [logical, type] of fieldTypes) {
    for (let index = 0; index < normalized.length; index++) {
      const value = normalized[index][logical];
      if (isCoercedValid(value, type)) continue;
      const shown =
        isMissingRaw(value) || (typeof value === 'number' && Number.isNaN(value))
          ? 'missing or invalid'
          : `invalid value ${JSON.stringify(value)}`;
      throw new Error(`data: field "${logical}" has ${shown} at row ${index} (invalid:'error')`);
    }
  }
};
