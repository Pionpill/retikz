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

/** 内置与外部拟合共享的运行时契约 */
export type RegressionDefinition<TSource extends IRRegressionMethod = IRRegressionMethod, TOperation = TSource> = {
  /** 精确参数 schema，kind 必须是非空字面量 */
  schema: ZodType<TOperation, TSource>;
  /** 纯同步拟合，不得修改观测 */
  fit: (pairs: ReadonlyArray<RegressionPair>, operation: TOperation) => RegressionModel;
  /** 方法专有预测域约束 */
  validateExtent?: (operation: TOperation, extent: readonly [number, number]) => void;
};

/** 保留 schema 与回调的参数推断 */
export const defineRegression = <TSource extends IRRegressionMethod, TOperation = TSource>(
  definition: RegressionDefinition<TSource, TOperation>,
): RegressionDefinition<TSource, TOperation> => definition;

/** registry 擦除不同方法的参数泛型；调用前必须精确解析 */
export type AnyRegressionDefinition = {
  /** 精确参数 schema */
  schema: ZodType;
  /** 已解析参数的拟合回调 */
  fit: (pairs: ReadonlyArray<RegressionPair>, operation: never) => RegressionModel;
  /** 已解析参数的预测域校验 */
  validateExtent?: (operation: never, extent: readonly [number, number]) => void;
};

/** 从 Definition 提取唯一注册键 */
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
