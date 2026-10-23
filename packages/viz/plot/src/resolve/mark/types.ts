import type { AnyMarkDefinition } from '../../providers';
import type { IRPlotMark } from '../../schemas';

/** mark 领域 resolver 使用的内置行为定义表 上下文 */
export type MarkResolveContext = {
  /** provider 层的内置图元行为定义 */
  registry: Readonly<Record<IRPlotMark['type'], AnyMarkDefinition>>;
};

/** 已完成 schema 校验并选定 definition 的 mark operation */
export type MarkOperationResolution = {
  /** 与 operation type 对应的 lowering definition */
  definition: AnyMarkDefinition;
  /** 经 definition.schema 校验后的 JSON mark operation */
  operation: IRPlotMark;
};
