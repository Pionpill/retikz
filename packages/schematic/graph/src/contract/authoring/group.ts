import type { infer as ZodInfer } from 'zod';

import type { GroupSchema, IRGroup } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Group Source 工厂输入 */
export type GroupCreateOptions = Omit<ZodInfer<typeof GroupSchema>, 'namespace' | 'type'>;

/** 组装 Group Source composite */
export const createGroup = (input: GroupCreateOptions): IRGroup => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Group,
  ...input,
});
