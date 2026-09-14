import type { infer as ZodInfer } from 'zod';

import type {
  BlockHeaderSchema,
  BlockRowSchema,
  BlockSchema,
  BlockSectionSchema,
  IRBlock,
  IRBlockHeader,
  IRBlockRow,
  IRBlockSection,
} from '../../schemas';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** 对 union 的每个成员分别移除作者不可写字段 */
type DistributiveOmit<T, TKeys extends PropertyKey> = T extends unknown ? Omit<T, TKeys> : never;

/** Block Source record 的作者输入 */
export type BlockCreateOptions = Omit<ZodInfer<typeof BlockSchema>, 'namespace' | 'type'>;

/** Block Header Source record 的作者输入 */
export type BlockHeaderCreateOptions = Omit<ZodInfer<typeof BlockHeaderSchema>, 'namespace' | 'type'>;

/** Block Section Source record 的作者输入 */
export type BlockSectionCreateOptions = Omit<ZodInfer<typeof BlockSectionSchema>, 'namespace' | 'type'>;

/** Block Row Source record 的作者输入 */
export type BlockRowCreateOptions = DistributiveOmit<ZodInfer<typeof BlockRowSchema>, 'namespace' | 'type'>;

/** 组装 Block Source record */
export const createBlock = (input: BlockCreateOptions): IRBlock => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Block,
  ...input,
});

/** 组装 Block Header Source record */
export const createBlockHeader = (input: BlockHeaderCreateOptions): IRBlockHeader => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockHeader,
  ...input,
});

/** 组装 Block Section Source record */
export const createBlockSection = (input: BlockSectionCreateOptions): IRBlockSection => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockSection,
  ...input,
});

/** 组装 Block Row Source record */
export const createBlockRow = (input: BlockRowCreateOptions): IRBlockRow => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.BlockRow,
  ...input,
});
