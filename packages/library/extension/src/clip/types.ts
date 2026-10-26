import type { infer as ZodInfer } from 'zod';

import type {
  CircleClipSchema,
  CompoundClipSchema,
  EllipseClipSchema,
  PathClipSchema,
  PolygonClipSchema,
} from './schema';

export type IRCircleClip = ZodInfer<typeof CircleClipSchema>;

export type IREllipseClip = ZodInfer<typeof EllipseClipSchema>;

export type IRPolygonClip = ZodInfer<typeof PolygonClipSchema>;

export type IRPathClip = ZodInfer<typeof PathClipSchema>;

export type IRCompoundClip = ZodInfer<typeof CompoundClipSchema>;
