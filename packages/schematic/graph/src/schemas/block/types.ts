import type { infer as ZodInfer } from 'zod';

import type { BlockHeaderSchema, BlockRowSchema, BlockSchema, BlockSectionSchema, BlockTextSchema } from './schema';

/** Block 结构文字 Source */
export type IRBlockText = ZodInfer<typeof BlockTextSchema>;

/** 块标题的持久化输入 */
export type IRBlockHeader = ZodInfer<typeof BlockHeaderSchema>;

/** 块行的持久化输入 */
export type IRBlockRow = ZodInfer<typeof BlockRowSchema>;

/** 块分节的持久化输入 */
export type IRBlockSection = ZodInfer<typeof BlockSectionSchema>;

/** 块语义组合节点的持久化输入 */
export type IRBlock = ZodInfer<typeof BlockSchema>;
