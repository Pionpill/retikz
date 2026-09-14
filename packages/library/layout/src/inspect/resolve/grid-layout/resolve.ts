import type { GridLayoutInspectOptions } from '../../grid-layout/types';
import type { CanonicalGridLayoutInspectOptions } from './types';

import { GridLayoutInspectOptionsSchema } from '../../grid-layout/schemas';
import { resolveBaseLayoutInspectOptions } from '../shared';

/** 解析 Grid 观测选项的共享简写与专属默认 */
export const resolveGridLayoutInspectOptions = (
  options: GridLayoutInspectOptions,
): CanonicalGridLayoutInspectOptions => {
  const defaultOptions = GridLayoutInspectOptionsSchema.parse({});
  return {
    ...resolveBaseLayoutInspectOptions(options),
    tracks: options.tracks ?? defaultOptions.tracks,
    cells: options.cells ?? defaultOptions.cells,
    gaps: options.gaps ?? defaultOptions.gaps,
    distributedSpace: options.distributedSpace ?? defaultOptions.distributedSpace,
    spans: options.spans ?? defaultOptions.spans,
  };
};
