import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { RectangleSchema } from './schema';
/** 持久化的 Rectangle 形状 */
export type IRRectangle = ShapeSource<ZodInput<typeof RectangleSchema>>;
