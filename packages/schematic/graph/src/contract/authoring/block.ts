import type { input as ZodInput } from 'zod';

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

import {
  BlockHeaderSchema as BlockHeaderIRSchema,
  BlockRowSchema as BlockRowIRSchema,
  BlockSchema as BlockIRSchema,
  BlockSectionSchema as BlockSectionIRSchema,
} from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** 对 union 的每个成员分别移除作者不可写字段 */
type DistributiveOmit<T, TKeys extends PropertyKey> = T extends unknown ? Omit<T, TKeys> : never;

/** Block Source record 的作者输入 */
export type BlockCreateOptions = Omit<ZodInput<typeof BlockSchema>, 'namespace' | 'type'>;

/** Block Header Source record 的作者输入 */
export type BlockHeaderCreateOptions = Omit<ZodInput<typeof BlockHeaderSchema>, 'namespace' | 'type'>;

/** Block Section Source record 的作者输入 */
export type BlockSectionCreateOptions = Omit<ZodInput<typeof BlockSectionSchema>, 'namespace' | 'type'>;

/** Block Row Source record 的作者输入 */
export type BlockRowCreateOptions = DistributiveOmit<ZodInput<typeof BlockRowSchema>, 'namespace' | 'type'>;

/** 校验并创建 Block Source record */
export const createBlock = (input: BlockCreateOptions): IRBlock =>
  BlockIRSchema.parse({ namespace: GRAPH_NAMESPACE, type: GraphType.Block, ...input });

/** 校验并创建 Block Header Source record */
export const createBlockHeader = (input: BlockHeaderCreateOptions): IRBlockHeader =>
  BlockHeaderIRSchema.parse({ namespace: GRAPH_NAMESPACE, type: GraphType.BlockHeader, ...input });

/** 校验并创建 Block Section Source record */
export const createBlockSection = (input: BlockSectionCreateOptions): IRBlockSection =>
  BlockSectionIRSchema.parse({ namespace: GRAPH_NAMESPACE, type: GraphType.BlockSection, ...input });

/** 校验并创建 Block Row Source record */
export const createBlockRow = (input: BlockRowCreateOptions): IRBlockRow =>
  BlockRowIRSchema.parse({ namespace: GRAPH_NAMESPACE, type: GraphType.BlockRow, ...input });
