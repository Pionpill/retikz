import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type { TableComposite } from './constants';
import type { CustomTableSchema, DetailTableSchema, ManualTableSchema, TableSchema } from './schema';

/** Table composite 类型 */
export type TableCompositeValue = ValueOf<typeof TableComposite>;

/** Table composite IR 根节点 */
export type IRTable = ZodInfer<typeof TableSchema>;

/** detail Table 的精确 composite IR 根节点 */
export type IRDetailTable = ZodInfer<typeof DetailTableSchema>;

/** manual Table 的精确 composite IR 根节点 */
export type IRManualTable = ZodInfer<typeof ManualTableSchema>;

/** custom Table 的精确 composite IR 根节点 */
export type IRCustomTable = ZodInfer<typeof CustomTableSchema>;
