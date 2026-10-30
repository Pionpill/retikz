import * as data from '@retikz/data';

import { RetikzPlotError } from '../../error';

/** Data mathematical definitions consumed by Plot */
export const BUILTIN_PLOT_SCALES = data.BUILTIN_SCALES;

/** Merge mathematical definitions without consumer metadata */
export const resolveScaleRegistry = (
  custom: ReadonlyArray<data.ScaleDefinition> = [],
): Map<string, data.ScaleDefinition> => {
  try {
    return new Map(data.resolveScaleRegistry(custom));
  } catch (cause) {
    throw new RetikzPlotError('lowerPlots: invalid scale registry', { cause });
  }
};
