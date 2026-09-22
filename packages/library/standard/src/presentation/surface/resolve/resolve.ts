import { resolveBoxSpacing } from '@retikz/core';

import { SurfaceSchema } from '../schema';
import type { IRSurface } from '../types';
import type { CanonicalSurface } from './types';

/** 在 Surface 测量前确定唯一盒模型，不把默认写回作者配置 */
export const resolveSurface = (source: IRSurface): CanonicalSurface => ({
  ...source,
  padding: resolveBoxSpacing(source.padding, 0),
  overflow: source.overflow ?? SurfaceSchema.shape.overflow.parse(undefined),
  cornerRadius: source.cornerRadius ?? SurfaceSchema.shape.cornerRadius.parse(undefined),
});
