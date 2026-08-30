import type { infer as ZodInfer } from 'zod';

import type {
  BlockCellSchema,
  BlockHeaderSchema,
  BlockRowSchema,
  BlockSchema,
  BlockSectionSchema,
  BlockTextSchema,
} from './schema';

/** Block 结构文字 Source */
export type IRBlockText = ZodInfer<typeof BlockTextSchema>;

/** Block Header Source */
export type IRBlockHeader = ZodInfer<typeof BlockHeaderSchema>;

/** Block Cell Source */
export type IRBlockCell = ZodInfer<typeof BlockCellSchema>;

/** Block Row Source */
export type IRBlockRow = ZodInfer<typeof BlockRowSchema>;

/** Block Section Source */
export type IRBlockSection = ZodInfer<typeof BlockSectionSchema>;

/** Block semantic composite Source */
export type IRBlock = ZodInfer<typeof BlockSchema>;
