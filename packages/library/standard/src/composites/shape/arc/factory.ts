import type { ShapeProperties } from '../shared';
import type { IRArc } from './types';
/** 创建保留几何意图的 Arc Source */
export const createArc = (input: ShapeProperties<IRArc>): IRArc => ({
  ...input,
  namespace: 'standard',
  type: 'arc',
});
