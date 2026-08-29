import type { input as ZodInput } from 'zod';

import type { GroupSchema, IRGroup } from '../../schemas';

import { GroupSchema as GroupIRSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Group Source 工厂输入 */
export type GroupCreateOptions = Omit<ZodInput<typeof GroupSchema>, 'namespace' | 'type'>;

/** 校验并创建 Group Source composite */
export const createGroup = (input: GroupCreateOptions): IRGroup =>
  GroupIRSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Group,
    ...input,
  });
