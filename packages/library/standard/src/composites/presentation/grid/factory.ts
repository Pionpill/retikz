import type { GridInput, IRGrid } from './types';

import { STANDARD_NAMESPACE } from '../../shared';

/** 组装持久化的 Standard Grid composite */
export const createGrid = (input: GridInput): IRGrid => ({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  ...input,
});
