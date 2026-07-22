import type { DataFieldTypeValue, IRDataModel, IRDataScalarValue } from '@retikz/data';
import type { ZodType } from 'zod';

import type { IRTableCellPayload, IRTableStructureOperation } from '../../schemas';
import type { DeepReadonly } from '../../shared';
import type { TableStructureOutput } from './output';

/** Structure Definition 可读取的只读数据上下文 */
export type TableStructureContext = Readonly<{
  /** 根 Table 绑定的数据身份；manual structure 可以省略 */
  data?: Readonly<{
    /** 外部 dataset reference */
    reference: string;
    /** 递归只读的数据模型 */
    model?: DeepReadonly<IRDataModel>;
    /** 当前 dataset 的稳定 source index */
    sourceIndices: ReadonlyArray<number>;
  }>;
  /** 解析当前 structure 使用的字段测量类型 */
  resolveFieldTypes: (sourceFields: ReadonlySet<string>) => ReadonlyMap<string, DataFieldTypeValue>;
  /** 按 source index 与 dotted path 读取 scalar；缺失字段返回 undefined */
  resolveField: (sourceIndex: number, field: string) => IRDataScalarValue | undefined;
}>;

/** Table structure provider 定义 */
export type TableStructureDefinition<TSpec extends IRTableStructureOperation = IRTableStructureOperation> = {
  /** operation 的精确 runtime schema，kind 必须是非空 literal */
  schema: ZodType<TSpec>;
  /** 把 operation 构造为声明式 canonical 候选 output */
  build: (spec: TSpec, context: TableStructureContext) => TableStructureOutput;
};

/** 异构 Table structure provider 定义 */
export type AnyTableStructureDefinition = Omit<TableStructureDefinition, 'schema' | 'build'> & {
  /** 异构 registry 消费的精确 schema */
  schema: ZodType;
  /** operation 经对应 schema 收窄后以 never 调用 */
  build: (spec: never, context: TableStructureContext) => TableStructureOutput;
};

/** Structure ABI 中递归只读的 Cell payload */
export type ReadonlyTableCellPayload = DeepReadonly<IRTableCellPayload>;
