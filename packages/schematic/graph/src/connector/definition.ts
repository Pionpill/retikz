import type { CompositeExpandResult, ExpandCompositeDefinition } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRGraphConnector } from './types';

import { GRAPH_NAMESPACE, GraphElementType } from '../shared';
import { GraphConnectorSchema } from './schema';

/** 将一个 GraphConnector 规范 IR 展开为同标识的 Core 描边 Path */
const expandGraphConnector = (graphConnector: IRGraphConnector): CompositeExpandResult => {
  const { namespace: _namespace, type: _type, role: _role, ...path } = graphConnector;
  void _namespace;
  void _type;
  void _role;
  return { children: [{ type: 'path', ...path }] };
};

/** GraphConnector 的轻量展开定义 */
export const GraphConnectorDefinition: ExpandCompositeDefinition<
  IRGraphConnector,
  typeof GRAPH_NAMESPACE,
  typeof GraphElementType.GraphConnector
> = defineComposite({
  namespace: GRAPH_NAMESPACE,
  type: GraphElementType.GraphConnector,
  schema: GraphConnectorSchema,
  expand: expandGraphConnector,
});
