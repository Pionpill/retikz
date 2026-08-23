import type { ValueOf } from '@retikz/foundation';

import type { EntityRole, GraphType, RelationKind, RelationRole } from './constants';

/** Graph 复合元素类型的取值 */
export type GraphTypeValue = ValueOf<typeof GraphType>;

/** Entity 内置角色词汇值 */
export type EntityRoleValue = ValueOf<typeof EntityRole>;

/** Relation 内置角色词汇值 */
export type RelationRoleValue = ValueOf<typeof RelationRole>;

/** Relation 内置 kind 词汇值 */
export type RelationKindValue = ValueOf<typeof RelationKind>;
