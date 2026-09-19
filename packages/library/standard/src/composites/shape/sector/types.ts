import type { input as ZodInput } from 'zod';

import type { ShapeSource } from '../shared';
import type { SectorSchema } from './schema';
/** 持久化的 Sector 形状 */
export type IRSector = ShapeSource<ZodInput<typeof SectorSchema>>;
