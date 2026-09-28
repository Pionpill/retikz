import { defineRegression } from '../../contract';
import type { AnyRegressionDefinition, RegressionPair } from '../../contract';
import { RetikzDataError } from '../../error';
import { BuiltinRegressionMethodSchemas } from '../../schemas';
import type { IRRegressionMethod } from '../../schemas';
import { assertPositiveDomain, fitPolynomial, linearModel } from './models';

/** 正自变量方法共用的预测域约束 */
const validatePositiveExtent = (_operation: IRRegressionMethod, extent: readonly [number, number]): void => {
  if (extent[0] <= 0) throw new RetikzDataError('data: regression sampling extent requires positive x values');
};

/** 对观测作对数变换；模型预测仍处于原数据空间 */
const logarithmicPairs = (pairs: ReadonlyArray<RegressionPair>) =>
  pairs.map(pair => ({ x: Math.log(pair.x), y: pair.y }));

/** 内置拟合均遵守同一 Definition 契约 */
export const BUILTIN_REGRESSIONS: ReadonlyArray<AnyRegressionDefinition> = [
  defineRegression({
    schema: BuiltinRegressionMethodSchemas.Linear,
    fit: (pairs, method) => linearModel(pairs, method, ({ intercept, slope }, x) => intercept + slope * x),
  }),
  defineRegression({
    schema: BuiltinRegressionMethodSchemas.Quadratic,
    fit: (pairs, method) => fitPolynomial(pairs, 2, method),
  }),
  defineRegression({
    schema: BuiltinRegressionMethodSchemas.Polynomial,
    fit: (pairs, method) => fitPolynomial(pairs, method.order, method),
  }),
  defineRegression({
    schema: BuiltinRegressionMethodSchemas.Logarithmic,
    fit: (pairs, method) => {
      assertPositiveDomain(pairs, method, 'x');
      return linearModel(logarithmicPairs(pairs), method, ({ intercept, slope }, x) => intercept + slope * Math.log(x));
    },
    validateExtent: validatePositiveExtent,
  }),
  defineRegression({
    schema: BuiltinRegressionMethodSchemas.Exponential,
    fit: (pairs, method) => {
      assertPositiveDomain(pairs, method, 'y');
      return linearModel(
        pairs.map(pair => ({ x: pair.x, y: Math.log(pair.y) })),
        method,
        ({ intercept, slope }, x) => Math.exp(intercept + slope * x),
      );
    },
  }),
  defineRegression({
    schema: BuiltinRegressionMethodSchemas.Power,
    fit: (pairs, method) => {
      assertPositiveDomain(pairs, method, 'x/y');
      return linearModel(
        pairs.map(pair => ({ x: Math.log(pair.x), y: Math.log(pair.y) })),
        method,
        ({ intercept, slope }, x) => Math.exp(intercept + slope * Math.log(x)),
      );
    },
    validateExtent: validatePositiveExtent,
  }),
];
