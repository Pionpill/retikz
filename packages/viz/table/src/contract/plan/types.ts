import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { DeepReadonly } from '../../shared';
import type { TableCellAppearanceTracePath, TableCellPlanSourceKind } from './constants';
import type { TableCellPlanSourceSchema } from './schema';

/** Cell plan winner 的当前来源合同 */
export type TableCellPlanSource = DeepReadonly<ZodInfer<typeof TableCellPlanSourceSchema>>;

/** Cell plan 来源判别值 */
export type TableCellPlanSourceKindValue = ValueOf<typeof TableCellPlanSourceKind>;

/** Cell appearance winner trace 的规范叶路径 */
export type TableCellAppearanceTracePathValue = ValueOf<typeof TableCellAppearanceTracePath>;
