import { isFiniteNumber } from '@retikz/math';

import type { IRPlotSmoothMethod } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { SmoothMethodKind } from '../../schemas';

/** 回归拟合读取的一对有限观测 */
export type RegressionPair = Readonly<{
  /** 自变量 */
  x: number;
  /** 因变量 */
  y: number;
}>;

/** 回归拟合后只暴露预测行为的私有模型 */
export type RegressionModel = Readonly<{
  /** 在数据空间预测给定 x 的 y */
  predict: (x: number) => number;
}>;

type LinearCoefficients = Readonly<{
  intercept: number;
  slope: number;
}>;

const regressionError = (method: IRPlotSmoothMethod, message: string): RetikzPlotError =>
  new RetikzPlotError(`lowerPlots: smooth transform ${method.kind} regression ${message}`);

const assertFiniteResult = (method: IRPlotSmoothMethod, value: number, label: string): number => {
  if (!isFiniteNumber(value)) throw regressionError(method, `produced a non-finite ${label}`);
  return value;
};

const assertPairCount = (pairs: Array<RegressionPair>, minimum: number, method: IRPlotSmoothMethod): void => {
  if (pairs.length < minimum) {
    throw regressionError(method, `requires at least ${minimum} finite x/y pairs`);
  }
};

const assertPositiveDomain = (
  pairs: Array<RegressionPair>,
  method: IRPlotSmoothMethod,
  axis: 'x' | 'y' | 'x/y',
): void => {
  const valid = pairs.every(pair => {
    if (axis === 'x') return pair.x > 0;
    if (axis === 'y') return pair.y > 0;
    return pair.x > 0 && pair.y > 0;
  });
  if (!valid) throw regressionError(method, `requires positive ${axis} values`);
};

const fitCenteredLinear = (pairs: Array<RegressionPair>, method: IRPlotSmoothMethod): LinearCoefficients => {
  assertPairCount(pairs, 2, method);
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  assertFiniteResult(method, meanX, 'x mean');
  assertFiniteResult(method, meanY, 'y mean');

  const varianceX = pairs.reduce((sum, pair) => sum + (pair.x - meanX) ** 2, 0);
  if (!isFiniteNumber(varianceX) || varianceX <= 0) {
    throw regressionError(method, 'x variance is zero or non-finite; distinct x values are required');
  }
  const covarianceXY = pairs.reduce((sum, pair) => sum + (pair.x - meanX) * (pair.y - meanY), 0);
  const slope = covarianceXY / varianceX;
  const intercept = meanY - slope * meanX;
  assertFiniteResult(method, slope, 'slope coefficient');
  assertFiniteResult(method, intercept, 'intercept coefficient');
  return { intercept, slope };
};

const linearModel = (
  pairs: Array<RegressionPair>,
  method: IRPlotSmoothMethod,
  inverse: (coefficients: LinearCoefficients, x: number) => number,
): RegressionModel => {
  const coefficients = fitCenteredLinear(pairs, method);
  return {
    predict: x => assertFiniteResult(method, inverse(coefficients, x), 'prediction'),
  };
};

const coefficientInfinityNorm = (matrix: Array<Array<number>>): number =>
  matrix.reduce(
    (maximum, row) =>
      Math.max(
        maximum,
        row.reduce((sum, value) => sum + Math.abs(value), 0),
      ),
    0,
  );

const solveNormalEquations = (
  coefficientMatrix: Array<Array<number>>,
  resultColumn: Array<number>,
  method: IRPlotSmoothMethod,
): Array<number> => {
  const dimension = coefficientMatrix.length;
  const matrix = coefficientMatrix.map(row => [...row]);
  const result = [...resultColumn];
  const matrixNorm = coefficientInfinityNorm(matrix);
  const tolerance = Number.EPSILON * dimension * Math.max(1, matrixNorm);
  const rowScales = matrix.map(row => Math.max(...row.map(value => Math.abs(value))));

  if (
    !isFiniteNumber(matrixNorm) ||
    matrix.some(row => row.some(value => !isFiniteNumber(value))) ||
    result.some(value => !isFiniteNumber(value))
  ) {
    throw regressionError(method, 'normal equations contain non-finite coefficients');
  }

  for (let column = 0; column < dimension; column++) {
    let pivotRow = column;
    let pivotRatio = -1;
    for (let row = column; row < dimension; row++) {
      const scale = rowScales[row];
      const ratio = scale > 0 ? Math.abs(matrix[row][column]) / scale : 0;
      if (ratio > pivotRatio) {
        pivotRatio = ratio;
        pivotRow = row;
      }
    }

    if (pivotRow !== column) {
      [matrix[column], matrix[pivotRow]] = [matrix[pivotRow], matrix[column]];
      [result[column], result[pivotRow]] = [result[pivotRow], result[column]];
      [rowScales[column], rowScales[pivotRow]] = [rowScales[pivotRow], rowScales[column]];
    }

    const pivot = matrix[column][column];
    if (!isFiniteNumber(pivot) || Math.abs(pivot) <= tolerance) {
      throw regressionError(method, 'design matrix is rank deficient');
    }

    for (let row = column + 1; row < dimension; row++) {
      const factor = matrix[row][column] / pivot;
      matrix[row][column] = 0;
      for (let index = column + 1; index < dimension; index++) {
        matrix[row][index] -= factor * matrix[column][index];
      }
      result[row] -= factor * result[column];
    }
  }

  const coefficients = Array<number>(dimension).fill(0);
  for (let row = dimension - 1; row >= 0; row--) {
    let known = 0;
    for (let column = row + 1; column < dimension; column++) {
      known += matrix[row][column] * coefficients[column];
    }
    coefficients[row] = (result[row] - known) / matrix[row][row];
    assertFiniteResult(method, coefficients[row], 'polynomial coefficient');
  }
  return coefficients;
};

const fitPolynomial = (pairs: Array<RegressionPair>, degree: number, method: IRPlotSmoothMethod): RegressionModel => {
  const dimension = degree + 1;
  assertPairCount(pairs, dimension, method);
  if (new Set(pairs.map(pair => pair.x)).size < dimension) {
    throw regressionError(method, `requires at least ${dimension} distinct x values`);
  }

  const minimumX = Math.min(...pairs.map(pair => pair.x));
  const maximumX = Math.max(...pairs.map(pair => pair.x));
  const center = minimumX + (maximumX - minimumX) / 2;
  const scale = Math.max(...pairs.map(pair => Math.abs(pair.x - center)));
  if (!isFiniteNumber(center) || !isFiniteNumber(scale) || scale <= 0) {
    throw regressionError(method, 'cannot normalize the x domain');
  }

  const matrix = Array.from({ length: dimension }, () => Array<number>(dimension).fill(0));
  const result = Array<number>(dimension).fill(0);
  for (const pair of pairs) {
    const normalizedX = (pair.x - center) / scale;
    const basis = Array<number>(dimension).fill(1);
    for (let power = 1; power < dimension; power++) basis[power] = basis[power - 1] * normalizedX;
    for (let row = 0; row < dimension; row++) {
      result[row] += basis[row] * pair.y;
      for (let column = 0; column < dimension; column++) matrix[row][column] += basis[row] * basis[column];
    }
  }

  const coefficients = solveNormalEquations(matrix, result, method);
  return {
    predict: x => {
      const normalizedX = (x - center) / scale;
      let prediction = coefficients[degree];
      for (let index = degree - 1; index >= 0; index--) prediction = prediction * normalizedX + coefficients[index];
      return assertFiniteResult(method, prediction, 'prediction');
    },
  };
};

/** 按 Smooth method 拟合私有回归模型 */
export const fitRegressionModel = (pairs: Array<RegressionPair>, method: IRPlotSmoothMethod): RegressionModel => {
  switch (method.kind) {
    case SmoothMethodKind.Linear:
      return linearModel(pairs, method, ({ intercept, slope }, x) => intercept + slope * x);
    case SmoothMethodKind.Quadratic:
      return fitPolynomial(pairs, 2, method);
    case SmoothMethodKind.Polynomial:
      return fitPolynomial(pairs, method.order ?? 3, method);
    case SmoothMethodKind.Logarithmic: {
      assertPositiveDomain(pairs, method, 'x');
      const transformed = pairs.map(pair => ({ x: Math.log(pair.x), y: pair.y }));
      return linearModel(transformed, method, ({ intercept, slope }, x) => intercept + slope * Math.log(x));
    }
    case SmoothMethodKind.Exponential: {
      assertPositiveDomain(pairs, method, 'y');
      const transformed = pairs.map(pair => ({ x: pair.x, y: Math.log(pair.y) }));
      return linearModel(transformed, method, ({ intercept, slope }, x) => Math.exp(intercept + slope * x));
    }
    case SmoothMethodKind.Power: {
      assertPositiveDomain(pairs, method, 'x/y');
      const transformed = pairs.map(pair => ({ x: Math.log(pair.x), y: Math.log(pair.y) }));
      return linearModel(transformed, method, ({ intercept, slope }, x) => Math.exp(intercept + slope * Math.log(x)));
    }
  }
};

/** 校验依赖正 x 的回归方法采样范围 */
export const assertRegressionExtent = (method: IRPlotSmoothMethod, extent: readonly [number, number]): void => {
  if ((method.kind === SmoothMethodKind.Logarithmic || method.kind === SmoothMethodKind.Power) && extent[0] <= 0) {
    throw regressionError(method, 'sampling extent requires positive x values');
  }
};
