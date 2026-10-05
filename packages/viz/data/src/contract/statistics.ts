import type { ZodType } from 'zod';
import { ZodLiteral, ZodObject } from 'zod';

import { RetikzDataError } from '../error';
import type { IRDataReducerOperation, IRDataSelectorOperation } from '../schemas';
import type { ExternalRow } from '../shared';
import type { TransformContext } from './transform';
import type { DataTransformOutputDescriptor } from './transform';

/**
 * 统计 reducer 运行时定义
 * @description 定义对象只存在于运行时，不进入 JSON IR；IR 只保存 `{ kind, ...config }` 形态的 IRDataReducerOperation
 * @template TReducerSource 统计归约 schema 接受的原始声明类型
 * @template TReducerOperation schema 解析后用于字段分析和计算的归约参数类型
 */
export type StatisticsReducerDefinition<
  TReducerSource extends IRDataReducerOperation = IRDataReducerOperation,
  TReducerOperation = TReducerSource,
> = {
  /** 完整 reducer operation schema；必须含非空 z.literal('kind') 供注册表提取注册键 */
  schema: ZodType<TReducerOperation, TReducerSource>;
  /** 该 reducer 消费的源字段名；参与 data.model strict 校验 */
  inputFields?: (operation: TReducerOperation) => Array<string>;
  /** 完整输出字段；非标量或没有类型证据时省略 descriptor.type */
  outputs: (operation: TReducerOperation) => Array<DataTransformOutputDescriptor>;
};

/**
 * 定义一个统计 reducer
 * @description 保留 schema、输入字段与完整输出声明之间的泛型关联；内置与自定义 reducer 都经同一 registry 入口解析
 * @remarks 该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook
 * @template TReducerSource 统计归约 schema 接受的原始声明类型
 * @template TReducerOperation schema 解析后用于字段分析和计算的归约参数类型
 */
export const defineStatisticsReducer = <
  TReducerSource extends IRDataReducerOperation,
  TReducerOperation = TReducerSource,
>(
  def: StatisticsReducerDefinition<TReducerSource, TReducerOperation>,
): StatisticsReducerDefinition<TReducerSource, TReducerOperation> => def;

/**
 * 注册表内部使用的 reducer 宽类型
 * @description registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄
 */
export type AnyStatisticsReducerDefinition = {
  /** 调用计算回调前用于解析具体归约参数的 schema */
  schema: ZodType;
  /** 列出归约引用的输入字段；调用前须恢复对应 schema 的参数关联 */
  inputFields?: (operation: never) => Array<string>;
  /** 声明归约产生的完整字段集合及其类型 */
  outputs: (operation: never) => Array<DataTransformOutputDescriptor>;
};

/** row selector 的单行选择结果 */
export type RowSelection = {
  /** 被 selector 选中的原始行 */
  row: ExternalRow;
  /** 可选一基排名；`select.rankAs` 会把它写进输出行 */
  rank?: number;
};

/**
 * row selector 运行时定义
 * @description 自定义 selector 供 `select` 与明确声明支持它的宿主 transform（如 Plot `relate`）复用；Data `annotate` 只接受内置单行 selector 子集。定义对象不进入 JSON IR
 * @template TSelectorSource 行选择 schema 接受的原始声明类型
 * @template TSelectorOperation schema 解析后用于字段分析和选择的参数类型
 */
export type RowSelectorDefinition<
  TSelectorSource extends IRDataSelectorOperation = IRDataSelectorOperation,
  TSelectorOperation = TSelectorSource,
> = {
  /** 完整 selector operation schema；必须含非空 z.literal('kind') 供注册表提取注册键 */
  schema: ZodType<TSelectorOperation, TSelectorSource>;
  /** 该 selector 消费的源字段名；参与 data.model strict 校验 */
  inputFields?: (operation: TSelectorOperation) => Array<string>;
};

/**
 * 定义一个 row selector
 * @description 保留 schema 与输入字段声明之间的泛型关联；内置与自定义 selector 都经同一 registry 入口解析
 * @remarks 该入口是 typed identity：在保持定义对象原样的同时，为后续运行时校验、默认值归一或泛型收敛预留稳定 contract hook
 * @template TSelectorSource 行选择 schema 接受的原始声明类型
 * @template TSelectorOperation schema 解析后用于字段分析和选择的参数类型
 */
export const defineRowSelector = <
  TSelectorSource extends IRDataSelectorOperation,
  TSelectorOperation = TSelectorSource,
>(
  def: RowSelectorDefinition<TSelectorSource, TSelectorOperation>,
): RowSelectorDefinition<TSelectorSource, TSelectorOperation> => def;

/**
 * 注册表内部使用的 selector 宽类型
 * @description registry 需要存放不同 operation 泛型的 definition；真正调用前必须用对应 schema parse 收窄
 */
export type AnyRowSelectorDefinition = {
  /** 调用选择回调前用于解析具体选择参数的 schema */
  schema: ZodType;
  /** 列出选择操作引用的输入字段；调用前须恢复对应 schema 的参数关联 */
  inputFields?: (operation: never) => Array<string>;
};

/**
 * reducer 的独立计算；参数由同一语义 schema 解析
 * @template TSource 计算定义 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给计算回调的参数类型
 * @template TResult 归约回调返回的数据行或其 Promise 类型
 */
export type StatisticsReducerImplementation<
  TSource extends IRDataReducerOperation = IRDataReducerOperation,
  TOperation = TSource,
  TResult extends ExternalRow | Promise<ExternalRow> = ExternalRow | Promise<ExternalRow>,
> = Readonly<{
  /** 唯一统计语义身份 */
  definition: StatisticsReducerDefinition<TSource, TOperation>;
  /** 规约当前组并返回声明字段 */
  reduce: (rows: Array<ExternalRow>, operation: TOperation, context: TransformContext) => TResult;
}>;

/**
 * 保留 schema 输入、解析参数与计算回调的关联
 * @template TSource 计算定义 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给计算回调的参数类型
 * @template TResult 归约回调返回的数据行或其 Promise 类型
 */
export const defineStatisticsReducerImplementation = <
  TSource extends IRDataReducerOperation,
  TOperation,
  TResult extends ExternalRow | Promise<ExternalRow>,
>(
  implementation: StatisticsReducerImplementation<TSource, TOperation, TResult>,
): StatisticsReducerImplementation<TSource, TOperation, TResult> => implementation;

/** 异构 reducer 计算注册项 */
export type AnyStatisticsReducerImplementation = Readonly<{
  /** 唯一语义身份 */
  definition: AnyStatisticsReducerDefinition;
  /** 已解析参数的计算 */
  reduce: (rows: Array<ExternalRow>, operation: never, context: TransformContext) => ExternalRow | Promise<ExternalRow>;
}>;

/** 同步统计入口限定结果类型 */
export type AnySynchronousStatisticsReducerImplementation = Omit<AnyStatisticsReducerImplementation, 'reduce'> &
  Readonly<{
    /** 不返回 Promise 的计算 */
    reduce: (rows: Array<ExternalRow>, operation: never, context: TransformContext) => ExternalRow;
  }>;

/**
 * selector 的独立计算实现
 * @template TSource 计算定义 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给计算回调的参数类型
 * @template TResult 选择回调返回的行选择数组或其 Promise 类型
 */
export type RowSelectorImplementation<
  TSource extends IRDataSelectorOperation = IRDataSelectorOperation,
  TOperation = TSource,
  TResult extends Array<RowSelection> | Promise<Array<RowSelection>> =
    | Array<RowSelection>
    | Promise<Array<RowSelection>>,
> = Readonly<{
  /** 唯一选择语义身份 */
  definition: RowSelectorDefinition<TSource, TOperation>;
  /** 选择本组原始行及一基排名 */
  select: (rows: Array<ExternalRow>, operation: TOperation) => TResult;
}>;

/**
 * 保留 selector 定义与解析参数关联
 * @template TSource 计算定义 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给计算回调的参数类型
 * @template TResult 选择回调返回的行选择数组或其 Promise 类型
 */
export const defineRowSelectorImplementation = <
  TSource extends IRDataSelectorOperation,
  TOperation,
  TResult extends Array<RowSelection> | Promise<Array<RowSelection>>,
>(
  implementation: RowSelectorImplementation<TSource, TOperation, TResult>,
): RowSelectorImplementation<TSource, TOperation, TResult> => implementation;

/** 异构 selector 计算注册项 */
export type AnyRowSelectorImplementation = Readonly<{
  /** 唯一语义身份 */
  definition: AnyRowSelectorDefinition;
  /** 已解析参数的计算 */
  select: (rows: Array<ExternalRow>, operation: never) => Array<RowSelection> | Promise<Array<RowSelection>>;
}>;

/** 同步选择入口限定结果类型 */
export type AnySynchronousRowSelectorImplementation = Omit<AnyRowSelectorImplementation, 'select'> &
  Readonly<{
    /** 不返回 Promise 的计算 */
    select: (rows: Array<ExternalRow>, operation: never) => Array<RowSelection>;
  }>;

/**
 * 从统计子算子定义 schema 中提取注册键
 * @description reducer 与 row selector 都以 `kind` 作为 registry discriminator；schema 必须把它声明成非空字面量
 */
export const extractStatisticOperation = (schema: ZodType): string => {
  if (!(schema instanceof ZodObject)) {
    throw new RetikzDataError('data: statistic registration schema must be a ZodObject with a literal kind field');
  }

  const kindSchema = schema.shape.kind;
  if (!(kindSchema instanceof ZodLiteral) || typeof kindSchema.value !== 'string' || kindSchema.value.length === 0) {
    throw new RetikzDataError('data: statistic registration schema must declare kind as a non-empty z.literal string');
  }

  return kindSchema.value;
};
