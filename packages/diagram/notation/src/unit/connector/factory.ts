import { parseWay } from '@retikz/core';

import type { ConnectorInput, IRConnector } from './types';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';
import { ConnectorSchema } from './schema';

/** 校验并创建规范 Connector IR */
export const createConnector = (input: ConnectorInput): IRConnector => {
  const hasChildren = 'children' in input && input.children !== undefined;
  const hasWay = 'way' in input && input.way !== undefined;
  if (hasChildren === hasWay) {
    throw new Error('Connector requires exactly one of `children` or `way`.');
  }

  if ('way' in input && input.way !== undefined) {
    const { way, ...pathInput } = input;
    return ConnectorSchema.parse({
      namespace: NOTATION_NAMESPACE,
      type: NotationElementType.Connector,
      ...pathInput,
      children: parseWay(way),
    });
  }

  const { children, ...pathInput } = input;
  return ConnectorSchema.parse({
    namespace: NOTATION_NAMESPACE,
    type: NotationElementType.Connector,
    ...pathInput,
    children,
  });
};
