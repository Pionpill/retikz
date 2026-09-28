import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { PolygonSchema } from './schema';
/** 持久化的 Polygon 形状 */
export type IRPolygon = ShapeSource<ZodInput<typeof PolygonSchema>>;
