import type { ExpandCompositeDefinition, IRPathBase } from '@retikz/core';

import { defineComposite } from '@retikz/core';

import type { IRConnector } from './types';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';
import { ConnectorSchema } from './schema';

/** 将一个 Connector 规范 IR 展开为同标识的 Core 描边 Path */
const expandConnector = (connector: IRConnector): IRPathBase => {
  const { namespace: _namespace, type: _type, role: _role, ...path } = connector;
  void _namespace;
  void _type;
  void _role;
  return { type: 'path', ...path };
};

/** Notation Connector 的轻量展开定义 */
export const ConnectorDefinition: ExpandCompositeDefinition<
  IRConnector,
  typeof NOTATION_NAMESPACE,
  typeof NotationElementType.Connector
> = defineComposite({
  namespace: NOTATION_NAMESPACE,
  type: NotationElementType.Connector,
  schema: ConnectorSchema,
  expand: expandConnector,
});
