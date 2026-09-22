import { resolveBoxSpacing } from '@retikz/core';

import { FrameSchema } from '../schema';
import type { IRFrame } from '../types';
import type { CanonicalFrame } from './types';

/** 确定 Frame 默认并复用 Core 的 spacing 展开规则 */
export const resolveFrame = (source: IRFrame): CanonicalFrame => ({
  ...source,
  localNamespace: source.localNamespace ?? FrameSchema.shape.localNamespace.parse(undefined),
  boundingShape: source.boundingShape ?? FrameSchema.shape.boundingShape.parse(undefined),
  padding: resolveBoxSpacing(source.padding, resolveBoxSpacing(FrameSchema.shape.padding.parse(undefined), 0).top),
  gap: source.gap ?? FrameSchema.shape.gap.parse(undefined),
  headerDirection: source.headerDirection ?? FrameSchema.shape.headerDirection.parse(undefined),
  border: FrameSchema.shape.border.parse(source.border),
});
