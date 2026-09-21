import type { ShapeProperties } from '../shared';
import type { IRRectangle } from './types';
/** 创建保留几何意图的 Rectangle Source */
export const createRectangle = (input: ShapeProperties<IRRectangle>): IRRectangle => ({
  ...input,
  namespace: 'standard',
  type: 'rectangle',
});
