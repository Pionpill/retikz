import { isFiniteNumber } from '@retikz/math';

import { type TransformContext } from '../../contract';
import { type DensityTransform, type ExternalRow } from '../../schemas';
import { resolveFieldPath } from '../data';
import { quantileOfSorted } from '../statistics/helpers';

const DEFAULT_DENSITY_SAMPLE_COUNT = 64;
const DENSITY_EXTENT_BANDWIDTH_FACTOR = 3;
const GAUSSIAN_NORMALIZER = 1 / Math.sqrt(2 * Math.PI);

type DensityGroup = {
  rows: Array<ExternalRow>;
  values: ExternalRow;
};

const groupKeyOf = (row: ExternalRow, groupBy: ReadonlyArray<string>): string =>
  JSON.stringify(groupBy.map(field => resolveFieldPath(row, field) ?? null));

const groupRows = (rows: Array<ExternalRow>, groupBy?: Array<string>): Array<DensityGroup> => {
  const fields = groupBy ?? [];
  if (fields.length === 0) return [{ rows, values: {} }];
  const groups = new Map<string, DensityGroup>();
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

const finiteValuesOf = (rows: Array<ExternalRow>, field: string): Array<number> => {
  const values: Array<number> = [];
  for (const row of rows) {
    const value = resolveFieldPath(row, field);
    if (isFiniteNumber(value)) values.push(value);
  }
  return values;
};

const standardDeviationOf = (values: ReadonlyArray<number>): number => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

const silvermanBandwidthOf = (sortedValues: Array<number>): number => {
  if (sortedValues.length < 2) {
    throw new Error(
      'lowerPlots: density transform with Silverman bandwidth requires at least two finite samples; pass an explicit bandwidth for single-value groups',
    );
  }
  const stdDev = standardDeviationOf(sortedValues);
  const iqr = quantileOfSorted(sortedValues, 0.75) - quantileOfSorted(sortedValues, 0.25);
  const robustScale = iqr > 0 ? Math.min(stdDev, iqr / 1.34) : stdDev;
  const bandwidth = 0.9 * robustScale * sortedValues.length ** (-1 / 5);
  if (!isFiniteNumber(bandwidth) || bandwidth <= 0) {
    throw new Error(
      'lowerPlots: density transform could not compute a positive Silverman bandwidth; values may be identical, pass an explicit bandwidth',
    );
  }
  return bandwidth;
};

const bandwidthOf = (operation: DensityTransform, sortedValues: Array<number>): number => {
  if (operation.bandwidth?.kind === 'value') return operation.bandwidth.value;
  return silvermanBandwidthOf(sortedValues);
};

const sampleExtentOf = (
  operation: DensityTransform,
  sortedValues: Array<number>,
  bandwidth: number,
): [number, number] => {
  if (operation.extent !== undefined) return operation.extent;
  const min = sortedValues[0];
  const max = sortedValues[sortedValues.length - 1];
  return [min - DENSITY_EXTENT_BANDWIDTH_FACTOR * bandwidth, max + DENSITY_EXTENT_BANDWIDTH_FACTOR * bandwidth];
};

const gaussian = (value: number): number => GAUSSIAN_NORMALIZER * Math.exp(-0.5 * value * value);

const densityAt = (x: number, values: ReadonlyArray<number>, bandwidth: number): number => {
  const sum = values.reduce((acc, value) => acc + gaussian((x - value) / bandwidth) / bandwidth, 0);
  return sum / values.length;
};

const samplePositionsOf = (extent: [number, number], sampleCount: number): Array<number> => {
  if (sampleCount === 2) return [extent[0], extent[1]];
  const step = (extent[1] - extent[0]) / (sampleCount - 1);
  return Array.from({ length: sampleCount }, (_, index) =>
    index === sampleCount - 1 ? extent[1] : extent[0] + step * index,
  );
};

export const densityInputFields = (operation: DensityTransform): Array<string> => [
  operation.field,
  ...(operation.groupBy ?? []),
];

export const densityOutputFields = (operation: DensityTransform): Array<string> => [operation.xAs, operation.densityAs];

/** density：一维 Gaussian KDE 采样，每组输出 sampleCount 行。 */
export const applyDensity = (
  rows: Array<ExternalRow>,
  operation: DensityTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  groupRows(rows, operation.groupBy).flatMap(group => {
    const sortedValues = finiteValuesOf(group.rows, operation.field).sort((a, b) => a - b);
    if (sortedValues.length === 0) {
      throw new Error(`lowerPlots: density transform field "${operation.field}" has no finite values`);
    }
    const bandwidth = bandwidthOf(operation, sortedValues);
    const extent = sampleExtentOf(operation, sortedValues, bandwidth);
    const sampleCount = operation.sampleCount ?? DEFAULT_DENSITY_SAMPLE_COUNT;
    return samplePositionsOf(extent, sampleCount).map(x =>
      context.groupProvenance(
        {
          ...group.values,
          [operation.xAs]: x,
          [operation.densityAs]: densityAt(x, sortedValues, bandwidth),
        },
        group.rows,
      ),
    );
  });
