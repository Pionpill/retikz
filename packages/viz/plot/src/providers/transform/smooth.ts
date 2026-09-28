import type { ExternalRow, IRRegressionMethod, TransformContext } from '@retikz/data';
import {
  BuiltinRegressionMethod,
  groupRowsByFields,
  linearSamplesOf,
  resolveFieldPath,
  resolveRegression,
  RetikzDataError,
} from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import { RetikzPlotError } from '../../error';
import type { IRPlotSmoothTransform } from '../../schemas';

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

const sampleExtentOf = (operation: IRPlotSmoothTransform, pairs: Array<SmoothPair>): [number, number] => {
  if (operation.extent !== undefined) return operation.extent;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const pair of pairs) {
    min = Math.min(min, pair.x);
    max = Math.max(max, pair.x);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    throw new RetikzPlotError('lowerPlots: smooth inferred extent requires at least two distinct finite x values');
  }
  return [min, max];
};

const groupSummaryOf = (operation: IRPlotSmoothTransform, values: ExternalRow): string =>
  operation.groupBy === undefined
    ? 'ungrouped rows'
    : operation.groupBy.map(field => `${field}=${JSON.stringify(values[field])}`).join(', ');

const smoothMethodOf = (operation: IRPlotSmoothTransform): IRRegressionMethod =>
  operation.method ?? { kind: BuiltinRegressionMethod.Linear };

/** 返回 smooth transform 读取的源字段 */
export const smoothInputFields = (operation: IRPlotSmoothTransform): Array<string> => [
  operation.x,
  operation.y,
  ...(operation.groupBy ?? []),
];

/** 返回 smooth transform 写出的派生字段 */
export const smoothOutputFields = (operation: IRPlotSmoothTransform): Array<string> => [operation.xAs, operation.yAs];

/** smooth：按 method 拟合回归模型，每组输出 sampleCount 个预测点 */
export const applySmooth = (
  rows: Array<ExternalRow>,
  operation: IRPlotSmoothTransform,
  context: TransformContext,
): Array<ExternalRow> => {
  const method = smoothMethodOf(operation);
  const regression = resolveRegression(method, context.regressionRegistry);
  return groupRowsByFields(rows, operation.groupBy).flatMap(group => {
    try {
      const pairs = finitePairsOf(group.rows, operation.x, operation.y);
      const model = regression.fit(pairs);
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
      return predictions;
    } catch (cause) {
      const reason = cause instanceof RetikzPlotError || cause instanceof RetikzDataError ? `: ${cause.message}` : '';
      throw new RetikzPlotError(
        `lowerPlots: smooth transform ${method.kind} regression failed for group ${groupSummaryOf(operation, group.values)}${reason}`,
        { cause },
      );
    }
  });
};
