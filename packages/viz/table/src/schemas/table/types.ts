import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { TableComposite } from './constants';
import type { CustomTableSpecSchema, DetailTableSpecSchema, ManualTableSpecSchema, TableSpecSchema } from './schema';

/** Table composite 类型 */
export type TableCompositeValue = ValueOf<typeof TableComposite>;

/** Table composite IR 根节点 */
export type IRTableSpec = z.infer<typeof TableSpecSchema>;

/** detail Table 的精确 composite IR 根节点 */
export type IRDetailTableSpec = z.infer<typeof DetailTableSpecSchema>;

/** manual Table 的精确 composite IR 根节点 */
export type IRManualTableSpec = z.infer<typeof ManualTableSpecSchema>;

/** custom Table 的精确 composite IR 根节点 */
export type IRCustomTableSpec = z.infer<typeof CustomTableSpecSchema>;
