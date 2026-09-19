import type { ShapeProperties } from '../shared';
import type { IREllipse } from './types';
/** 创建保留几何意图的 Ellipse Source */
export const createEllipse = (input: ShapeProperties<IREllipse>): IREllipse => ({
  ...input,
  namespace: 'standard',
  type: 'ellipse',
});
