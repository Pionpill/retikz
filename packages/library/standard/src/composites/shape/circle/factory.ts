import type { ShapeProperties } from '../shared';
import type { IRCircle } from './types';
/** 创建保留几何意图的 Circle Source */
export const createCircle = (input: ShapeProperties<IRCircle>): IRCircle => ({
  ...input,
  namespace: 'standard',
  type: 'circle',
});
