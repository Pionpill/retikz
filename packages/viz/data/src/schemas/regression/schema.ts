import { createOpenStringSchema, JsonValueSchema } from '@retikz/foundation';
import { literal, looseObject, number, strictObject } from 'zod';

import { BuiltinRegressionMethod } from './constants';

/** 可序列化拟合方法 envelope；精确参数由选中的 Definition 解析 */
export const RegressionMethodSchema = looseObject({
  kind: createOpenStringSchema(BuiltinRegressionMethod).describe('Registered regression method kind'),
})
  .catchall(JsonValueSchema)
  .describe('Regression method with JSON parameters');

/** 内置拟合 Definition 的精确参数真源 */
export const BuiltinRegressionMethodSchemas = {
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
