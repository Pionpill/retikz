import { z } from 'zod';
import { type ExternalRow, type ReducerOperation, type SelectorOperation } from '../schemas';
import type { TransformContext } from './transform';

export type StatisticsReducerContext = TransformContext;

/**
 * 统计 reducer 运行时定义。
 * @description 定义对象只存在于运行时，不进入 JSON IR；IR 只保存 `{ op, ...config }` 形态的 ReducerOperation。
 */
export type StatisticsReducerDefinition<TReducerOperation extends ReducerOperation = ReducerOperation> = {
  /** 完整 reducer operation schema；必须含非空 z.literal('op') 供注册表提取注册键。 */
  schema: z.ZodType<TReducerOperation>;
  /** 该 reducer 消费的源字段名；参与 data.model strict 校验。 */
  inputFields?: (operation: TReducerOperation) => Array<string>;
  /** 该 reducer 产出的派生字段名；从 data.model strict 校验的源字段集中排除。 */
  outputFields?: (operation: TReducerOperation) => Array<string>;
  /** 对一组 rows 执行 reducer；返回要写入输出行 / annotation 行的字段片段。 */
  reduce: (rows: Array<ExternalRow>, operation: TReducerOperation, context: StatisticsReducerContext) => ExternalRow;
};

/** 定义一个统计 reducer。 */
export const defineStatisticsReducer = <TReducerOperation extends ReducerOperation>(
  def: StatisticsReducerDefinition<TReducerOperation>,
): StatisticsReducerDefinition<TReducerOperation> => def;

/** 注册表内部使用的 reducer 宽类型；调用前必须先用 schema 解析收窄。 */
export type AnyStatisticsReducerDefinition = Omit<StatisticsReducerDefinition<ReducerOperation>, 'schema' | 'inputFields' | 'outputFields' | 'reduce'> & {
  schema: z.ZodType;
  inputFields?: (operation: never) => Array<string>;
  outputFields?: (operation: never) => Array<string>;
  reduce: (rows: Array<ExternalRow>, operation: never, context: StatisticsReducerContext) => ExternalRow;
};

export type RowSelection = {
  /** 被 selector 选中的原始行。 */
  row: ExternalRow;
  /** 可选一基排名；`select.rankAs` 会把它写进输出行。 */
  rank?: number;
};

/**
 * row selector 运行时定义。
 * @description selector 是统计子算子，供 `select` / `annotate` / `relate` 复用；定义对象不进入 JSON IR。
 */
export type RowSelectorDefinition<TSelectorOperation extends SelectorOperation = SelectorOperation> = {
  /** 完整 selector operation schema；必须含非空 z.literal('op') 供注册表提取注册键。 */
  schema: z.ZodType<TSelectorOperation>;
  /** 该 selector 消费的源字段名；参与 data.model strict 校验。 */
  inputFields?: (operation: TSelectorOperation) => Array<string>;
  /** 对一组 rows 执行 selector；返回被选原始行与可选排名。 */
  select: (rows: Array<ExternalRow>, operation: TSelectorOperation) => Array<RowSelection>;
};

/** 定义一个 row selector。 */
export const defineRowSelector = <TSelectorOperation extends SelectorOperation>(
  def: RowSelectorDefinition<TSelectorOperation>,
): RowSelectorDefinition<TSelectorOperation> => def;

/** 注册表内部使用的 selector 宽类型；调用前必须先用 schema 解析收窄。 */
export type AnyRowSelectorDefinition = Omit<RowSelectorDefinition<SelectorOperation>, 'schema' | 'inputFields' | 'select'> & {
  schema: z.ZodType;
  inputFields?: (operation: never) => Array<string>;
  select: (rows: Array<ExternalRow>, operation: never) => Array<RowSelection>;
};

/** 从统计子算子定义 schema 中提取注册键。 */
export const extractStatisticOperation = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('lowerPlots: statistic registration schema must be a ZodObject with a literal op field');
  }
  const opSchema = schema.shape.op;
  if (!(opSchema instanceof z.ZodLiteral) || typeof opSchema.value !== 'string' || opSchema.value.length === 0) {
    throw new Error('lowerPlots: statistic registration schema must declare op as a non-empty z.literal string');
  }
  return opSchema.value;
};
