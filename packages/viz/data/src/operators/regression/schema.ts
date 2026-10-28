import { createOpenStringSchema, JsonValueSchema } from '@retikz/foundation';
import type { input } from 'zod';
import { literal, looseObject, number, strictObject } from 'zod';

/** 内置拟合方法提示；实际可用方法由当前 registry 决定 */
export const BuiltinRegressionMethod = {
  /** 线性拟合 */
  Linear: 'linear',
  /** 二次多项式拟合 */
  Quadratic: 'quadratic',
  /** 指定阶数的多项式拟合 */
  Polynomial: 'polynomial',
  /** 对数拟合 */
  Logarithmic: 'logarithmic',
  /** 指数拟合 */
  Exponential: 'exponential',
  /** 幂函数拟合 */
  Power: 'power',
} as const;

/** 可序列化拟合方法 envelope；精确参数由选中的 Definition 解析 */
export const RegressionMethodSchema = looseObject({
  kind: createOpenStringSchema(BuiltinRegressionMethod).describe('Registered regression method kind'),
})
  .catchall(JsonValueSchema)
  .describe('Regression method with JSON parameters');

/** 内置拟合 Definition 的精确参数真源 */
export const BUILTIN_REGRESSION_METHOD_SCHEMAS = {
  Linear: strictObject({ kind: literal(BuiltinRegressionMethod.Linear) }),
  Quadratic: strictObject({ kind: literal(BuiltinRegressionMethod.Quadratic) }),
  Polynomial: strictObject({
    kind: literal(BuiltinRegressionMethod.Polynomial),
    order: number().int().min(2).max(6).default(3).describe('Polynomial degree'),
  }),
  Logarithmic: strictObject({ kind: literal(BuiltinRegressionMethod.Logarithmic) }),
  Exponential: strictObject({ kind: literal(BuiltinRegressionMethod.Exponential) }),
  Power: strictObject({ kind: literal(BuiltinRegressionMethod.Power) }),
};

export type IRRegressionMethod = input<typeof RegressionMethodSchema>;
