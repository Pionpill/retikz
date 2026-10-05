import type { infer as ZodInfer } from 'zod';

import type { DeepReadonly } from '../../shared';
import type { TableCellPlanSourceSchema } from './schema';

/** Cell plan winner 的当前来源合同 */
export type TableCellPlanSource = DeepReadonly<ZodInfer<typeof TableCellPlanSourceSchema>>;
