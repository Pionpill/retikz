import type { ValueOf } from '@retikz/foundation';

/** JSON data 中非空对象值的展示方式 */
export const DataObjectDisplay = {
  /** 递归展示为 Map */
  Map: 'map',
  /** 在当前单元格显示紧凑 JSON 文本 */
  Text: 'text',
} as const;

export type DataObjectDisplayValue = ValueOf<typeof DataObjectDisplay>;
