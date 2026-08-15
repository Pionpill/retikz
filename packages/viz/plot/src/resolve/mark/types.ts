import type { AnyMarkDefinition } from '../../contract';
import type { IRPlotMarkOperation } from '../../schemas';

/** mark 领域 resolver 使用的已合并 definition registry 上下文 */
export type MarkResolveContext = {
  /** provider 层合并后的 mark definitions */
  registry: ReadonlyMap<string, AnyMarkDefinition>;
};

/** 已完成 schema 校验并选定 definition 的 mark operation */
export type MarkOperationResolution = {
  /** 与 operation type 对应的 lowering definition */
  definition: AnyMarkDefinition;
  /** 经 definition.schema 校验后的 JSON mark operation */
  operation: IRPlotMarkOperation;
};
