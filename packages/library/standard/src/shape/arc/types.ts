import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { ArcSchema } from './schema';
/** 持久化的 Arc 形状 */
export type IRArc = ShapeSource<ZodInput<typeof ArcSchema>>;
