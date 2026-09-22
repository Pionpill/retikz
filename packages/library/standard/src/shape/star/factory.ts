import type { ShapeProperties } from '../shared';
import type { IRStar } from './types';
/** 创建保留几何意图的 Star Source */
export const createStar = (input: ShapeProperties<IRStar>): IRStar => ({
  ...input,
  namespace: 'standard',
  type: 'star',
});
