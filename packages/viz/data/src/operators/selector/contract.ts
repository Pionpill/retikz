import type { ZodType } from 'zod';

import type { ExternalRow } from '../../shared';
import type { IRDataSelectorOperation } from './schema';

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
 * @param def 具备精确参数关联的定义或实现；不会自动注册
 * @returns 原样返回传入对象，保留泛型关联
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
 * @param implementation 具备精确参数关联的定义或实现；不会自动注册
 * @returns 原样返回传入对象，保留泛型关联
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
