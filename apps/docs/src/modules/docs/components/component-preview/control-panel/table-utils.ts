import type { PreviewTableColumn, PreviewTableControlField, PreviewTableRows } from '../types';

/** 单个只读表格单元格的展示结果 */
export type PreviewTableCell = {
  text: string;
  numeric: boolean;
};

/** 属性面板表格一次最多渲染的行数 */
export const PREVIEW_TABLE_MAX_ROWS = 100;

/** 属性面板表格默认完整展示的正文行数 */
export const PREVIEW_TABLE_DEFAULT_VISIBLE_ROWS = 5;

/** 按字段首次出现的顺序解析只读表格列 */
export const resolvePreviewTableColumns = (
  field: PreviewTableControlField,
  rows: PreviewTableRows,
): Array<PreviewTableColumn> => {
  if (field.columns !== undefined) return field.columns.map(column => ({ ...column }));

  const keys = new Set<string>();
  for (const row of rows) {
    Object.keys(row).forEach(key => keys.add(key));
  }
  return Array.from(keys, key => ({ key }));
};

/** 将未知表格值格式化为紧凑、稳定的只读文本 */
export const formatPreviewTableCell = (value: unknown): PreviewTableCell => {
  if (value === null || value === undefined) return { text: '—', numeric: false };
  if (typeof value === 'number') return { text: String(value), numeric: true };
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'bigint') {
    return { text: String(value), numeric: false };
  }

  try {
    const serialized: unknown = JSON.stringify(value);
    return { text: typeof serialized === 'string' ? serialized : String(value), numeric: false };
  } catch {
    return { text: String(value), numeric: false };
  }
};
