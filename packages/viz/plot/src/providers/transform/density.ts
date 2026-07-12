import type { ExternalRow, TransformContext } from '@retikz/data';

import { finiteFieldValuesOf, groupRowsByFields, linearSamplesOf } from '@retikz/data';
import { isFiniteNumber } from '@retikz/math';

import type { IRPlotDensityTransform } from '../../schemas';

import { DensityBandwidthKind } from '../../schemas';

const DEFAULT_DENSITY_SAMPLE_COUNT = 64;
const DENSITY_EXTENT_BANDWIDTH_FACTOR = 3;
const GAUSSIAN_NORMALIZER = 1 / Math.sqrt(2 * Math.PI);

const standardDeviationOf = (values: ReadonlyArray<number>): number => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
};

/** 在已排序数值数组上按线性插值计算分位点。 */
const quantileOfSorted = (sorted: Array<number>, p: number): number => {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const index = (sorted.length - 1) * p;
  const lo = Math.floor(index);
  const hi = Math.ceil(index);
  if (lo === hi) return sorted[lo];
  const weight = index - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
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

const bandwidthOf = (operation: IRPlotDensityTransform, sortedValues: Array<number>): number => {
  if (operation.bandwidth?.kind === DensityBandwidthKind.Value) return operation.bandwidth.value;
  return silvermanBandwidthOf(sortedValues);
};

const sampleExtentOf = (
  operation: IRPlotDensityTransform,
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

/** 返回 density transform 读取的源字段。 */
export const densityInputFields = (operation: IRPlotDensityTransform): Array<string> => [
  operation.field,
  ...(operation.groupBy ?? []),
];

/** 返回 density transform 写出的派生字段。 */
export const densityOutputFields = (operation: IRPlotDensityTransform): Array<string> => [
  operation.xAs,
  operation.densityAs,
];

/** density：一维 Gaussian KDE 采样，每组输出 sampleCount 行。 */
export const applyDensity = (
  rows: Array<ExternalRow>,
  operation: IRPlotDensityTransform,
  context: TransformContext,
): Array<ExternalRow> =>
  groupRowsByFields(rows, operation.groupBy).flatMap(group => {
    const sortedValues = finiteFieldValuesOf(group.rows, operation.field).sort((a, b) => a - b);
    if (sortedValues.length === 0) {
      throw new Error(`lowerPlots: density transform field "${operation.field}" has no finite values`);
    }
    const bandwidth = bandwidthOf(operation, sortedValues);
    const extent = sampleExtentOf(operation, sortedValues, bandwidth);
    const sampleCount = operation.sampleCount ?? DEFAULT_DENSITY_SAMPLE_COUNT;
    return linearSamplesOf(extent, sampleCount).map(x =>
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
