import type { GridInput, IRGrid } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { GridSchema } from './schema';

/** 校验并创建持久化的 Standard Grid composite */
export const createGrid = (input: GridInput): IRGrid =>
  GridSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'grid',
    ...input,
  });
