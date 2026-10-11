import type { ZodType } from 'zod';
import { ZodLiteral, ZodObject } from 'zod';

import { RetikzDataError } from '../error';
import type { IRRegressionMethod } from '../schemas';

/** 有限数值观测 */
export type RegressionPair = Readonly<{
  /** 自变量 */
  x: number;
  /** 因变量 */
  y: number;
}>;

/** 拟合模型；仅用于运行时预测 */
export type RegressionModel = Readonly<{
  /** 在数据空间预测 y */
  predict: (x: number) => number;
}>;

/**
 * 内置与外部拟合共享的运行时契约
 * @template TSource 拟合方法 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给拟合及范围校验回调的参数类型，默认与输入声明一致
 */
export type RegressionDefinition<TSource extends IRRegressionMethod = IRRegressionMethod, TOperation = TSource> = {
  /** 精确参数 schema，kind 必须是非空字面量 */
  schema: ZodType<TOperation, TSource>;
  /** 方法专有预测域约束 */
  validateExtent?: (operation: TOperation, extent: readonly [number, number]) => void;
};

/**
 * 保留 schema 与回调的参数推断
 * @template TSource 拟合方法 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给拟合及范围校验回调的参数类型，默认与输入声明一致
 * @param definition 具备精确参数关联的定义或实现；不会自动注册
 * @returns 原样返回传入对象，保留泛型关联
 */
export const defineRegression = <TSource extends IRRegressionMethod, TOperation = TSource>(
  definition: RegressionDefinition<TSource, TOperation>,
): RegressionDefinition<TSource, TOperation> => definition;

/** registry 擦除不同方法的参数泛型；调用前必须精确解析 */
export type AnyRegressionDefinition = {
  /** 精确参数 schema */
  schema: ZodType;
  /** 已解析参数的预测域校验 */
  validateExtent?: (operation: never, extent: readonly [number, number]) => void;
};

/**
 * 拟合的独立计算实现
 * @template TSource 拟合方法 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给拟合及范围校验回调的参数类型，默认与输入声明一致
 * @template TResult 拟合回调返回的模型或模型 Promise 类型
 */
export type RegressionImplementation<
  TSource extends IRRegressionMethod = IRRegressionMethod,
  TOperation = TSource,
  TResult extends RegressionModel | Promise<RegressionModel> = RegressionModel | Promise<RegressionModel>,
> = Readonly<{
  /** 同一方法的唯一语义身份 */
  definition: RegressionDefinition<TSource, TOperation>;
  /** 拟合规范有限观测，返回预测模型 */
  fit: (pairs: ReadonlyArray<RegressionPair>, operation: TOperation) => TResult;
}>;

/**
 * 保留 schema 与拟合参数关联
 * @template TSource 拟合方法 schema 接受的原始声明类型
 * @template TOperation schema 解析后传给拟合及范围校验回调的参数类型，默认与输入声明一致
 * @template TResult 拟合回调返回的模型或模型 Promise 类型
 * @param implementation 具备精确参数关联的定义或实现；不会自动注册
 * @returns 原样返回传入对象，保留泛型关联
 */
export const defineRegressionImplementation = <
  TSource extends IRRegressionMethod,
  TOperation,
  TResult extends RegressionModel | Promise<RegressionModel>,
>(
  implementation: RegressionImplementation<TSource, TOperation, TResult>,
): RegressionImplementation<TSource, TOperation, TResult> => implementation;

/** 异构拟合计算注册项 */
export type AnyRegressionImplementation = Readonly<{
  /** 唯一拟合语义身份 */
  definition: AnyRegressionDefinition;
  /** 精确解析后的拟合 */
  fit: (pairs: ReadonlyArray<RegressionPair>, operation: never) => RegressionModel | Promise<RegressionModel>;
}>;

/** 同步拟合入口限定结果类型 */
export type AnySynchronousRegressionImplementation = Omit<AnyRegressionImplementation, 'fit'> &
  Readonly<{
    /** 不返回 Promise 的拟合 */
    fit: (pairs: ReadonlyArray<RegressionPair>, operation: never) => RegressionModel;
  }>;

/**
 * 从 Definition 提取唯一注册键
 * @param schema 注册定义的对象 schema，kind 必须是非空字符串字面量
 * @returns kind 字面量的字符串值
 * @throws {RetikzDataError} schema 不是对象或 kind 不是有效字面量
 */
export const extractRegressionKind = (schema: ZodType): string => {
  if (!(schema instanceof ZodObject))
    throw new RetikzDataError('data: regression schema must be an object with a literal kind');

  const kind = schema.shape.kind;
  if (!(kind instanceof ZodLiteral) || typeof kind.value !== 'string' || kind.value.trim().length === 0)
    throw new RetikzDataError('data: regression kind must be a non-blank literal');

  return kind.value;
};

/** 一次精确解析后的拟合入口，不进入 IR */
export type RegressionResolution = Readonly<{
  /** 拟合当前组，返回已包装异常与非有限值诊断的模型 */
  fit: (pairs: ReadonlyArray<RegressionPair>) => RegressionModel;
  /** 校验当前预测域 */
  validateExtent: (extent: readonly [number, number]) => void;
}>;
