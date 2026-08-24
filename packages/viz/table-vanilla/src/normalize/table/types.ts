import type { AnyCompositeDefinition } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { ValueOf } from '@retikz/foundation';
import type { DetailTableInput, IRCustomTable, LowerTablesOptions, ManualTableInput } from '@retikz/table';

/** Table authoring 输入的精确变体 */
export const InputTableKind = {
  /** 逐条记录展开的明细表 */
  Detail: 'detail',
  /** 显式行优先单元格矩阵 */
  Manual: 'manual',
  /** 由自定义结构定义处理的表 */
  Custom: 'custom',
} as const;

/** Table authoring 输入变体的取值 */
export type InputTableKindValue = ValueOf<typeof InputTableKind>;

/** Detail Table 的无框架 authoring 输入 */
export type InputDetailTable = Readonly<{
  kind: typeof InputTableKind.Detail;
  input: DetailTableInput;
}>;

/** Manual Table 的无框架 authoring 输入 */
export type InputManualTable = Readonly<{
  kind: typeof InputTableKind.Manual;
  input: ManualTableInput;
}>;

/** Custom Table 的无框架 authoring 输入 */
export type InputCustomTable = Readonly<{
  kind: typeof InputTableKind.Custom;
  input: Omit<IRCustomTable, 'namespace' | 'type'>;
}>;

/** 尚待 Table Vanilla 归一化的 Table authoring 输入 */
export type InputTableVariant = InputDetailTable | InputManualTable | InputCustomTable;

/** Table InputEmbed adapter 消费的完整无框架输入 */
export type InputTable = Readonly<{
  /** 尚待归一化的 Table authoring 输入 */
  table: InputTableVariant;
  /** Table lowering 消费的外部 datasets */
  data?: ExternalDatasets;
  /** Table definitions 与其他 lowering 选项 */
  lowerOptions?: LowerTablesOptions;
  /** Cell 内嵌 Tier 2 内容所需的额外 composites */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
}>;
