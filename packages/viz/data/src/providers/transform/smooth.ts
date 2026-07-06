import { isFiniteNumber } from '@retikz/math';

import { type TransformContext } from '../../contract';
import { type ExternalRow, type SmoothTransform } from '../../schemas';
import { resolveFieldPath } from '../data';
import { groupRowsByFields, linearSamplesOf } from './shared';

const DEFAULT_SMOOTH_SAMPLE_COUNT = 64;

type SmoothPair = {
  x: number;
  y: number;
};

type LinearModel = {
  intercept: number;
  slope: number;
};

const finitePairsOf = (rows: Array<ExternalRow>, xField: string, yField: string): Array<SmoothPair> => {
  const pairs: Array<SmoothPair> = [];
  for (const row of rows) {
    const x = resolveFieldPath(row, xField);
    const y = resolveFieldPath(row, yField);
    if (isFiniteNumber(x) && isFiniteNumber(y)) pairs.push({ x, y });
  }
  return pairs;
};

const linearModelOf = (pairs: Array<SmoothPair>): LinearModel => {
  if (pairs.length < 2) {
    throw new Error('lowerPlots: smooth transform with linear method requires at least two finite x/y pairs');
  }
  const meanX = pairs.reduce((sum, pair) => sum + pair.x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, pair) => sum + pair.y, 0) / pairs.length;
  const varianceX = pairs.reduce((sum, pair) => sum + (pair.x - meanX) ** 2, 0);
  if (!isFiniteNumber(varianceX) || varianceX <= 0) {
    throw new Error(
      'lowerPlots: smooth transform linear regression x variance is zero; vertical lines cannot be fitted',
    );
  }
  const covarianceXY = pairs.reduce((sum, pair) => sum + (pair.x - meanX) * (pair.y - meanY), 0);
  const slope = covarianceXY / varianceX;
  const intercept = meanY - slope * meanX;
  if (!isFiniteNumber(slope) || !isFiniteNumber(intercept)) {
    throw new Error('lowerPlots: smooth transform linear regression produced non-finite coefficients');
  }
  return { intercept, slope };
};

const sampleExtentOf = (operation: SmoothTransform, pairs: Array<SmoothPair>): [number, number] => {
  if (operation.extent !== undefined) return operation.extent;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const pair of pairs) {
    min = Math.min(min, pair.x);
    max = Math.max(max, pair.x);
  }
  return [min, max];
};

export const smoothInputFields = (operation: SmoothTransform): Array<string> => [
  operation.x,
  operation.y,
  ...(operation.groupBy ?? []),
];

export const smoothOutputFields = (operation: SmoothTransform): Array<string> => [operation.xAs, operation.yAs];

/** smooth：首轮只做普通最小二乘线性回归，每组输出 sampleCount 个预测点。 */
export const applySmooth = (
  rows: Array<ExternalRow>,
  operation: SmoothTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  groupRowsByFields(rows, operation.groupBy).flatMap(group => {
    const pairs = finitePairsOf(group.rows, operation.x, operation.y);
    const model = linearModelOf(pairs);
    const extent = sampleExtentOf(operation, pairs);
    const sampleCount = operation.sampleCount ?? DEFAULT_SMOOTH_SAMPLE_COUNT;
    return linearSamplesOf(extent, sampleCount).map(x =>
      context.groupProvenance(
        {
          ...group.values,
          [operation.xAs]: x,
          [operation.yAs]: model.intercept + model.slope * x,
        },
        group.rows,
      ),
    );
  });
