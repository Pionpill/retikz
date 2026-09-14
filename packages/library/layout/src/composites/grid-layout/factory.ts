import { LAYOUT_NAMESPACE } from '../../shared';
import type { GridLayoutInput, IRGridLayout } from './types';

/** 创建应用全部 schema 默认值的 canonical GridLayout IR */
export const createGridLayout = (input: GridLayoutInput): IRGridLayout => ({
  namespace: LAYOUT_NAMESPACE,
  type: 'gridLayout',
  ...input,
});
