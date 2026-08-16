import type { z } from 'zod';

import type { EntitySchema } from './schema';

/** Entity 的规范 IR */
export type IREntity = z.infer<typeof EntitySchema>;

/** Entity factory 的作者输入 */
export type EntityCreateOptions = Omit<z.input<typeof EntitySchema>, 'namespace' | 'type'>;

/** Entity 的语义节点类型 */
export type Entity = IREntity;
