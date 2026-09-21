import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { CircleSchema } from './schema';
/** 持久化的 Circle 形状 */
export type IRCircle = ShapeSource<ZodInput<typeof CircleSchema>>;
