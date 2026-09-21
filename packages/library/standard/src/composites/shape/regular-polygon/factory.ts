import type { ShapeProperties } from '../shared';
import type { IRRegularPolygon } from './types';
/** 创建保留几何意图的 RegularPolygon Source */
export const createRegularPolygon = (input: ShapeProperties<IRRegularPolygon>): IRRegularPolygon => ({
  ...input,
  namespace: 'standard',
  type: 'regularPolygon',
});
