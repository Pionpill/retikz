import type { WayDSL } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { z } from 'zod';

import type { RelationRole } from './constants';
import type { RelationSchema } from './schema';

/** Relation 角色词汇值 */
export type RelationRoleValue = ValueOf<typeof RelationRole>;

/** Relation 规范 IR */
export type IRRelation = z.infer<typeof RelationSchema>;

type RelationCreateOptionsBase = Omit<z.input<typeof RelationSchema>, 'namespace' | 'type' | 'children'>;

/** 使用规范 Core Step 编写 Relation 的作者输入 */
export type RelationChildrenCreateOptions = RelationCreateOptionsBase & {
  children: z.input<typeof RelationSchema>['children'];
  way?: never;
};

/** 使用 Core Draw way 语法编写 Relation 的作者输入 */
export type RelationWayCreateOptions = RelationCreateOptionsBase & {
  children?: never;
  way: WayDSL;
};

/** Relation 工厂输入，两套作者语法必须且只能选择一套 */
export type RelationCreateOptions = RelationChildrenCreateOptions | RelationWayCreateOptions;
