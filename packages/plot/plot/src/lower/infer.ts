import { type ExternalRow, type FieldType, PlotFieldType } from '../ir';
import { resolveFieldPath } from './field';

/** 缺省推断扫描行数上限（防百万数据暗中全扫） */
const MAX_SCAN_ROWS = 1000;
/** 缺省推断收集的非空标量值上限（够数即停） */
const MAX_SAMPLE_VALUES = 100;

/** 严格 ISO 日期：YYYY-MM-DD */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
/** ISO 日期时间：分隔符 T 或单空格（SQL 时间戳），带 Z 或 ±HH:MM 时区（拒无时区的模糊本地时间） */
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * ISO 时间字符串判定（推断与 temporal coercion 共用同一 guard）
 * @description 接受 `YYYY-MM-DD`、或带时区的 ISO datetime（分隔符 T 或单空格，后者即 SQL 时间戳）；
 *   拒 `YYYY/MM/DD`、无时区 datetime、裸 / 紧凑数字串，避免把歧义值误判时间
 */
export const isIsoDateString = (value: string): boolean => ISO_DATE_RE.test(value) || ISO_DATETIME_RE.test(value);

/** 单个标量值 → 测量类型；非标量 / null 返回 undefined（跳过） */
const classify = (value: unknown): FieldType | undefined => {
  if (value instanceof Date) return PlotFieldType.Temporal;
  if (typeof value === 'bigint') return PlotFieldType.Continuous;
  if (typeof value === 'number') return Number.isFinite(value) ? PlotFieldType.Continuous : undefined;
  if (typeof value === 'string') return isIsoDateString(value) ? PlotFieldType.Temporal : PlotFieldType.Categorical;
  if (typeof value === 'boolean') return PlotFieldType.Categorical;
  return undefined;
};

/**
 * 从绑定数据推断某字段的测量类型（仅无 model 时用）
 * @description 双阈值抽样（≤1000 行 / ≤100 标量）：全 temporal→temporal、全有限数→continuous、其余/混合/空→categorical。
 */
export const inferFieldType = (rows: Array<ExternalRow>, path: string): FieldType => {
  const sample: Array<FieldType> = [];
  const scanLimit = Math.min(rows.length, MAX_SCAN_ROWS);
  for (let index = 0; index < scanLimit && sample.length < MAX_SAMPLE_VALUES; index++) {
    const value = resolveFieldPath(rows[index], path);
    if (value === null || value === undefined) continue;
    const type = classify(value);
    if (type === undefined) continue;
    sample.push(type);
  }
  if (sample.length === 0) return PlotFieldType.Categorical;
  if (sample.every(type => type === PlotFieldType.Temporal)) return PlotFieldType.Temporal;
  if (sample.every(type => type === PlotFieldType.Continuous)) return PlotFieldType.Continuous;
  return PlotFieldType.Categorical;
};
