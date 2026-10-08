import type { infer as ZodInfer, input as ZodInput } from 'zod';

import type { BlockHeaderSchema, BlockRowSchema, BlockSchema, BlockSectionSchema, BlockTextSchema } from './schema';

/** 保留 Row 的互斥分支，并恢复作者可省略的位置 */
type SparsePosition<T> = T extends unknown
  ? Omit<T, 'position'> & Pick<ZodInput<typeof BlockRowSchema>, 'position'>
  : never;

/** Block 结构文字 Source */
export type IRBlockText = ZodInfer<typeof BlockTextSchema>;

/** 块标题的持久化输入 */
export type IRBlockHeader = ZodInfer<typeof BlockHeaderSchema>;

/** 块行的持久化输入 */
export type IRBlockRow = SparsePosition<ZodInfer<typeof BlockRowSchema>>;

/** 块分节的持久化输入 */
export type IRBlockSection = Omit<ZodInfer<typeof BlockSectionSchema>, 'position'> &
  Pick<ZodInput<typeof BlockSectionSchema>, 'position'>;

/** 块语义组合节点的持久化输入 */
export type IRBlock = Omit<ZodInfer<typeof BlockSchema>, 'position'> & Pick<ZodInput<typeof BlockSchema>, 'position'>;
