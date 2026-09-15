import type { RefinementCtx } from 'zod';

/** 保持 Block 及其封装实体的显式尺寸约束一致 */
export const refineBlockSize = (block: { width?: number; minWidth?: number }, context: RefinementCtx): void => {
  if (block.width !== undefined && block.minWidth !== undefined && block.minWidth > block.width) {
    context.addIssue({ code: 'custom', path: ['minWidth'], message: 'minWidth must be less than or equal to width.' });
  }
};
