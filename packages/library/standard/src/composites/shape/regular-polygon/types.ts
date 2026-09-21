import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { RegularPolygonSchema } from './schema';
/** 持久化的 RegularPolygon 形状 */
export type IRRegularPolygon = ShapeSource<ZodInput<typeof RegularPolygonSchema>>;
