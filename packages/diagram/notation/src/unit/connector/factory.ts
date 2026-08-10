import { parseWay } from '@retikz/core';

import type { ConnectorInput, IRConnector } from './types';

import { NOTATION_NAMESPACE, NotationElementType } from '../../shared';
import { ConnectorSchema } from './schema';

/** 校验并创建规范 Connector IR */
export const createConnector = (input: ConnectorInput): IRConnector => {
  const { children, way, ...pathInput } = input;
  const hasChildren = children !== undefined;
  const hasWay = way !== undefined;
  if (hasChildren === hasWay) {
    throw new Error('Connector requires exactly one of `children` or `way`.');
  }

  if (way !== undefined) {
    return ConnectorSchema.parse({
      namespace: NOTATION_NAMESPACE,
      type: NotationElementType.Connector,
      ...pathInput,
      children: parseWay(way),
    });
  }

  return ConnectorSchema.parse({
    namespace: NOTATION_NAMESPACE,
    type: NotationElementType.Connector,
    ...pathInput,
    children,
  });
};
