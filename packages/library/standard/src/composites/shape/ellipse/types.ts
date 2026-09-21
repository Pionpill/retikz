import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { EllipseSchema } from './schema';
/** 持久化的 Ellipse 形状 */
export type IREllipse = ShapeSource<ZodInput<typeof EllipseSchema>>;
