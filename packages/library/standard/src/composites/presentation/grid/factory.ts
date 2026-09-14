import { STANDARD_NAMESPACE } from '../../shared';
import type { GridInput, IRGrid } from './types';

/** 组装持久化的 Standard Grid composite */
export const createGrid = (input: GridInput): IRGrid => ({
  namespace: STANDARD_NAMESPACE,
  type: 'grid',
  ...input,
});
