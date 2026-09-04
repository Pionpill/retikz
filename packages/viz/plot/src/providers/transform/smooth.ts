import type { ExternalRow, TransformContext } from '@retikz/data';

import { groupRowsByFields, linearSamplesOf, resolveFieldPath } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type { IRPlotSmoothMethod, IRPlotSmoothTransform } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { SmoothMethodKind } from '../../schemas';
import { assertRegressionExtent, fitRegressionModel } from './regression';

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
  return [min, max];
};

const groupSummaryOf = (operation: IRPlotSmoothTransform, values: ExternalRow): string =>
  operation.groupBy === undefined
    ? 'ungrouped rows'
    : operation.groupBy.map(field => `${field}=${JSON.stringify(values[field])}`).join(', ');

const smoothMethodOf = (operation: IRPlotSmoothTransform): IRPlotSmoothMethod =>
  operation.method ?? { kind: SmoothMethodKind.Linear };

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
): Array<ExternalRow> =>
  groupRowsByFields(rows, operation.groupBy).flatMap(group => {
    const method = smoothMethodOf(operation);
    try {
      const pairs = finitePairsOf(group.rows, operation.x, operation.y);
      const model = fitRegressionModel(pairs, method);
      const extent = sampleExtentOf(operation, pairs);
      assertRegressionExtent(method, extent);
      const sampleCount = operation.sampleCount ?? DEFAULT_SMOOTH_SAMPLE_COUNT;
      return linearSamplesOf(extent, sampleCount).map(x =>
        context.groupProvenance(
          {
            ...group.values,
            [operation.xAs]: x,
            [operation.yAs]: model.predict(x),
          },
          group.rows,
        ),
      );
    } catch (cause) {
      const reason = cause instanceof RetikzPlotError ? `: ${cause.message}` : '';
      throw new RetikzPlotError(
        `lowerPlots: smooth transform ${method.kind} regression failed for group ${groupSummaryOf(operation, group.values)}${reason}`,
        { cause },
      );
    }
  });
