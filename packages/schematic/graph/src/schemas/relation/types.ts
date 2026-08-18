import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { RelationRole } from './constants';
import type { RelationSchema } from './schema';

/** Relation 角色词汇值 */
export type RelationRoleValue = ValueOf<typeof RelationRole>;

/** Relation 规范 IR */
export type IRRelation = z.infer<typeof RelationSchema>;
