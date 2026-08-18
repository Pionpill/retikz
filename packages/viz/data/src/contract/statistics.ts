import { z } from 'zod';

import type { IRDataReducerOperation, IRDataSelectorOperation } from '../schemas';
import type { ExternalRow } from '../shared';
import type { TransformContext } from './transform';

import { RetikzDataError } from '../error';

/**
 * 统计 reducer 运行时定义。
 * @description 定义对象只存在于运行时，不进入 JSON IR；IR 只保存 `{ kind, ...config }` 形态的 IRDataReducerOperation
 */
export type StatisticsReducerDefinition<TReducerOperation extends IRDataReducerOperation = IRDataReducerOperation> = {
  /** 完整 reducer operation schema；必须含非空 z.literal('kind') 供注册表提取注册键 */
  schema: z.ZodType<TReducerOperation>;
  /** 该 reducer 消费的源字段名；参与 data.model strict 校验 */
  inputFields?: (operation: TReducerOperation) => Array<string>;
  /** 该 reducer 产出的派生字段名；用于 data.model strict 源字段排除与运行时输出冲突检查，提供时必须完整声明 reduce 可能写入的字段 */
  outputFields?: (operation: TReducerOperation) => Array<string>;
  /** 对一组 rows 执行 reducer；返回要写入输出行 / annotation 行的字段片段 */
  reduce: (rows: Array<ExternalRow>, operation: TReducerOperation, context: TransformContext) => ExternalRow;
};

/**
 * 定义一个统计 reducer。
 * @description 保留 schema / inputFields / outputFields / reduce 之间的泛型关联；内置与自定义 reducer 都经同一 registry 入口分派。
 * @remarks 该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook
 */
export const defineStatisticsReducer = <TReducerOperation extends IRDataReducerOperation>(
  def: StatisticsReducerDefinition<TReducerOperation>,
): StatisticsReducerDefinition<TReducerOperation> => def;

/**
 * 注册表内部使用的 reducer 宽类型。
 * @description registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄
 */
export type AnyStatisticsReducerDefinition = {
  schema: z.ZodType;
  inputFields?: (operation: never) => Array<string>;
  outputFields?: (operation: never) => Array<string>;
  reduce: (rows: Array<ExternalRow>, operation: never, context: TransformContext) => ExternalRow;
};

/** row selector 的单行选择结果 */
export type RowSelection = {
  /** 被 selector 选中的原始行 */
  row: ExternalRow;
  /** 可选一基排名；`select.rankAs` 会把它写进输出行 */
  rank?: number;
};

/**
 * row selector 运行时定义。
 * @description 自定义 selector 供 `select` 与明确声明支持它的宿主 transform（如 Plot `relate`）复用；Data `annotate` 只接受内置单行 selector 子集。定义对象不进入 JSON IR
 */
export type RowSelectorDefinition<TSelectorOperation extends IRDataSelectorOperation = IRDataSelectorOperation> = {
  /** 完整 selector operation schema；必须含非空 z.literal('kind') 供注册表提取注册键 */
  schema: z.ZodType<TSelectorOperation>;
  /** 该 selector 消费的源字段名；参与 data.model strict 校验 */
  inputFields?: (operation: TSelectorOperation) => Array<string>;
  /** 对一组 rows 执行 selector；返回被选原始行与可选排名 */
  select: (rows: Array<ExternalRow>, operation: TSelectorOperation) => Array<RowSelection>;
};

/**
 * 定义一个 row selector。
 * @description 保留 schema / inputFields / select 之间的泛型关联；内置与自定义 selector 都经同一 registry 入口分派。
 * @remarks 该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook
 */
export const defineRowSelector = <TSelectorOperation extends IRDataSelectorOperation>(
  def: RowSelectorDefinition<TSelectorOperation>,
): RowSelectorDefinition<TSelectorOperation> => def;

/**
 * 注册表内部使用的 selector 宽类型。
 * @description registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄
 */
export type AnyRowSelectorDefinition = {
  schema: z.ZodType;
  inputFields?: (operation: never) => Array<string>;
  select: (rows: Array<ExternalRow>, operation: never) => Array<RowSelection>;
};

/**
 * 从统计子算子定义 schema 中提取注册键。
 * @description reducer 与 row selector 都以 `kind` 作为 registry discriminator；schema 必须把它声明成非空字面量
 */
export const extractStatisticOperation = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new RetikzDataError('data: statistic registration schema must be a ZodObject with a literal kind field');
  }
  const kindSchema = schema.shape.kind;
  if (!(kindSchema instanceof z.ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new RetikzDataError('data: statistic registration schema must declare kind as a non-empty z.literal string');
  }
  return kindSchema.value;
};
