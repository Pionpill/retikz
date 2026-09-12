import type { infer as ZodInfer } from 'zod';

import type { GraphSchema, IRGraph } from '../../schemas';

import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Graph Source root 工厂输入 */
export type GraphCreateOptions = Omit<ZodInfer<typeof GraphSchema>, 'namespace' | 'type'>;

/** 组装最小 Graph Source root */
export const createGraph = (input: GraphCreateOptions): IRGraph => ({
  namespace: GRAPH_NAMESPACE,
  type: GraphType.Graph,
  ...input,
});
