import { OverlayLayoutInspectOptionsSchema } from '../../overlay-layout/schemas';
import type { OverlayLayoutInspectOptions } from '../../overlay-layout/types';
import { resolveBaseLayoutInspectOptions } from '../shared';
import type { CanonicalOverlayLayoutInspectOptions } from './types';

/** 解析 Overlay 观测选项的共享简写与专属默认 */
export const resolveOverlayLayoutInspectOptions = (
  options: OverlayLayoutInspectOptions,
): CanonicalOverlayLayoutInspectOptions => {
  const defaultOptions = OverlayLayoutInspectOptionsSchema.parse({});
  return {
    ...resolveBaseLayoutInspectOptions(options),
    placements: options.placements ?? defaultOptions.placements,
    anchors: options.anchors ?? defaultOptions.anchors,
    stacking: options.stacking ?? defaultOptions.stacking,
  };
};
