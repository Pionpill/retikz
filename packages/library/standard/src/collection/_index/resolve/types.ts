import type { output } from 'zod';

import type { CollectionIndexOptionsSchema } from '../schema';

/** 已补全编号及位置默认值的索引，false 表示关闭 */
export type CanonicalCollectionIndex = false | output<typeof CollectionIndexOptionsSchema>;
