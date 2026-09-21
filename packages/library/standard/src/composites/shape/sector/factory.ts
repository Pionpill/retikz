import type { ShapeProperties } from '../shared';
import type { IRSector } from './types';
/** 创建保留几何意图的 Sector Source */
export const createSector = (input: ShapeProperties<IRSector>): IRSector => ({
  ...input,
  namespace: 'standard',
  type: 'sector',
});
