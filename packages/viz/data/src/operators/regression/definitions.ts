import { RetikzDataError } from '../../error';
import type { AnyRegressionDefinition, AnySynchronousRegressionImplementation, RegressionPair } from './contract';
import { defineRegression, defineRegressionImplementation } from './contract';
import { assertPositiveDomain, fitPolynomial, linearModel } from './models';
import type { IRRegressionMethod } from './schema';
import { BUILTIN_REGRESSION_METHOD_SCHEMAS } from './schema';

/** 正自变量方法共用的预测域约束 */
const assertPositiveExtent = (_operation: IRRegressionMethod, extent: readonly [number, number]): void => {
  if (extent[0] <= 0) throw new RetikzDataError('data: regression sampling extent requires positive x values');
};

/** 对观测作对数变换；模型预测仍处于原数据空间 */
const logarithmicPairs = (pairs: ReadonlyArray<RegressionPair>) =>
  pairs.map(pair => ({ x: Math.log(pair.x), y: pair.y }));

/** Linear 拟合的纯语义定义 */
const linearRegressionDefinition = defineRegression({ schema: BUILTIN_REGRESSION_METHOD_SCHEMAS.Linear });

/** Linear 的内置计算 */
const linearRegressionImplementation = defineRegressionImplementation({
  definition: linearRegressionDefinition,
  fit: (pairs, method) => linearModel(pairs, method, ({ intercept, slope }, x) => intercept + slope * x),
});

/** Quadratic 拟合的纯语义定义 */
const quadraticRegressionDefinition = defineRegression({ schema: BUILTIN_REGRESSION_METHOD_SCHEMAS.Quadratic });

/** Quadratic 的内置计算 */
const quadraticRegressionImplementation = defineRegressionImplementation({
  definition: quadraticRegressionDefinition,
  fit: (pairs, method) => fitPolynomial(pairs, 2, method),
});

/** Polynomial 拟合的纯语义定义 */
const polynomialRegressionDefinition = defineRegression({ schema: BUILTIN_REGRESSION_METHOD_SCHEMAS.Polynomial });

/** Polynomial 的内置计算 */
const polynomialRegressionImplementation = defineRegressionImplementation({
  definition: polynomialRegressionDefinition,
  fit: (pairs, method) => fitPolynomial(pairs, method.order, method),
});

/** Logarithmic 拟合的纯语义定义 */
const logarithmicRegressionDefinition = defineRegression({
  schema: BUILTIN_REGRESSION_METHOD_SCHEMAS.Logarithmic,
  validateExtent: assertPositiveExtent,
});

/** Logarithmic 的内置计算 */
const logarithmicRegressionImplementation = defineRegressionImplementation({
  definition: logarithmicRegressionDefinition,
  fit: (pairs, method) => {
    assertPositiveDomain(pairs, method, 'x');
    return linearModel(logarithmicPairs(pairs), method, ({ intercept, slope }, x) => intercept + slope * Math.log(x));
  },
});

/** Exponential 拟合的纯语义定义 */
const exponentialRegressionDefinition = defineRegression({ schema: BUILTIN_REGRESSION_METHOD_SCHEMAS.Exponential });

/** Exponential 的内置计算 */
const exponentialRegressionImplementation = defineRegressionImplementation({
  definition: exponentialRegressionDefinition,
  fit: (pairs, method) => {
    assertPositiveDomain(pairs, method, 'y');
    return linearModel(
      pairs.map(pair => ({ x: pair.x, y: Math.log(pair.y) })),
      method,
      ({ intercept, slope }, x) => Math.exp(intercept + slope * x),
    );
  },
});

/** Power 拟合的纯语义定义 */
const powerRegressionDefinition = defineRegression({
  schema: BUILTIN_REGRESSION_METHOD_SCHEMAS.Power,
  validateExtent: assertPositiveExtent,
});

/** Power 的内置计算 */
const powerRegressionImplementation = defineRegressionImplementation({
  definition: powerRegressionDefinition,
  fit: (pairs, method) => {
    assertPositiveDomain(pairs, method, 'x/y');
    return linearModel(
      pairs.map(pair => ({ x: Math.log(pair.x), y: Math.log(pair.y) })),
      method,
      ({ intercept, slope }, x) => Math.exp(intercept + slope * Math.log(x)),
    );
  },
});

/** 内置拟合均遵守同一 Definition 契约 */
export const BUILTIN_REGRESSIONS: ReadonlyArray<AnyRegressionDefinition> = [
  linearRegressionDefinition,
  quadraticRegressionDefinition,
  polynomialRegressionDefinition,
  logarithmicRegressionDefinition,
  exponentialRegressionDefinition,
  powerRegressionDefinition,
];

/** 内置同步拟合计算集合 */
export const BUILTIN_REGRESSION_IMPLEMENTATIONS: ReadonlyArray<AnySynchronousRegressionImplementation> = [
  linearRegressionImplementation,
  quadraticRegressionImplementation,
  polynomialRegressionImplementation,
  logarithmicRegressionImplementation,
  exponentialRegressionImplementation,
  powerRegressionImplementation,
];
