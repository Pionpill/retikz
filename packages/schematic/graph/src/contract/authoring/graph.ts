import type { z } from 'zod';

import type { GraphSchema, IRGraph } from '../../schemas';

import { GraphSchema as GraphIRSchema } from '../../schemas';
import { GRAPH_NAMESPACE, GraphType } from '../../shared';

/** Graph presentation root 工厂输入 */
export type GraphCreateOptions = Omit<z.input<typeof GraphSchema>, 'namespace' | 'type'>;

/** 校验并创建规范 Graph presentation root IR */
export const createGraph = (input: GraphCreateOptions): IRGraph =>
  GraphIRSchema.parse({
    namespace: GRAPH_NAMESPACE,
    type: GraphType.Graph,
    ...input,
  });
