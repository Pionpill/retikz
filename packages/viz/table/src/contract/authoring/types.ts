import type { IRDataModel } from '@retikz/data';

import type {
  IRDetailTableSpec,
  IRManualTableSpec,
  IRTableCell,
  IRTableCellPayload,
  IRTableDetailColumn,
  TableRowKindValue,
} from '../../schemas';

/** detail Table 的作者侧 column 输入 */
export type TableDetailColumnInput = Omit<IRTableDetailColumn, 'header'> & {
  /** 列头 payload；字符串会规范化为 value payload */
  header?: IRTableCellPayload | string;
};

/** detail Table 的 framework-neutral plain spec 输入 */
export type DetailTableSpecInput = Omit<IRDetailTableSpec, 'namespace' | 'type' | 'data' | 'structure'> & {
  /** 运行时外部 dataset reference */
  dataRef: string;
  /** 可选数据字段模型 */
  model?: IRDataModel;
  /** 按展示顺序声明的 detail columns */
  columns: Array<TableDetailColumnInput>;
  /** 是否生成列头行 */
  header?: boolean;
};

/** manual Table 的 framework-neutral plain spec 输入 */
export type ManualTableSpecInput = Omit<IRManualTableSpec, 'namespace' | 'type' | 'data' | 'structure'> & {
  /** 显式行数 */
  rows: number;
  /** 显式列数 */
  columns: number;
  /** 每行的可选语义类型 */
  rowKinds?: Array<TableRowKindValue>;
  /** 带显式地址的 Cells */
  cells: Array<IRTableCell>;
};
