import type { IRSurface, SurfaceInput } from './types';

/** 创建稀疏 Standard Surface composite */
export const createSurface = (input: SurfaceInput): IRSurface => ({ ...input });
