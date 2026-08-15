import type { z } from 'zod';

import type { GraphNodeSchema } from './schema';

/** GraphNode 的规范 IR */
export type IRGraphNode = z.infer<typeof GraphNodeSchema>;

/** GraphNode factory 的作者输入 */
export type GraphNodeCreateOptions = Omit<z.input<typeof GraphNodeSchema>, 'namespace' | 'type'>;

/** GraphNode 的语义节点类型 */
export type GraphSemanticNode = IRGraphNode;
