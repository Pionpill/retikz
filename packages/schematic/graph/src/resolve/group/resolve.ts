import type { ResolvedGraphDefinitionOptions } from '../../providers';
import type { IRGroup } from '../../schemas';
import type { CanonicalGroup } from './types';

import { resolveGroupChildren } from '../graph';

/** 解析 Group 的 Graph-local context，同时保留 Group 自身呈现 Source */
export const resolveGroup = (source: IRGroup, options: ResolvedGraphDefinitionOptions): CanonicalGroup => ({
  source,
  children: resolveGroupChildren(source, options),
});
