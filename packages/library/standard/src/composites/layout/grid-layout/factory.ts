import type { GridLayoutInput, IRGridLayout } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { GridLayoutSchema } from './schema';

/** 创建应用全部 schema 默认值的 canonical GridLayout IR */
export const createGridLayout = (input: GridLayoutInput): IRGridLayout =>
  GridLayoutSchema.parse({ namespace: STANDARD_NAMESPACE, type: 'gridLayout', ...input });
