import type { ValueOf } from '@retikz/core';
import type { z } from 'zod';

import type { TableComposite } from './constants';
import type { TableSpecSchema } from './schema';

/** Table composite 类型 */
export type TableCompositeValue = ValueOf<typeof TableComposite>;

/** Table composite IR 根节点 */
export type IRTableSpec = z.infer<typeof TableSpecSchema>;
