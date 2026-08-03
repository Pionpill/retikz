import type { GridInput, IRGrid } from './types';

import { GridSchema } from './schema';

/** 校验并创建持久化的 Standard Grid composite */
export const createGrid = (input: GridInput): IRGrid =>
  GridSchema.parse({
    namespace: 'standard',
    type: 'grid',
    ...input,
  });
