import type { input as ZodInput } from 'zod';

import type { GraphSchema, IRGraph } from '../../schemas';

import { GraphSchema as GraphIRSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Graph Source root 工厂输入 */
export type GraphCreateOptions = Omit<ZodInput<typeof GraphSchema>, 'namespace' | 'type'>;

/** 校验并创建最小 Graph Source root */
export const createGraph = (input: GraphCreateOptions): IRGraph =>
  GraphIRSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Graph,
    ...input,
  });
