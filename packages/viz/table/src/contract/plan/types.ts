import type { z } from 'zod';

import type { DeepReadonly } from '../../shared';
import type { TableCellAppearanceTracePath, TableCellPlanSourceKind } from './constants';
import type { TableCellPlanSourceSchema } from './schema';

/** Cell plan winner 的当前来源合同 */
export type TableCellPlanSource = DeepReadonly<z.infer<typeof TableCellPlanSourceSchema>>;

/** Cell plan 来源判别值 */
export type TableCellPlanSourceKindValue =
  (typeof TableCellPlanSourceKind)[keyof typeof TableCellPlanSourceKind];

/** Cell appearance winner trace 的规范叶路径 */
export type TableCellAppearanceTracePathValue =
  (typeof TableCellAppearanceTracePath)[keyof typeof TableCellAppearanceTracePath];
