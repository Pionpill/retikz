import type { ZodType } from 'zod';

import type { ExternalRow } from '../../shared';
import type { DataTransformOutputDescriptor, TransformContext } from '../../transform';
import type { IRDataReducerOperation } from './schema';

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
 * @param def 具备精确参数关联的定义或实现；不会自动注册
 * @returns 原样返回传入对象，保留泛型关联
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
 * @param implementation 具备精确参数关联的定义或实现；不会自动注册
 * @returns 原样返回传入对象，保留泛型关联
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
