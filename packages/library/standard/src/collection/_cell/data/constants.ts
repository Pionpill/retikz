import type { ValueOf } from '@retikz/foundation';

/** JSON data 中可按结构类型展开的组件 */
export const DataExpandComponent = {
  /** 递归展示为 Map */
  Map: 'map',
  /** 递归展示为 Array */
  Array: 'array',
} as const;

export type DataExpandComponentValue = ValueOf<typeof DataExpandComponent>;
