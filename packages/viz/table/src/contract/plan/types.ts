import type { z } from 'zod';

import type { DeepReadonly } from '../../shared';
import type { TableCellAppearanceTracePath, TableCellPlanSourceKind, TableThemeTokenSourceKind } from './constants';
import type { TableCellPlanSourceSchema } from './schema';

/** Cell plan winner 的当前来源合同 */
export type TableCellPlanSource = DeepReadonly<z.infer<typeof TableCellPlanSourceSchema>>;

/** Cell plan 来源判别值 */
export type TableCellPlanSourceKindValue = (typeof TableCellPlanSourceKind)[keyof typeof TableCellPlanSourceKind];

/** Table theme token 的最终来源值 */
export type TableThemeTokenSourceKindValue = (typeof TableThemeTokenSourceKind)[keyof typeof TableThemeTokenSourceKind];

/** Cell appearance winner trace 的规范叶路径 */
export type TableCellAppearanceTracePathValue =
  (typeof TableCellAppearanceTracePath)[keyof typeof TableCellAppearanceTracePath];
