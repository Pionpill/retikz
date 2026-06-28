import { isFiniteNumber } from '@retikz/math';
import { type TransformContext } from '../../contract';
import { type ExternalRow, type SmoothTransform } from '../../schemas';
import { resolveFieldPath } from '../data';

const DEFAULT_SMOOTH_SAMPLE_COUNT = 64;

type SmoothGroup = {
  rows: Array<ExternalRow>;
  values: ExternalRow;
};

type SmoothPair = {
  x: number;
  y: number;
};

type LinearModel = {
  intercept: number;
  slope: number;
};

const groupKeyOf = (row: ExternalRow, groupBy: ReadonlyArray<string>): string =>
  JSON.stringify(groupBy.map(field => resolveFieldPath(row, field) ?? null));

const groupRows = (rows: Array<ExternalRow>, groupBy?: Array<string>): Array<SmoothGroup> => {
  const fields = groupBy ?? [];
  if (fields.length === 0) return [{ rows, values: {} }];
  const groups = new Map<string, SmoothGroup>();
  for (const row of rows) {
    const key = groupKeyOf(row, fields);
    const found = groups.get(key);
    if (found !== undefined) {
      found.rows.push(row);
      continue;
    }
    const values: ExternalRow = {};
    for (const field of fields) values[field] = resolveFieldPath(row, field);
    groups.set(key, { rows: [row], values });
  }
  return [...groups.values()];
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
    throw new Error('lowerPlots: smooth transform linear regression x variance is zero; vertical lines cannot be fitted');
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

const samplePositionsOf = (extent: [number, number], sampleCount: number): Array<number> => {
  if (sampleCount === 2) return [extent[0], extent[1]];
  const step = (extent[1] - extent[0]) / (sampleCount - 1);
  return Array.from({ length: sampleCount }, (_, index) => (index === sampleCount - 1 ? extent[1] : extent[0] + step * index));
};

export const smoothInputFields = (operation: SmoothTransform): Array<string> => [operation.x, operation.y, ...(operation.groupBy ?? [])];

export const smoothOutputFields = (operation: SmoothTransform): Array<string> => [operation.xAs, operation.yAs];

/** smooth：首轮只做普通最小二乘线性回归，每组输出 sampleCount 个预测点。 */
export const applySmooth = (rows: Array<ExternalRow>, operation: SmoothTransform, context: TransformContext): Array<ExternalRow> =>
  groupRows(rows, operation.groupBy).flatMap(group => {
    const pairs = finitePairsOf(group.rows, operation.x, operation.y);
    const model = linearModelOf(pairs);
    const extent = sampleExtentOf(operation, pairs);
    const sampleCount = operation.sampleCount ?? DEFAULT_SMOOTH_SAMPLE_COUNT;
    return samplePositionsOf(extent, sampleCount).map(x =>
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
