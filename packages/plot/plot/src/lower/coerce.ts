import { type ExternalRow, type FieldType, PlotFieldType } from '../ir';
import { resolveFieldPath } from './field';
import { toTimestamp } from './scale';

/** 严格数字串：trimmed 十进制 / 科学计数；拒空串、Infinity、NaN、hex、带单位串 */
const NUMERIC_RE = /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/;

/** 数值强制：number 原样（非有限 → NaN）；严格数字串 → number；其余 → NaN（下游按非有限跳过） */
const coerceNumber = (value: unknown): number => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return NUMERIC_RE.test(trimmed) ? Number(trimmed) : NaN;
  }
  return NaN;
};

/** 分类强制：string / 有限 number 原样；boolean → 串；其余（对象 / 数组 / null）→ undefined（下游跳过，绝不 String(obj)） */
const coerceCategory = (value: unknown): string | number | undefined => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return String(value);
  return undefined;
};

/**
 * 按 PlotFieldType 把原始 JS 值强制成规范值（同类型容多种 JS 表示）
 * @description continuous → number（越界原样、不 clamp）；temporal → epoch ms（Date/数值/严格 ISO）；
 *   categorical → string|number 分类键。非法 → NaN（数值）/ undefined（分类），下游按非有限 / undefined 跳过。
 */
export const coerceValue = (value: unknown, type: FieldType): string | number | undefined => {
  if (type === PlotFieldType.Temporal) {
    const stamp = toTimestamp(value);
    return stamp === null ? NaN : stamp;
  }
  if (type === PlotFieldType.Categorical) {
    return coerceCategory(value);
  }
  // continuous
  return coerceNumber(value);
};

/** 某规范值对其类型是否有效（数值类要有限、分类类非 undefined/null） */
const isCoercedValid = (value: unknown, type: FieldType): boolean => {
  if (type === PlotFieldType.Categorical) return value !== undefined && value !== null;
  return typeof value === 'number' && Number.isFinite(value);
};

/**
 * ingest 归一化：把每行的用户源字段「(fieldMap) 解析物理路径 → 按 FieldType coerce」写成 canonical 行
 * @description 逻辑名为扁平键、值已强制；保留原始字段（供 datumIdField 等）与 `SOURCE_INDEX`（spread 转移）。
 *   全下游（transform / scale / mark / locator）统一读 canonical（按逻辑名），无第二处 coerce。仅 model 在时调用。
 */
export const normalizeRows = (
  rows: Array<ExternalRow>,
  fieldTypes: Map<string, FieldType>,
  fieldMap?: Record<string, string>,
): Array<ExternalRow> =>
  rows.map(row => {
    const canonical: ExternalRow = { ...row };
    for (const [logical, type] of fieldTypes) {
      const physical = fieldMap?.[logical] ?? logical;
      canonical[logical] = coerceValue(resolveFieldPath(row, physical), type);
    }
    return canonical;
  });

/**
 * 抽样校验绑定数据：每个用户源字段在样本里至少有一个可强制值，否则 fail-loud
 * @description validateData 开启时调用——把「字段缺失 / fieldMap 错 → 静默空图」变成「明确报错」。默认关、不 warn。
 */
export const validateBoundData = (rows: Array<ExternalRow>, fieldTypes: Map<string, FieldType>, sampleRows: number): void => {
  const limit = Math.min(rows.length, sampleRows);
  if (limit === 0) return;
  for (const [logical, type] of fieldTypes) {
    let valid = false;
    for (let index = 0; index < limit; index++) {
      if (isCoercedValid(coerceValue(resolveFieldPath(rows[index], logical), type), type)) {
        valid = true;
        break;
      }
    }
    if (!valid) {
      throw new Error(`lowerPlots: field "${logical}" has no valid values in the sampled data (check fieldMaps / dataset)`);
    }
  }
};
