import type { AnyCompositeDefinition } from '@retikz/core';
import type { ExternalDatasets, DataInputBindings, DataTransformExecutor } from '@retikz/data';
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
export type InputTableKind = ValueOf<typeof InputTableKind>;

/** Detail Table 的无框架 authoring 输入 */
export type InputDetailTable = Readonly<{
  /** 标识明细表作者输入 */
  kind: typeof InputTableKind.Detail;
  /** 明细表结构与呈现的作者配置 */
  input: DetailTableInput;
}>;

/** Manual Table 的无框架 authoring 输入 */
export type InputManualTable = Readonly<{
  /** 标识手动表格作者输入 */
  kind: typeof InputTableKind.Manual;
  /** 手动声明行列与单元格的作者配置 */
  input: ManualTableInput;
}>;

/** Custom Table 的无框架 authoring 输入 */
export type InputCustomTable = Readonly<{
  /** 标识自定义表格结构输入 */
  kind: typeof InputTableKind.Custom;
  /** 由自定义结构定义消费的表格配置，命名空间与组件类型由 adapter 补齐 */
  input: Omit<IRCustomTable, 'namespace' | 'type'>;
}>;

/** 尚待 Table Vanilla 归一化的 Table authoring 输入 */
export type InputTableVariant = InputDetailTable | InputManualTable | InputCustomTable;

/**
 * Table InputEmbed adapter 消费的完整无框架输入
 * @template TSource 原生数据源句柄类型，关联数据绑定与执行器支持的源；默认 never 表示不接入原生源
 */
export type InputTable<TSource = never> = Readonly<{
  /** 尚待归一化的 Table authoring 输入 */
  table: InputTableVariant;
  /** Table lowering 消费的外部 datasets */
  data?: ExternalDatasets;
  /** 规范结果或原生源绑定，与data互斥 */
  dataBindings?: DataInputBindings<TSource>;
  /** 本次数据执行器，运行时句柄不进入IR */
  dataTransformExecutor?: DataTransformExecutor<TSource>;
  /** 本次请求取消信号 */
  signal?: AbortSignal;
  /** Table definitions 与其他 lowering 选项 */
  lowerOptions?: LowerTablesOptions;
  /** Cell 内嵌 Tier 2 内容所需的额外 composites */
  composites?: ReadonlyArray<AnyCompositeDefinition>;
}>;
