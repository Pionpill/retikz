import { isFiniteNumber } from '@retikz/math';

import type { DataFieldTypeMap } from '../../contract';
import type { DataFieldTypeValue, DataSortOrderValue, IRDataModel } from '../../schemas';
import type { ExternalRow } from '../../shared';

import { DataFieldType, DataSortOrder } from '../../schemas';

/**
 * 解析字段路径 a.b.c，返回叶子值（任一段缺失返回 undefined）
 * @description 先查 exact own key（归一化后的行把逻辑名 `user.age` 写成扁平 key，须命中它而非下钻原始嵌套值），
 *   未命中再按点路径下钻（原始嵌套数据 / MongoDB 文档）。两者兼容：原始行无字面点键时退化为纯下钻。
 */
export const resolveFieldPath = (row: ExternalRow, path: string): unknown => {
  if (Object.prototype.hasOwnProperty.call(row, path)) return row[path];
  let current: unknown = row;
  for (const key of path.split('.')) {
    if (current === null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
};

/** 判断排序值是否缺失或为非有限数值。 */
const isMissingSortValue = (value: unknown): boolean =>
  value === undefined || value === null || (typeof value === 'number' && !isFiniteNumber(value));

/**
 * 按字段路径和方向比较两行。
 * @description missing / 非有限数值始终排在有效值之后；有限数值按数值比较，其余按稳定字符串序比较。
 */
export const compareRowsByFieldPath = (
  a: ExternalRow,
  b: ExternalRow,
  path: string,
  order: DataSortOrderValue = DataSortOrder.Ascending,
): number => {
  const va = resolveFieldPath(a, path);
  const vb = resolveFieldPath(b, path);
  const aMissing = isMissingSortValue(va);
  const bMissing = isMissingSortValue(vb);
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }

  const compared =
    isFiniteNumber(va) && isFiniteNumber(vb)
      ? va - vb
      : String(va) === String(vb)
        ? 0
        : String(va) < String(vb)
          ? -1
          : 1;
  return order === DataSortOrder.Descending ? -compared : compared;
};

/**
 * 字段类型自动推断的内部采样上限。
 * @description 采样上限保证推断成本有界；需要稳定语义时应在 data.model 显式声明字段 type。
 */
const MAX_SCAN_ROWS = 1000;
/** 字段类型自动推断最多采集的非空样本数。 */
const MAX_SAMPLE_VALUES = 100;
/** 严格 ISO 日期字面量；用于 temporal 自动推断。 */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** 带时间部分的 ISO 日期时间字面量；用于 temporal 自动推断。 */
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/** 判断字符串是否符合 data 层内置 temporal 自动推断的 ISO 日期 / 日期时间形态。 */
export const isIsoDateString = (value: string): boolean => ISO_DATE_RE.test(value) || ISO_DATETIME_RE.test(value);

/**
 * 分类域推断：按数据出现顺序去重（非排序、非 extent）。
 * @description band / point / ordinal 共用。分类顺序属于 data domain 语义；排序是 transform 的显式职责。
 */
export const inferCategoryDomain = (values: Array<unknown>): Array<string | number> => {
  const domain = new Set<string | number>();
  for (const value of values) {
    if (typeof value !== 'string' && typeof value !== 'number') continue;
    domain.add(value);
  }
  return [...domain];
};

/** 单个字段样本值的测量类型推断策略：Date/string ISO -> temporal，bigint/finite number -> continuous，boolean/string -> categorical。 */
const classifyFieldType = (value: unknown): DataFieldTypeValue | undefined => {
  if (value instanceof Date) return DataFieldType.Temporal;
  if (typeof value === 'bigint') return DataFieldType.Continuous;
  if (typeof value === 'number') return isFiniteNumber(value) ? DataFieldType.Continuous : undefined;
  if (typeof value === 'string') return isIsoDateString(value) ? DataFieldType.Temporal : DataFieldType.Categorical;
  if (typeof value === 'boolean') return DataFieldType.Categorical;
  return undefined;
};

/** 从绑定数据推断某字段的测量类型；仅在没有 data.model 或 model 缺省 type 时使用。 */
export const inferFieldType = (rows: Array<ExternalRow>, path: string): DataFieldTypeValue => {
  const observedTypes = new Set<DataFieldTypeValue>();
  let sampleCount = 0;
  const scanLimit = Math.min(rows.length, MAX_SCAN_ROWS);
  for (let index = 0; index < scanLimit && sampleCount < MAX_SAMPLE_VALUES; index++) {
    const value = resolveFieldPath(rows[index], path);
    if (value === null || value === undefined) continue;
    const type = classifyFieldType(value);
    if (type === undefined) continue;
    observedTypes.add(type);
    sampleCount++;
  }
  if (sampleCount === 0) return DataFieldType.Categorical;
  if (observedTypes.size > 1) return DataFieldType.Categorical;
  return observedTypes.has(DataFieldType.Temporal)
    ? DataFieldType.Temporal
    : observedTypes.has(DataFieldType.Continuous)
      ? DataFieldType.Continuous
      : DataFieldType.Categorical;
};

/**
 * 解析源字段测量类型映射。
 * @description data.model 声明时执行 strict 字段引用校验；字段未声明 type 时仍从绑定数据采样推断。
 */
export const resolveFieldTypes = (
  model: IRDataModel | undefined,
  rows: Array<ExternalRow>,
  sourceFields: Set<string>,
): DataFieldTypeMap => {
  const fieldTypeMap: DataFieldTypeMap = new Map();
  if (model !== undefined) {
    const declaredNameMap = new Set<string>();
    const declaredTypeMap: DataFieldTypeMap = new Map();
    for (const field of model) {
      if (declaredNameMap.has(field.name)) {
        throw new Error(`data: duplicate field "${field.name}" in data.model`);
      }
      declaredNameMap.add(field.name);
      if (field.type !== undefined) declaredTypeMap.set(field.name, field.type);
    }
    for (const field of sourceFields) {
      if (!declaredNameMap.has(field)) {
        throw new Error(
          `data: unknown field "${field}" (data.model is declared; all referenced source fields must be listed)`,
        );
      }
      fieldTypeMap.set(field, declaredTypeMap.get(field) ?? inferFieldType(rows, field));
    }
  } else {
    for (const field of sourceFields) {
      fieldTypeMap.set(field, inferFieldType(rows, field));
    }
  }
  return fieldTypeMap;
};
