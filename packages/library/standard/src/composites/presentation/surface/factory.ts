import type { IRSurface, SurfaceInput } from './types';

import { SurfaceSchema } from './schema';

/** 校验并创建 canonical Standard Surface composite */
export const createSurface = (input: SurfaceInput): IRSurface => SurfaceSchema.parse(input);
