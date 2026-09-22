import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { StarSchema } from './schema';
/** 持久化的 Star 形状 */
export type IRStar = ShapeSource<ZodInput<typeof StarSchema>>;
