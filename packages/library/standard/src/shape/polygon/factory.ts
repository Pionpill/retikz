import type { ShapeProperties } from '../shared';
import type { IRPolygon } from './types';

/** 创建保留几何意图的 Polygon Source */
export const createPolygon = (input: ShapeProperties<IRPolygon>): IRPolygon => ({
  ...input,
  namespace: 'standard',
  type: 'polygon',
});
