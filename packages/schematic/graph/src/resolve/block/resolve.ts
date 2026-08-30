import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRBlock } from '../../schemas';
import type { CanonicalBlock } from './types';

import { resolveBlockSource } from '../graph';

/** 解析 Block 固定 slots 的 Graph-local context，同时保留 Block 呈现 Source */
export const resolveBlock = (source: IRBlock, options: ResolvedGraphDefinitionOptions): CanonicalBlock => ({
  source: resolveBlockSource(source, options),
});
