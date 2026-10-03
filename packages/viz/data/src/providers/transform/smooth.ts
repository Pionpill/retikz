import { isFiniteNumber } from '@retikz/math';

import type { TransformContext, RegressionPair, RegressionModel } from '../../contract';
import { RetikzDataError } from '../../error';
import type { IRRegressionMethod, IRDataSmoothTransform } from '../../schemas';
import { BuiltinRegressionMethod } from '../../schemas';
import type { ExternalRow } from '../../shared';
import { resolveFieldPath } from '../data';
import { resolveRegression } from '../regression';
import { computeTransformValue, runTransformComputation } from './computation';
import type { TransformComputation } from './computation';
import { groupRowsByFields, linearSamplesOf } from './shared';

const DEFAULT_SMOOTH_SAMPLE_COUNT = 64;

type SmoothPair = {
  x: number;
  y: number;
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

const sampleExtentOf = (operation: IRDataSmoothTransform, pairs: Array<SmoothPair>): [number, number] => {
  if (operation.extent !== undefined) return operation.extent;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const pair of pairs) {
    min = Math.min(min, pair.x);
    max = Math.max(max, pair.x);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    throw new RetikzDataError('data: smooth inferred extent requires at least two distinct finite x values');
  }
  return [min, max];
};

const groupSummaryOf = (operation: IRDataSmoothTransform, values: ExternalRow): string =>
  operation.groupBy === undefined
    ? 'ungrouped rows'
    : operation.groupBy.map(field => `${field}=${JSON.stringify(values[field])}`).join(', ');

const smoothMethodOf = (operation: IRDataSmoothTransform): IRRegressionMethod =>
  operation.method ?? { kind: BuiltinRegressionMethod.Linear };

/** 返回 smooth transform 读取的源字段 */
export const smoothInputFields = (operation: IRDataSmoothTransform): Array<string> => [
  operation.x,
  operation.y,
  ...(operation.groupBy ?? []),
];

/** 返回 smooth transform 写出的派生字段 */
export const smoothOutputFields = (operation: IRDataSmoothTransform): Array<string> => [operation.xAs, operation.yAs];

/** smooth：按 method 拟合回归模型，每组输出 sampleCount 个预测点 */
export function* computeSmooth(
  rows: Array<ExternalRow>,
  operation: IRDataSmoothTransform,
  context: TransformContext,
  regression: {
    fit: (pairs: Array<RegressionPair>) => RegressionModel | Promise<RegressionModel>;
    validateExtent: (extent: [number, number]) => void;
  },
): TransformComputation<Array<ExternalRow>> {
  const method = smoothMethodOf(operation);
  const output: Array<ExternalRow> = [];
  for (const group of groupRowsByFields(rows, operation.groupBy)) {
    try {
      const pairs = finitePairsOf(group.rows, operation.x, operation.y);
      const model = yield* computeTransformValue(() => regression.fit(pairs));
      const extent = sampleExtentOf(operation, pairs);
      regression.validateExtent(extent);
      const sampleCount = operation.sampleCount ?? DEFAULT_SMOOTH_SAMPLE_COUNT;
      const predictions = linearSamplesOf(extent, sampleCount).map(x =>
        context.groupProvenance(
          {
            ...group.values,
            [operation.xAs]: x,
            [operation.yAs]: model.predict(x),
          },
          group.rows,
        ),
      );
      output.push(...predictions);
    } catch (cause) {
      const reason = cause instanceof RetikzDataError ? `: ${cause.message}` : '';
      throw new RetikzDataError(
        `data: smooth transform ${method.kind} regression failed for group ${groupSummaryOf(operation, group.values)}${reason}`,
        { cause },
      );
    }
  }
  return output;
}

/** 同步拟合入口，使用与异步路径相同的分组与采样算法 */
export const applySmooth = (
  rows: Array<ExternalRow>,
  operation: IRDataSmoothTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  runTransformComputation(
    computeSmooth(
      rows,
      operation,
      context,
      resolveRegression(
        smoothMethodOf(operation),
        context.regressionRegistry,
        context.regressionImplementationRegistry,
      ),
    ),
  );
