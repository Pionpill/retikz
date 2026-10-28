import { RetikzDataError } from '../error';
import type { ExternalDatasets, ExternalRow } from './types';

/** 合并具名行数据集；同名条目只接受相同行数组引用，不复制行数据 */
export const mergeExternalDatasets = (contributions: ReadonlyArray<ExternalDatasets>): ExternalDatasets => {
  const datasets = new Map<string, Array<ExternalRow>>();

  for (const contribution of contributions) {
    for (const [reference, rows] of Object.entries(contribution)) {
      if (datasets.has(reference) && !Object.is(datasets.get(reference), rows)) {
        throw new RetikzDataError(`dataset "${reference}" conflicts by identity`);
      }
      datasets.set(reference, rows);
    }
  }

  return Object.fromEntries(datasets);
};
