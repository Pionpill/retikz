import type { IRDataModel } from '@retikz/data';

import type {
  IRDetailTable,
  IRManualTable,
  IRManualTableStructure,
  IRTableCellPayload,
  IRTableDetailColumn,
} from '../../schemas';

/** detail Table 的作者侧 column 输入 */
export type TableDetailColumnInput = Omit<IRTableDetailColumn, 'header'> & {
  /** 列头 payload；字符串会规范化为 value payload */
  header?: IRTableCellPayload | string;
};

/** detail Table 的 framework-neutral 作者输入 */
export type DetailTableInput = Omit<IRDetailTable, 'namespace' | 'type' | 'data' | 'structure'> & {
  /** 运行时外部 dataset reference */
  dataRef: string;
  /** 可选数据字段模型 */
  model?: IRDataModel;
  /** 按展示顺序声明的 detail columns */
  columns: Array<TableDetailColumnInput>;
  /** 是否生成列头行 */
  header?: boolean;
};

/** manual Table 的 framework-neutral 作者输入 */
export type ManualTableInput = Omit<IRManualTable, 'namespace' | 'type' | 'data' | 'structure'> &
  Omit<IRManualTableStructure, 'kind'>;
